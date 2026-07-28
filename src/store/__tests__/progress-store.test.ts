// src/store/__tests__/progress-store.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useProgressStore } from '../progress-store'

describe('progress-store', () => {
  beforeEach(() => {
    useProgressStore.setState({
      viewedWords: [],
      viewedWordSet: {},
      completedRoots: [],
      currentRoot: null,
    })
  })

  it('marks word as viewed (idempotent)', () => {
    const { markWordViewed, isWordViewed } = useProgressStore.getState()
    expect(isWordViewed('act')).toBe(false)
    markWordViewed('act')
    expect(isWordViewed('act')).toBe(true)
    markWordViewed('act')
    expect(useProgressStore.getState().viewedWords).toHaveLength(1)
  })

  it('marks root as completed (idempotent)', () => {
    const { markRootCompleted, isRootCompleted } = useProgressStore.getState()
    expect(isRootCompleted('act')).toBe(false)
    markRootCompleted('act')
    expect(isRootCompleted('act')).toBe(true)
    markRootCompleted('act')
    expect(useProgressStore.getState().completedRoots).toHaveLength(1)
  })

  it('sets current root', () => {
    const { setCurrentRoot } = useProgressStore.getState()
    setCurrentRoot('port')
    expect(useProgressStore.getState().currentRoot).toBe('port')
  })

  it('counts viewed words for a root', () => {
    const { markWordViewed, getViewedCountForRoot } = useProgressStore.getState()
    markWordViewed('act')
    markWordViewed('action')
    const count = getViewedCountForRoot('act', [0, 1, 2], [
      { word: 'act' },
      { word: 'action' },
      { word: 'active' },
    ])
    expect(count).toBe(2)
  })
})
