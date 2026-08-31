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
      quizResults: {},
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
    const count = getViewedCountForRoot([0, 1, 2], [
      { word: 'act' },
      { word: 'action' },
      { word: 'active' },
    ])
    expect(count).toBe(2)
  })

  it('marks quiz result per word', () => {
    const { markQuizResult } = useProgressStore.getState()
    expect(useProgressStore.getState().quizResults['act']).toBeUndefined()
    markQuizResult('act', 'known')
    markQuizResult('inspect', 'again')
    expect(useProgressStore.getState().quizResults).toEqual({
      act: 'known',
      inspect: 'again',
    })
  })

  it('overwrites quiz result with the latest judgement', () => {
    const { markQuizResult } = useProgressStore.getState()
    markQuizResult('act', 'again')
    markQuizResult('act', 'known')
    const results = useProgressStore.getState().quizResults
    expect(results['act']).toBe('known')
    expect(Object.keys(results)).toHaveLength(1)
  })
})
