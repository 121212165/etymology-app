"use client";

import { useCallback, useEffect, useState } from "react";
import type { LearnStatus, ProgressMap, RootProgress } from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/constants";

const INITIAL_ROOT: RootProgress = {
  status: "unseen",
  easeFactor: 2.5,
  interval: 0,
  nextReview: "",
  reviewCount: 0,
  lastReview: null,
  correctStreak: 0,
};

function loadProgress(): ProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.progress);
    if (!raw) return {};
    return JSON.parse(raw) as ProgressMap;
  } catch {
    return {};
  }
}

function saveProgress(map: ProgressMap) {
  try {
    localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function nextStatus(current: LearnStatus, quality: number): LearnStatus {
  if (quality < 3) {
    return "learning";
  }
  switch (current) {
    case "unseen":
      return "learning";
    case "learning":
      return "reviewing";
    case "reviewing":
      return "mastered";
    case "mastered":
      return "mastered";
  }
}

function sm2(p: RootProgress, quality: number): RootProgress {
  let { easeFactor, interval, correctStreak } = p;
  if (quality >= 3) {
    correctStreak += 1;
    if (interval === 0) interval = 1;
    else if (interval === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    easeFactor = Math.max(
      1.3,
      easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
    );
  } else {
    correctStreak = 0;
    interval = 1;
  }
  const next = new Date();
  next.setDate(next.getDate() + interval);
  return {
    ...p,
    easeFactor,
    interval,
    correctStreak,
    reviewCount: p.reviewCount + 1,
    lastReview: new Date().toISOString(),
    nextReview: next.toISOString(),
    status: nextStatus(p.status, quality),
  };
}

export function useProgress() {
  const [progress, setProgress] = useState<ProgressMap>({});

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  const getRootStatus = useCallback(
    (rootText: string): LearnStatus => {
      return progress[rootText]?.status ?? "unseen";
    },
    [progress]
  );

  const updateRoot = useCallback(
    (rootText: string, quality: number) => {
      setProgress((prev) => {
        const current = prev[rootText] ?? { ...INITIAL_ROOT };
        const updated = sm2(current, quality);
        const next = { ...prev, [rootText]: updated };
        saveProgress(next);
        return next;
      });
    },
    []
  );

  const getStats = useCallback(() => {
    const counts = { unseen: 0, learning: 0, reviewing: 0, mastered: 0 };
    for (const r of Object.values(progress)) {
      counts[r.status]++;
    }
    const total = counts.unseen + counts.learning + counts.reviewing + counts.mastered;
    const coveragePercent = total === 0 ? 0 : Math.round(((total - counts.unseen) / total) * 100);
    return { ...counts, total, coveragePercent };
  }, [progress]);

  const isWordMastered = useCallback(
    (roots: string[]): boolean => {
      if (roots.length === 0) return false;
      return roots.every((r) => progress[r]?.status === "mastered");
    },
    [progress]
  );

  return { progress, getRootStatus, updateRoot, getStats, isWordMastered };
}
