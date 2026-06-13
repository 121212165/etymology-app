import { describe, it, expect, beforeAll } from "vitest";
import path from "path";
import fs from "fs";
import { ROOT_GROUPS } from "@/lib/root-groups";
import { buildRootIndex } from "@/lib/search-engine";
import { getWordsForRoots } from "@/lib/root-network";
import type { VocabEntry, RootIndex, ProgressMap, RootProgress } from "@/lib/types";

const TOTAL_WORDS = 5011;

let vocab: VocabEntry[];
let builtRootIndex: RootIndex;
let rawRootIndex: RootIndex;

beforeAll(() => {
  const dataDir = path.resolve(__dirname, "..", "public", "data");
  vocab = JSON.parse(fs.readFileSync(path.join(dataDir, "vocab.json"), "utf-8"));
  rawRootIndex = JSON.parse(fs.readFileSync(path.join(dataDir, "roots-index.json"), "utf-8"));
  builtRootIndex = buildRootIndex(vocab);
});

function groupCoverage(groupMembers: string[]): number {
  const words = getWordsForRoots(groupMembers, rawRootIndex, vocab);
  return words.length / TOTAL_WORDS;
}

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

describe("组覆盖率", () => {
  it("每个组的覆盖率在 0-1 之间", () => {
    for (const group of ROOT_GROUPS) {
      const cov = groupCoverage(group.members);
      expect(cov).toBeGreaterThanOrEqual(0);
      expect(cov).toBeLessThanOrEqual(1);
      expect(cov).toBeGreaterThan(0);
    }
  });

  it("所有组覆盖率之和 > 0（因有重叠，联合 < 和）", () => {
    const totalCoverage = ROOT_GROUPS.reduce(
      (sum, g) => sum + groupCoverage(g.members),
      0
    );
    expect(totalCoverage).toBeGreaterThan(0);
  });

  it("所有组覆盖率之和大于任意单组覆盖率（重叠验证）", () => {
    const totalCoverage = ROOT_GROUPS.reduce(
      (sum, g) => sum + groupCoverage(g.members),
      0
    );
    const maxSingle = Math.max(...ROOT_GROUPS.map((g) => groupCoverage(g.members)));
    expect(totalCoverage).toBeGreaterThan(maxSingle);
  });

  it("每组有关联单词", () => {
    for (const group of ROOT_GROUPS) {
      const words = getWordsForRoots(group.members, rawRootIndex, vocab);
      expect(words.length).toBeGreaterThan(0);
    }
  });
});

describe("词根频率分布", () => {
  it("top 50 词根关联的单词数 > 200", () => {
    const rootCounts = Object.entries(builtRootIndex)
      .map(([root, entry]) => ({ root, count: entry.w.length }))
      .sort((a, b) => b.count - a.count);

    const top50 = rootCounts.slice(0, 50);
    const totalWords = top50.reduce((sum, r) => sum + r.count, 0);
    expect(totalWords).toBeGreaterThan(200);
  });

  it("低频词根（出现1次）被过滤", () => {
    for (const [root, entry] of Object.entries(builtRootIndex)) {
      expect(entry.w.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("buildRootIndex 过滤掉 count < 2 的根", () => {
    const allRoots: Record<string, number[]> = {};
    for (let i = 0; i < vocab.length; i++) {
      for (const part of vocab[i].parts) {
        if (part.type === "root") {
          if (!allRoots[part.text]) allRoots[part.text] = [];
          allRoots[part.text].push(i);
        }
      }
    }
    const lowFreqRoots = Object.entries(allRoots).filter(
      ([, indices]) => indices.length < 2
    );
    if (lowFreqRoots.length > 0) {
      for (const [root] of lowFreqRoots) {
        expect(builtRootIndex[root]).toBeUndefined();
      }
    }
  });
});

describe("训练完成后覆盖率", () => {
  it("完成一个组的训练后，该组关联的所有单词都可推理", () => {
    for (const group of ROOT_GROUPS) {
      const trainedRoots = new Set(group.members);
      const groupWords = getWordsForRoots(group.members, rawRootIndex, vocab);

      for (const word of groupWords) {
        const hasTrainedRoot = word.parts.some(
          (p) => trainedRoots.has(p.text)
        );
        expect(hasTrainedRoot).toBe(true);
      }
    }
  });

  it("统计已训练词根覆盖的单词百分比", () => {
    for (const group of ROOT_GROUPS) {
      const groupWords = getWordsForRoots(group.members, rawRootIndex, vocab);
      const coveragePercent = (groupWords.length / TOTAL_WORDS) * 100;
      expect(coveragePercent).toBeGreaterThan(0);
      expect(coveragePercent).toBeLessThanOrEqual(100);
    }
  });

  it("所有组训练完成后的联合覆盖率 > 0", () => {
    const allCoveredWords = new Set<number>();
    for (const group of ROOT_GROUPS) {
      const words = getWordsForRoots(group.members, rawRootIndex, vocab);
      for (const word of words) {
        allCoveredWords.add(vocab.indexOf(word));
      }
    }
    const unionCoverage = allCoveredWords.size / TOTAL_WORDS;
    expect(unionCoverage).toBeGreaterThan(0);
  });

  it("联合覆盖率 < 各组覆盖率之和（去重效果）", () => {
    const allCoveredWords = new Set<number>();
    let sumCoverage = 0;
    for (const group of ROOT_GROUPS) {
      const words = getWordsForRoots(group.members, rawRootIndex, vocab);
      sumCoverage += words.length / TOTAL_WORDS;
      for (const word of words) {
        allCoveredWords.add(vocab.indexOf(word));
      }
    }
    const unionCoverage = allCoveredWords.size / TOTAL_WORDS;
    expect(unionCoverage).toBeLessThan(sumCoverage);
  });

  it("模拟训练进度映射中所有组词根标记为 mastered", () => {
    for (const group of ROOT_GROUPS) {
      const progress: ProgressMap = {};
      for (const root of group.members) {
        if (root in rawRootIndex) {
          progress[root] = makeProgress({ status: "mastered" });
        }
      }
      const masteredRoots = Object.entries(progress)
        .filter(([, p]) => p.status === "mastered")
        .map(([key]) => key);

      const inferableWords = getWordsForRoots(masteredRoots, rawRootIndex, vocab);
      expect(inferableWords.length).toBeGreaterThan(0);

      const coveragePercent = (inferableWords.length / TOTAL_WORDS) * 100;
      expect(coveragePercent).toBeGreaterThan(0);
    }
  });
});
