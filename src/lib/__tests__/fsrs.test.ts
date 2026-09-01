// src/lib/__tests__/fsrs.test.ts
import { describe, it, expect } from 'vitest'
import {
  initCard,
  reviewCard,
  isDue,
  intervalDays,
  type Rating,
} from '../fsrs'

const DAY = 86_400_000
const MIN = 60_000
const T0 = 1_700_000_000_000

describe('fsrs 调度器', () => {
  it('initCard 生成全新卡', () => {
    expect(initCard('act', T0)).toEqual({
      id: 'act',
      state: 'New',
      stability: 0,
      difficulty: 0,
      due: T0,
      lastReview: null,
      reps: 0,
      lapses: 0,
    })
    expect(intervalDays(initCard('act', T0))).toBe(0)
  })

  it('新卡首次 good 给出 1-5 天量级的区间', () => {
    const card = reviewCard(initCard('act', T0), 3, T0)
    expect(card.state).toBe('Review')
    expect(card.reps).toBe(1)
    const interval = intervalDays(card)
    expect(interval).toBeGreaterThanOrEqual(1)
    expect(interval).toBeLessThanOrEqual(5)
    expect(card.due).toBeGreaterThan(T0 + DAY)
    expect(card.due).toBeLessThan(T0 + 6 * DAY)
  })

  it('连续 good 区间单调增长', () => {
    let card = reviewCard(initCard('act', T0), 3, T0)
    const intervals = [intervalDays(card)]
    let now = card.due
    for (let i = 0; i < 4; i++) {
      card = reviewCard(card, 3, now)
      intervals.push(intervalDays(card))
      now = card.due
    }
    for (let i = 1; i < intervals.length; i++) {
      expect(intervals[i]).toBeGreaterThan(intervals[i - 1])
    }
  })

  it('hard 的区间增长小于 good，good 小于 easy', () => {
    const base = reviewCard(initCard('act', T0), 3, T0)
    const atDue = base.due
    const hard = reviewCard(base, 2, atDue)
    const good = reviewCard(base, 3, atDue)
    const easy = reviewCard(base, 4, atDue)
    expect(intervalDays(hard)).toBeLessThan(intervalDays(good))
    expect(intervalDays(good)).toBeLessThan(intervalDays(easy))
  })

  it('again 进入 Relearning，due 为 now+10 分钟，稳定度不高于复习前且 lapses+1', () => {
    const base = reviewCard(initCard('act', T0), 3, T0)
    const again = reviewCard(base, 1, base.due)
    expect(again.state).toBe('Relearning')
    expect(again.due).toBe(base.due + 10 * MIN)
    expect(again.stability).toBeLessThanOrEqual(base.stability)
    expect(again.stability).toBeGreaterThan(0)
    expect(again.lapses).toBe(base.lapses + 1)
    expect(again.reps).toBe(base.reps + 1)
  })

  it('新卡 again 直接进入 Relearning 并计一次 lapse', () => {
    const again = reviewCard(initCard('act', T0), 1, T0)
    expect(again.state).toBe('Relearning')
    expect(again.due).toBe(T0 + 10 * MIN)
    expect(again.lapses).toBe(1)
    expect(again.stability).toBeGreaterThan(0)
  })

  it('good 复习后稳定度不降低（提前复习也不缩水）', () => {
    const base = reviewCard(initCard('act', T0), 3, T0)
    const early = reviewCard(base, 3, T0 + 10 * MIN)
    const late = reviewCard(base, 3, base.due + 3 * DAY)
    expect(early.stability).toBeGreaterThanOrEqual(base.stability)
    expect(late.stability).toBeGreaterThan(base.stability)
  })

  it('isDue 到期判定', () => {
    const card = reviewCard(initCard('act', T0), 3, T0)
    expect(isDue(card, card.due - 1)).toBe(false)
    expect(isDue(card, card.due)).toBe(true)
    expect(isDue(card, card.due + DAY)).toBe(true)
    // 新卡创建即可学
    expect(isDue(initCard('act', T0), T0)).toBe(true)
  })

  it('同一输入两次 review 结果 deep-equal（确定性）', () => {
    const base = reviewCard(initCard('act', T0), 3, T0)
    expect(reviewCard(base, 3, base.due)).toEqual(reviewCard(base, 3, base.due))
    expect(reviewCard(base, 1, base.due)).toEqual(reviewCard(base, 1, base.due))
  })

  it('完整学习链对相同评分序列完全一致', () => {
    const ratings: Rating[] = [3, 3, 1, 3, 2, 4]
    const run = () => {
      let card = initCard('act', T0)
      let now = T0
      for (const r of ratings) {
        card = reviewCard(card, r, now)
        now = card.due
      }
      return card
    }
    expect(run()).toEqual(run())
  })
})
