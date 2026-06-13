import type { RootProgress, ProgressMap, LearnStatus } from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/constants";

const MIN_EF = 1.3;
const DEFAULT_EF = 2.5;

export function initializeProgress(): RootProgress {
  return {
    status: "unseen",
    easeFactor: DEFAULT_EF,
    interval: 0,
    nextReview: new Date().toISOString(),
    reviewCount: 0,
    lastReview: null,
    correctStreak: 0,
  };
}

function deriveStatus(
  prev: LearnStatus,
  quality: number,
  streak: number,
  ef: number
): LearnStatus {
  if (quality < 3) {
    return prev === "unseen" ? "unseen" : "learning";
  }
  if (prev === "unseen") return "learning";
  if (prev === "learning" && streak >= 2) return "reviewing";
  if (prev === "reviewing" && streak >= 4 && ef > 2.0) return "mastered";
  return prev;
}

export function calculateNextReview(
  quality: number,
  current: RootProgress
): RootProgress {
  const q = Math.max(0, Math.min(5, quality));
  const prevStatus = current.status;
  let { easeFactor, interval, correctStreak, reviewCount } = current;

  if (q >= 3) {
    correctStreak += 1;
    if (interval === 0) {
      interval = 1;
    } else if (interval === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
  } else {
    correctStreak = 0;
    interval = 1;
  }

  easeFactor =
    easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easeFactor < MIN_EF) easeFactor = MIN_EF;

  const status = deriveStatus(prevStatus, q, correctStreak, easeFactor);

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    status,
    easeFactor,
    interval,
    nextReview: nextReview.toISOString(),
    reviewCount: reviewCount + 1,
    lastReview: new Date().toISOString(),
    correctStreak,
  };
}

function loadProgressMap(): ProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.progress);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProgressMap(map: ProgressMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(map));
}

export function getRootProgress(rootKey: string): RootProgress {
  const map = loadProgressMap();
  return map[rootKey] ?? initializeProgress();
}

export function recordReview(rootKey: string, quality: number): RootProgress {
  const map = loadProgressMap();
  const current = map[rootKey] ?? initializeProgress();
  const updated = calculateNextReview(quality, current);
  map[rootKey] = updated;
  saveProgressMap(map);
  return updated;
}

export function getDueRoots(): string[] {
  const map = loadProgressMap();
  const now = new Date();
  const due: string[] = [];
  for (const [key, prog] of Object.entries(map)) {
    if (prog.status === "unseen") continue;
    if (new Date(prog.nextReview) <= now) {
      due.push(key);
    }
  }
  return due;
}

export function getProgressStats(map: ProgressMap) {
  const stats = { unseen: 0, learning: 0, reviewing: 0, mastered: 0, due: 0 };
  const now = new Date();
  for (const prog of Object.values(map)) {
    stats[prog.status]++;
    if (prog.status !== "unseen" && new Date(prog.nextReview) <= now) {
      stats.due++;
    }
  }
  return stats;
}
