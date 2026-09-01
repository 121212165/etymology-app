// src/store/memory-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { initCard, reviewCard, isDue, type FsrsCard, type Rating } from '@/lib/fsrs'
import type { EnhancedRootNode, MindMapData } from '@/lib/mindmap-types'

/** 每日新词上限 */
export const NEW_PER_DAY = 10

/** 只持久化纯数据，不含 actions */
interface MemoryPersist {
  cards: Record<string, FsrsCard>
  dailyNewCount: number
  /** 当日已学新词数对应的日期（本地时区 YYYY-MM-DD），跨天自动清零 */
  dailyReviewDate: string
}

interface MemoryState extends MemoryPersist {
  /** 对某个词根的记忆卡打分（无卡则先建新卡），key = 词根 primaryText */
  rate: (rootText: string, rating: Rating, now: number) => void
  /**
   * 组当日队列：due 为全部到期卡（按 due 升序）；
   * fresh 为尚无记忆卡的新词根，受每日新词上限（扣除当日已学）约束
   */
  sessionQueue: (
    data: Pick<MindMapData, 'roots'>,
    now: number
  ) => { due: FsrsCard[]; fresh: EnhancedRootNode[] }
}

/** 本地时区日期串，跨天判定用（与持久化值同格式） */
function todayOf(now: number): string {
  const d = new Date(now)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
      cards: {},
      dailyNewCount: 0,
      dailyReviewDate: '',

      rate: (rootText, rating, now) => {
        const state = get()
        const today = todayOf(now)
        const isNew = !state.cards[rootText]
        const card = reviewCard(
          state.cards[rootText] ?? initCard(rootText, now),
          rating,
          now
        )
        // 跨天先清零当日计数，再累计本次（仅新卡计入）
        const dailyNewCount =
          (state.dailyReviewDate === today ? state.dailyNewCount : 0) +
          (isNew ? 1 : 0)
        set({
          cards: { ...state.cards, [rootText]: card },
          dailyReviewDate: today,
          dailyNewCount,
        })
      },

      sessionQueue: (data, now) => {
        const state = get()
        const today = todayOf(now)
        const rolled = state.dailyReviewDate !== today
        const newCount = rolled ? 0 : state.dailyNewCount
        if (rolled) set({ dailyReviewDate: today, dailyNewCount: 0 })

        const cards = rolled ? get().cards : state.cards
        const due: FsrsCard[] = []
        for (const card of Object.values(cards)) {
          // New 态卡不应入库，防御性跳过（新词走 fresh 通道）
          if (card.state !== 'New' && isDue(card, now)) due.push(card)
        }
        due.sort((a, b) => a.due - b.due)

        const fresh: EnhancedRootNode[] = []
        const remaining = NEW_PER_DAY - newCount
        if (remaining > 0) {
          for (const root of data.roots) {
            if (!cards[root.primaryText]) {
              fresh.push(root)
              if (fresh.length >= remaining) break
            }
          }
        }
        return { due, fresh }
      },
    }),
    {
      name: 'linxu-memory',
      partialize: (state) => ({
        cards: state.cards,
        dailyNewCount: state.dailyNewCount,
        dailyReviewDate: state.dailyReviewDate,
      }),
      merge: (persisted, current) => {
        const p = (persisted as Partial<MemoryPersist> | null) ?? {}
        // 只恢复结构完整的卡，损坏 / 旧版本数据直接丢弃
        const cards: Record<string, FsrsCard> = {}
        for (const [key, value] of Object.entries(p.cards ?? {})) {
          if (
            value &&
            typeof value.id === 'string' &&
            typeof value.stability === 'number' &&
            typeof value.difficulty === 'number' &&
            typeof value.due === 'number' &&
            typeof value.reps === 'number' &&
            typeof value.lapses === 'number'
          ) {
            cards[key] = value
          }
        }
        return {
          ...current,
          cards,
          dailyNewCount:
            typeof p.dailyNewCount === 'number' && p.dailyNewCount >= 0
              ? p.dailyNewCount
              : 0,
          dailyReviewDate:
            typeof p.dailyReviewDate === 'string' ? p.dailyReviewDate : '',
        }
      },
    }
  )
)
