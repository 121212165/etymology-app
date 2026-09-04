import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RootProgress, ProgressMap } from "@/lib/types";

function makeProgress(overrides: Partial<RootProgress> = {}): RootProgress {
  return {
    status: "unseen",
    easeFactor: 2.5,
    interval: 0,
    nextReview: new Date().toISOString(),
    reviewCount: 0,
    lastReview: null,
    correctStreak: 0,
    ...overrides,
  };
}

let store: Record<string, string> = {};

beforeEach(() => {
  store = {};
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  });
});

describe("calculateNextReview", () => {
  it("quality=5 increases interval and easeFactor", async () => {
    const { calculateNextReview } = await import("@/lib/srs");
    const current = makeProgress({ interval: 6, easeFactor: 2.5 });
    const result = calculateNextReview(5, current);
    expect(result.interval).toBe(Math.round(6 * 2.5));
    expect(result.easeFactor).toBeGreaterThan(2.5);
    expect(result.correctStreak).toBe(1);
  });

  it("quality=0 resets interval to 1 and streak to 0", async () => {
    const { calculateNextReview } = await import("@/lib/srs");
    const current = makeProgress({ interval: 10, correctStreak: 5, easeFactor: 2.5 });
    const result = calculateNextReview(0, current);
    expect(result.interval).toBe(1);
    expect(result.correctStreak).toBe(0);
  });

  it("easeFactor never drops below 1.3", async () => {
    const { calculateNextReview } = await import("@/lib/srs");
    const current = makeProgress({ easeFactor: 1.3 });
    const result = calculateNextReview(0, current);
    expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it("quality=3 grows interval by formula", async () => {
    const { calculateNextReview } = await import("@/lib/srs");
    const current = makeProgress({ interval: 6, easeFactor: 2.5 });
    const result = calculateNextReview(3, current);
    expect(result.interval).toBe(Math.round(6 * 2.5));
    expect(result.correctStreak).toBe(1);
  });
});

describe("status transitions", () => {
  it("unseen + quality>=3 becomes learning", async () => {
    const { calculateNextReview } = await import("@/lib/srs");
    const result = calculateNextReview(4, makeProgress({ status: "unseen" }));
    expect(result.status).toBe("learning");
  });

  it("learning + quality>=3 + streak>=3 becomes reviewing", async () => {
    const { calculateNextReview } = await import("@/lib/srs");
    const current = makeProgress({ status: "learning", correctStreak: 2, interval: 6 });
    const result = calculateNextReview(4, current);
    expect(result.correctStreak).toBe(3);
    expect(result.status).toBe("reviewing");
  });

  it("reviewing + quality>=3 + streak>=5 + EF>2.0 becomes mastered", async () => {
    const { calculateNextReview } = await import("@/lib/srs");
    const current = makeProgress({ status: "reviewing", correctStreak: 4, interval: 10, easeFactor: 2.1 });
    const result = calculateNextReview(4, current);
    expect(result.correctStreak).toBe(5);
    expect(result.easeFactor).toBeGreaterThan(2.0);
    expect(result.status).toBe("mastered");
  });

  it("quality<3 reverts to learning (from reviewing)", async () => {
    const { calculateNextReview } = await import("@/lib/srs");
    const current = makeProgress({ status: "reviewing", correctStreak: 5 });
    const result = calculateNextReview(1, current);
    expect(result.status).toBe("learning");
    expect(result.correctStreak).toBe(0);
  });
});

describe("getDueRoots", () => {
  it("returns roots with nextReview <= now", async () => {
    const past = new Date(Date.now() - 100000).toISOString();
    const future = new Date(Date.now() + 100000).toISOString();
    const map: ProgressMap = {
      a: makeProgress({ status: "learning", nextReview: past }),
      b: makeProgress({ status: "learning", nextReview: future }),
      c: makeProgress({ status: "unseen", nextReview: past }),
    };
    localStorage.setItem("linxu-progress", JSON.stringify(map));

    const { getDueRoots } = await import("@/lib/srs");
    const due = getDueRoots();
    expect(due).toContain("a");
    expect(due).not.toContain("b");
    expect(due).not.toContain("c");
  });
});

describe("getProgressStats", () => {
  it("returns correct counts per status", async () => {
    const map: ProgressMap = {
      a: makeProgress({ status: "unseen" }),
      b: makeProgress({ status: "learning", nextReview: new Date(Date.now() - 1000).toISOString() }),
      c: makeProgress({ status: "reviewing", nextReview: new Date(Date.now() + 100000).toISOString() }),
      d: makeProgress({ status: "mastered", nextReview: new Date(Date.now() - 1000).toISOString() }),
    };

    const { getProgressStats } = await import("@/lib/srs");
    const stats = getProgressStats(map);
    expect(stats.unseen).toBe(1);
    expect(stats.learning).toBe(1);
    expect(stats.reviewing).toBe(1);
    expect(stats.mastered).toBe(1);
    expect(stats.due).toBe(2);
  });
});
