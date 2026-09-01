// src/lib/fsrs.ts
/**
 * 简化版 FSRS-4.5 调度器（纯函数、零依赖，未引入 ts-fsrs）。
 *
 * 与论文的取舍：
 * - 保留 FSRS-4.5 默认 19 权重、回忆率曲线 R(t,S) = (1 + 19/81 · t/S)^-0.5、
 *   初难度 D0、难度均值回归、成功/遗忘两条稳定度更新公式；
 * - 学习/重学阶段的短步长统一简化为「again → 10 分钟后再来」一步，
 *   不再区分 Learning 秒级/分钟级多步队列；
 * - 每次 again 都计入 lapses（论文只统计 Review 态遗忘），保证「again → 稳定度不升」
 *   对所有状态成立（新卡首评 again 从 0 升到初值 w0 属于初始化，不算遗忘回退）；
 * - 全部计算只依赖入参，同输入同输出。
 */

/** 评分：1 忘了 / 2 困难 / 3 良好 / 4 轻松 */
export type Rating = 1 | 2 | 3 | 4

export type CardState = 'New' | 'Learning' | 'Review' | 'Relearning'

export interface FsrsCard {
  id: string
  state: CardState
  /** 稳定度（天）：回忆率降到 90% 所需的间隔天数 */
  stability: number
  /** 难度，1（最易）– 10（最难） */
  difficulty: number
  /** 到期时间（ms 时间戳） */
  due: number
  lastReview: number | null
  reps: number
  lapses: number
}

/** FSRS-4.5 默认权重（w[0..18]，公开默认参数） */
const W = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474,
  0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755, 0.5266,
  0.8514,
] as const

/** 目标回忆率 */
export const REQUEST_RETENTION = 0.9

/** 回忆率曲线参数：R(t,S) = (1 + FACTOR · t / S)^DECAY */
const DECAY = -0.5
const FACTOR = 19 / 81

const DAY_MS = 86_400_000
const AGAIN_DURATION_MS = 10 * 60_000
/** 区间上限（天），FSRS 默认最大间隔 */
const MAX_INTERVAL_DAYS = 36_500

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

/** 稳定度（天）→ 回忆率为 REQUEST_RETENTION 时的间隔天数 */
function stabilityToInterval(stability: number): number {
  // 令 R = REQUEST_RETENTION 解出 t：t = S / FACTOR · (R^(1/DECAY) - 1)
  const t = (stability / FACTOR) * (Math.pow(REQUEST_RETENTION, 1 / DECAY) - 1)
  return clamp(t, 0, MAX_INTERVAL_DAYS)
}

/** 首评难度 D0(G)，权重下 good/easy 的初难度会被压到下限 1 */
function initialDifficulty(rating: Rating): number {
  return clamp(W[4] - Math.exp(W[5] * (rating - 1)) + 1, 1, 10)
}

export function initCard(id: string, now: number): FsrsCard {
  return {
    id,
    state: 'New',
    stability: 0,
    difficulty: 0,
    due: now,
    lastReview: null,
    reps: 0,
    lapses: 0,
  }
}

/** 是否到期（新卡 due 即创建时刻，视为立刻可学） */
export function isDue(card: FsrsCard, now: number): boolean {
  return now >= card.due
}

/** 当前稳定度对应的展示区间（天）；新卡为 0 */
export function intervalDays(card: FsrsCard): number {
  if (card.state === 'New' || card.stability <= 0) return 0
  return Math.round(stabilityToInterval(card.stability))
}

export function reviewCard(card: FsrsCard, rating: Rating, now: number): FsrsCard {
  const reps = card.reps + 1

  // ── 首评（新卡，或异常零稳定度的存量卡）──
  if (card.state === 'New' || card.stability <= 0) {
    const stability = W[rating - 1]
    const difficulty = initialDifficulty(rating)
    if (rating === 1) {
      return {
        ...card,
        state: 'Relearning',
        stability,
        difficulty,
        due: now + AGAIN_DURATION_MS,
        lastReview: now,
        reps,
        lapses: card.lapses + 1,
      }
    }
    return {
      ...card,
      state: 'Review',
      stability,
      difficulty,
      due: now + stabilityToInterval(stability) * DAY_MS,
      lastReview: now,
      reps,
      lapses: card.lapses,
    }
  }

  // ── 复习：先按经过时间算当前可提取性，再更新难度 / 稳定度 ──
  const elapsedDays = Math.max(0, (now - (card.lastReview ?? now)) / DAY_MS)
  const retrievability = Math.pow(
    1 + FACTOR * (elapsedDays / card.stability),
    DECAY
  )

  // 难度：按评分线性偏移后向最易初难度均值回归（FSRS-4.5）
  const drifted = card.difficulty - W[6] * (rating - 3)
  const difficulty = clamp(
    W[7] * initialDifficulty(4) + (1 - W[7]) * drifted,
    1,
    10
  )

  if (rating === 1) {
    // 遗忘：走遗忘曲线公式，且只降不升
    const failed =
      W[11] *
      Math.pow(difficulty, -W[12]) *
      (Math.pow(card.stability + 1, W[13]) - 1) *
      Math.exp(W[14] * (1 - retrievability))
    const stability = Math.min(failed, card.stability)
    return {
      ...card,
      state: 'Relearning',
      stability,
      difficulty,
      due: now + AGAIN_DURATION_MS,
      lastReview: now,
      reps,
      lapses: card.lapses + 1,
    }
  }

  // 成功：稳定度乘性增长，困难打折 / 轻松加成
  const hardPenalty = rating === 2 ? W[15] : 1
  const easyBonus = rating === 4 ? W[16] : 1
  const growth =
    Math.exp(W[8]) *
    (11 - difficulty) *
    Math.pow(card.stability, -W[9]) *
    (Math.exp(W[10] * (1 - retrievability)) - 1) *
    hardPenalty *
    easyBonus
  const stability = card.stability * (1 + growth)

  return {
    ...card,
    state: 'Review',
    stability,
    difficulty,
    due: now + stabilityToInterval(stability) * DAY_MS,
    lastReview: now,
    reps,
    lapses: card.lapses,
  }
}
