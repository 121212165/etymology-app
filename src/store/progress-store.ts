// src/store/progress-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** 自测判定结果：known = 会了，again = 再看 */
export type QuizResult = 'known' | 'again'

interface ProgressState {
  viewedWords: string[]
  viewedWordSet: Record<string, true>
  completedRoots: string[]
  currentRoot: string | null
  /** 自测判定记录，按单词最后一次判定为准 */
  quizResults: Record<string, QuizResult>

  markWordViewed: (word: string) => void
  markRootCompleted: (rootText: string) => void
  setCurrentRoot: (root: string | null) => void
  markQuizResult: (word: string, result: QuizResult) => void
  isWordViewed: (word: string) => boolean
  isRootCompleted: (rootText: string) => boolean
  getViewedCountForRoot: (allWordIndices: number[], vocab: { word: string }[]) => number
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      viewedWords: [],
      viewedWordSet: {},
      completedRoots: [],
      currentRoot: null,
      quizResults: {},

      markWordViewed: (word) => {
        const state = get()
        if (state.viewedWordSet[word]) return
        set({
          viewedWords: [...state.viewedWords, word],
          viewedWordSet: { ...state.viewedWordSet, [word]: true },
        })
      },

      markRootCompleted: (rootText) => {
        const state = get()
        if (state.completedRoots.includes(rootText)) return
        set({ completedRoots: [...state.completedRoots, rootText] })
      },

      setCurrentRoot: (root) => set({ currentRoot: root }),

      markQuizResult: (word, result) => {
        set(state => ({ quizResults: { ...state.quizResults, [word]: result } }))
      },

      isWordViewed: (word) => !!get().viewedWordSet[word],

      isRootCompleted: (rootText) => get().completedRoots.includes(rootText),

      getViewedCountForRoot: (allWordIndices, vocab) => {
        const state = get()
        return allWordIndices.filter(idx => {
          const word = vocab[idx]?.word
          return word && state.viewedWordSet[word]
        }).length
      },
    }),
    {
      name: 'linxu-progress',
      // 只持久化数组/普通对象形式，viewedWordSet 在 rehydrate 时从数组重建，避免冗余存储
      partialize: (state) => ({
        viewedWords: state.viewedWords,
        completedRoots: state.completedRoots,
        currentRoot: state.currentRoot,
        quizResults: state.quizResults,
      }),
      merge: (persisted, current) => {
        const p = (persisted as Partial<ProgressState>) || {}
        const viewedWords = p.viewedWords ?? []
        // 从持久化的数组重建 Set 视图，保证 isWordViewed / markWordViewed 的 O(1) 查询
        const viewedWordSet: Record<string, true> = {}
        for (const w of viewedWords) viewedWordSet[w] = true
        return {
          ...current,
          ...p,
          viewedWords,
          viewedWordSet,
          quizResults: p.quizResults ?? {},
        }
      },
    }
  )
)
