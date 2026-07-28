// src/store/progress-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ProgressState {
  viewedWords: string[]
  viewedWordSet: Record<string, true>
  completedRoots: string[]
  currentRoot: string | null

  markWordViewed: (word: string) => void
  markRootCompleted: (rootText: string) => void
  setCurrentRoot: (root: string | null) => void
  isWordViewed: (word: string) => boolean
  isRootCompleted: (rootText: string) => boolean
  getViewedCountForRoot: (rootText: string, allWordIndices: number[], vocab: { word: string }[]) => number
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      viewedWords: [],
      viewedWordSet: {},
      completedRoots: [],
      currentRoot: null,

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

      isWordViewed: (word) => !!get().viewedWordSet[word],

      isRootCompleted: (rootText) => get().completedRoots.includes(rootText),

      getViewedCountForRoot: (rootText, allWordIndices, vocab) => {
        const state = get()
        return allWordIndices.filter(idx => {
          const word = vocab[idx]?.word
          return word && state.viewedWordSet[word]
        }).length
      },
    }),
    {
      name: 'linxu-progress',
      partialize: (state) => ({
        viewedWords: state.viewedWords,
        viewedWordSet: state.viewedWordSet,
        completedRoots: state.completedRoots,
        currentRoot: state.currentRoot,
      }),
    }
  )
)
