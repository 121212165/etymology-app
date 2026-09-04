import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProgressMap, RootProgress } from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/constants";
import {
  initializeProgress,
  calculateNextReview,
  getDueRoots,
  getProgressStats,
} from "@/lib/srs";

interface LearnState {
  progress: ProgressMap;
  todayDue: string[];

  getRoot: (key: string) => RootProgress;
  recordReview: (rootKey: string, quality: number) => void;
  refreshDue: () => void;
  stats: () => ReturnType<typeof getProgressStats>;
}

export const useLearnStore = create<LearnState>()(
  persist(
    (set, get) => ({
      progress: {},
      todayDue: [],

      getRoot: (key) => {
        const { progress } = get();
        return progress[key] ?? initializeProgress();
      },

      recordReview: (rootKey, quality) => {
        const { progress } = get();
        const current = progress[rootKey] ?? initializeProgress();
        const updated = calculateNextReview(quality, current);
        const next = { ...progress, [rootKey]: updated };
        set({ progress: next });
        get().refreshDue();
      },

      refreshDue: () => {
        set({ todayDue: getDueRoots() });
      },

      stats: () => getProgressStats(get().progress),
    }),
    {
      name: STORAGE_KEYS.progress,
      partialize: (state) => ({ progress: state.progress }),
    }
  )
);
