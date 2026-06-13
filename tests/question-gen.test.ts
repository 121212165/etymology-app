import { describe, it, expect } from "vitest";
import { buildGuessQuestions, buildDecomposeQuestions } from "@/lib/root-network";
import type { VocabEntry } from "@/lib/types";

function makeWord(word: string, definition: string, roots: string[]): VocabEntry {
  return {
    word,
    definition,
    parts: roots.map((r) => ({ type: "root" as const, text: r, meaning: r, decomposed: false })),
  };
}

const allWords: VocabEntry[] = [
  makeWord("visible", "able to be seen", ["vis"]),
  makeWord("vision", "the ability to see", ["vis"]),
  makeWord("provide", "to supply", ["vid"]),
  makeWord("evidence", "proof", ["vid"]),
  makeWord("revise", "to change", ["vis"]),
  makeWord("supervise", "to oversee", ["vis"]),
  makeWord("survey", "to examine", ["vis"]),
  makeWord("advise", "to recommend", ["vis"]),
  makeWord("device", "a tool", ["vis"]),
  makeWord("envisage", "to imagine", ["vis"]),
  makeWord("invisible", "cannot be seen", ["vis"]),
  makeWord("television", "broadcast system", ["vis"]),
];

const targetWords = allWords.slice(0, 3);
const groupMembers = ["vis", "vid", "spect", "spec", "view", "sight", "look", "see", "observ"];

describe("buildGuessQuestions", () => {
  it("generates exactly count questions", () => {
    const qs = buildGuessQuestions(targetWords, allWords, 3);
    expect(qs.length).toBe(3);
  });

  it("each question has 4 options", () => {
    const qs = buildGuessQuestions(targetWords, allWords, 3);
    for (const q of qs) {
      expect(q.options.length).toBe(4);
    }
  });

  it("correctIndex is between 0 and 3", () => {
    const qs = buildGuessQuestions(targetWords, allWords, 3);
    for (const q of qs) {
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThanOrEqual(3);
    }
  });

  it("options[correctIndex] equals entry.definition", () => {
    const qs = buildGuessQuestions(targetWords, allWords, 3);
    for (const q of qs) {
      expect(q.options[q.correctIndex]).toBe(q.entry.definition);
    }
  });

  it("options have no duplicates", () => {
    const qs = buildGuessQuestions(targetWords, allWords, 3);
    for (const q of qs) {
      expect(new Set(q.options).size).toBe(q.options.length);
    }
  });

  it("distractors come from other group words, not target words", () => {
    const qs = buildGuessQuestions(targetWords, allWords, 3);
    for (const q of qs) {
      const distractors = q.options.filter((_, i) => i !== q.correctIndex);
      for (const d of distractors) {
        const isFromTarget = targetWords.some((w) => w.definition === d);
        expect(isFromTarget).toBe(false);
      }
    }
  });

  it("distractors differ from correct answer", () => {
    const qs = buildGuessQuestions(targetWords, allWords, 3);
    for (const q of qs) {
      const distractors = q.options.filter((_, i) => i !== q.correctIndex);
      for (const d of distractors) {
        expect(d).not.toBe(q.entry.definition);
      }
    }
  });
});

describe("buildDecomposeQuestions", () => {
  const decomposeWords: VocabEntry[] = [
    makeWord("visible", "able to be seen", ["vis"]),
    makeWord("supervise", "to oversee", ["super", "vis"]),
    makeWord("evidence", "proof", ["e", "vid"]),
    makeWord("provide", "to supply", ["pro", "vid"]),
    makeWord("revise", "to change", ["re", "vis"]),
  ];

  it("generates exactly count questions", () => {
    const qs = buildDecomposeQuestions(decomposeWords, groupMembers, 3);
    expect(qs.length).toBe(3);
  });

  it("correctRoots is non-empty", () => {
    const qs = buildDecomposeQuestions(decomposeWords, groupMembers, 5);
    for (const q of qs) {
      expect(q.correctRoots.length).toBeGreaterThan(0);
    }
  });

  it("rootPool contains all correctRoots", () => {
    const qs = buildDecomposeQuestions(decomposeWords, groupMembers, 5);
    for (const q of qs) {
      for (const r of q.correctRoots) {
        expect(q.rootPool).toContain(r);
      }
    }
  });

  it("rootPool length is between 8 and 12", () => {
    const qs = buildDecomposeQuestions(decomposeWords, groupMembers, 5);
    for (const q of qs) {
      expect(q.rootPool.length).toBeGreaterThanOrEqual(8);
      expect(q.rootPool.length).toBeLessThanOrEqual(12);
    }
  });

  it("rootPool has no duplicates", () => {
    const qs = buildDecomposeQuestions(decomposeWords, groupMembers, 5);
    for (const q of qs) {
      expect(new Set(q.rootPool).size).toBe(q.rootPool.length);
    }
  });

  it("distractors come from groupMembers, not from correctRoots", () => {
    const qs = buildDecomposeQuestions(decomposeWords, groupMembers, 5);
    for (const q of qs) {
      const distractors = q.rootPool.filter((r) => !q.correctRoots.includes(r));
      for (const d of distractors) {
        expect(groupMembers).toContain(d);
        expect(q.correctRoots).not.toContain(d);
      }
    }
  });

  it("distractors differ from correct roots", () => {
    const qs = buildDecomposeQuestions(decomposeWords, groupMembers, 5);
    for (const q of qs) {
      const distractors = q.rootPool.filter((r) => !q.correctRoots.includes(r));
      for (const d of distractors) {
        expect(q.correctRoots).not.toContain(d);
      }
    }
  });
});
