// src/store/__tests__/memory-store.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useMemoryStore, NEW_PER_DAY } from '../memory-store'
import type { FsrsCard } from '@/lib/fsrs'
import type { EnhancedRootNode } from '@/lib/mindmap-types'

const DAY = 86_400_000
const NOW = 1_700_000_000_000

/** 与 store 内部 todayOf 同逻辑，用于构造「今天」的持久化值 */
function todayOf(now: number): string {
  const d = new Date(now)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

const roots: EnhancedRootNode[] = [
  { primaryText: 'act', aliases: ['ag'], meaning: '做', layer: 'core', wordIndices: [], wordCount: 10 },
  { primaryText: 'port', aliases: [], meaning: '运', layer: 'core', wordIndices: [], wordCount: 8 },
  { primaryText: 'vert', aliases: ['vers'], meaning: '转', layer: 'middle', wordIndices: [], wordCount: 5 },
]

describe('memory-store', () => {
  beforeEach(() => {
    useMemoryStore.setState({ cards: {}, dailyNewCount: 0, dailyReviewDate: '' })
  })

  it('rate 新卡 good：建卡进入 Review 并计入当日新词', () => {
    useMemoryStore.getState().rate('act', 3, NOW)
    const card = useMemoryStore.getState().cards['act']
    expect(card).toBeDefined()
    expect(card.state).toBe('Review')
    expect(card.reps).toBe(1)
    expect(card.lapses).toBe(0)
    expect(useMemoryStore.getState().dailyNewCount).toBe(1)
    expect(useMemoryStore.getState().dailyReviewDate).toBe(todayOf(NOW))
  })

  it('rate 新卡 again：进入 Relearning 且 lapses+1', () => {
    useMemoryStore.getState().rate('act', 1, NOW)
    const card = useMemoryStore.getState().cards['act']
    expect(card.state).toBe('Relearning')
    expect(card.lapses).toBe(1)
  })

  it('rate 已有卡不计入当日新词', () => {
    useMemoryStore.getState().rate('act', 3, NOW)
    useMemoryStore.getState().rate('act', 3, NOW + 1000)
    expect(useMemoryStore.getState().dailyNewCount).toBe(1)
    expect(useMemoryStore.getState().cards['act'].reps).toBe(2)
  })

  it('rate 跨天自动清零当日新词计数', () => {
    useMemoryStore.setState({ dailyReviewDate: '2020-01-01', dailyNewCount: NEW_PER_DAY })
    useMemoryStore.getState().rate('act', 3, NOW)
    expect(useMemoryStore.getState().dailyNewCount).toBe(1)
  })

  it('sessionQueue 返回按 due 升序的到期卡', () => {
    const cards: Record<string, FsrsCard> = {
      act: { id: 'act', state: 'Review', stability: 3.7, difficulty: 1, due: NOW - 500, lastReview: NOW - DAY, reps: 1, lapses: 0 },
      port: { id: 'port', state: 'Review', stability: 2.1, difficulty: 2, due: NOW - 1000, lastReview: NOW - DAY, reps: 1, lapses: 0 },
      vert: { id: 'vert', state: 'Review', stability: 5, difficulty: 3, due: NOW, lastReview: NOW - DAY, reps: 1, lapses: 0 },
    }
    useMemoryStore.setState({ cards })
    const { due, fresh } = useMemoryStore.getState().sessionQueue({ roots }, NOW)
    expect(due.map(c => c.id)).toEqual(['port', 'act', 'vert'])
    // 已有卡的词根不再进新词队列
    expect(fresh).toEqual([])
  })

  it('sessionQueue 排除未到期卡，新词按数据顺序受限产出', () => {
    const cards: Record<string, FsrsCard> = {
      act: { id: 'act', state: 'Review', stability: 3.7, difficulty: 1, due: NOW + DAY, lastReview: NOW - DAY, reps: 1, lapses: 0 },
    }
    useMemoryStore.setState({ cards })
    const { due, fresh } = useMemoryStore.getState().sessionQueue({ roots }, NOW)
    expect(due).toEqual([])
    expect(fresh.map(r => r.primaryText)).toEqual(['port', 'vert'])
  })

  it('sessionQueue 新词受每日上限约束', () => {
    expect(NEW_PER_DAY).toBe(10)
    useMemoryStore.setState({ dailyNewCount: NEW_PER_DAY - 1, dailyReviewDate: todayOf(NOW) })
    const { fresh } = useMemoryStore.getState().sessionQueue({ roots }, NOW)
    expect(fresh).toHaveLength(1)
  })

  it('sessionQueue 新词额度用尽后不再产出', () => {
    useMemoryStore.setState({ dailyNewCount: NEW_PER_DAY, dailyReviewDate: todayOf(NOW) })
    const { fresh } = useMemoryStore.getState().sessionQueue({ roots }, NOW)
    expect(fresh).toEqual([])
  })

  it('sessionQueue 跨天重置后新词额度恢复', () => {
    useMemoryStore.setState({ dailyNewCount: NEW_PER_DAY, dailyReviewDate: '2020-01-01' })
    const { fresh } = useMemoryStore.getState().sessionQueue({ roots }, NOW)
    expect(fresh).toHaveLength(3)
    expect(useMemoryStore.getState().dailyNewCount).toBe(0)
  })
})
