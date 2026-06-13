import { describe, it, expect } from "vitest";
import { getWordsForRoots } from "../src/lib/root-network";
import type { VocabEntry, RootIndex } from "../src/lib/types";

function makeVocab(word: string, definition: string, parts: { type: "prefix" | "root" | "suffix"; text: string; meaning: string; decomposed: boolean }[]): VocabEntry {
  return { word, definition, parts };
}

const vocab: VocabEntry[] = [
  makeVocab("react", "反应", [
    { type: "prefix", text: "re", meaning: "再", decomposed: true },
    { type: "root", text: "act", meaning: "做", decomposed: true },
  ]),
  makeVocab("action", "行动", [
    { type: "root", text: "act", meaning: "做", decomposed: true },
    { type: "suffix", text: "ion", meaning: "状态", decomposed: true },
  ]),
  makeVocab("visible", "可见的", [
    { type: "root", text: "vis", meaning: "看", decomposed: true },
    { type: "suffix", text: "ible", meaning: "能够", decomposed: true },
  ]),
  makeVocab("transport", "运输", [
    { type: "prefix", text: "trans", meaning: "跨越", decomposed: true },
    { type: "root", text: "port", meaning: "携带", decomposed: true },
  ]),
  makeVocab("export", "出口", [
    { type: "prefix", text: "ex", meaning: "出", decomposed: true },
    { type: "root", text: "port", meaning: "携带", decomposed: true },
  ]),
  makeVocab("reaction", "反应", [
    { type: "prefix", text: "re", meaning: "再", decomposed: true },
    { type: "root", text: "act", meaning: "做", decomposed: true },
    { type: "suffix", text: "ion", meaning: "状态", decomposed: true },
  ]),
];

const rootIndex: RootIndex = {
  act: { m: "做", w: [0, 1, 5] },
  vis: { m: "看", w: [2] },
  port: { m: "携带", w: [3, 4] },
};

describe("getWordsForRoots 边界测试", () => {
  it("空rootTexts[] → 返回空数组", () => {
    const result = getWordsForRoots([], rootIndex, vocab);
    expect(result).toEqual([]);
  });

  it("不存在的rootText → 跳过", () => {
    const result = getWordsForRoots(["nonexistent"], rootIndex, vocab);
    expect(result).toEqual([]);
  });

  it("所有rootTexts都不存在 → 返回空数组", () => {
    const result = getWordsForRoots(["foo", "bar", "baz"], rootIndex, vocab);
    expect(result).toEqual([]);
  });

  it("一个单词属于多个词根 → 只出现一次（去重）", () => {
    const result = getWordsForRoots(["act", "vis"], rootIndex, vocab);
    const words = result.map((v) => v.word);
    const unique = new Set(words);
    expect(words.length).toBe(unique.size);
  });
});

describe("数据完整性测试", () => {
  const result = getWordsForRoots(["act", "vis", "port"], rootIndex, vocab);

  it("返回的每个VocabEntry都有word和definition", () => {
    for (const entry of result) {
      expect(entry.word).toBeTruthy();
      expect(typeof entry.word).toBe("string");
      expect(entry.definition).toBeTruthy();
      expect(typeof entry.definition).toBe("string");
    }
  });

  it("返回的每个VocabEntry都有parts数组", () => {
    for (const entry of result) {
      expect(Array.isArray(entry.parts)).toBe(true);
      expect(entry.parts.length).toBeGreaterThan(0);
    }
  });

  it("parts中至少有一个root类型", () => {
    for (const entry of result) {
      const hasRoot = entry.parts.some((p) => p.type === "root");
      expect(hasRoot).toBe(true);
    }
  });
});

describe("排序测试", () => {
  it("结果按parts.length升序", () => {
    const result = getWordsForRoots(["act", "vis", "port"], rootIndex, vocab);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].parts.length).toBeGreaterThanOrEqual(result[i - 1].parts.length);
    }
  });

  it("parts.length相同时保持稳定顺序", () => {
    const result = getWordsForRoots(["act", "vis", "port"], rootIndex, vocab);
    for (let i = 1; i < result.length; i++) {
      if (result[i].parts.length === result[i - 1].parts.length) {
        const idxPrev = vocab.findIndex((v) => v.word === result[i - 1].word);
        const idxCurr = vocab.findIndex((v) => v.word === result[i].word);
        expect(idxCurr).toBeGreaterThanOrEqual(idxPrev);
      }
    }
  });
});
