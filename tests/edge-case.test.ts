import { describe, it, expect } from "vitest";
import { getWordsForRoots, buildGuessQuestions, buildDecomposeQuestions } from "@/lib/root-network";
import type { VocabEntry, RootIndex } from "@/lib/types";

function makeWord(overrides: Partial<VocabEntry> = {}): VocabEntry {
  return {
    word: "test",
    definition: "a test word",
    parts: [
      { type: "root", text: "test", meaning: "test meaning", decomposed: false },
    ],
    ...overrides,
  };
}

function makeWords(count: number): VocabEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    word: `word${i + 1}`,
    definition: `definition of word${i + 1}`,
    parts: [
      { type: "prefix" as const, text: `pre${i + 1}`, meaning: `前${i + 1}`, decomposed: false },
      { type: "root" as const, text: `root${i + 1}`, meaning: `根${i + 1}`, decomposed: false },
      { type: "suffix" as const, text: `suf${i + 1}`, meaning: `后${i + 1}`, decomposed: false },
    ],
  }));
}

describe("words=[]时不崩溃", () => {
  it("getWordsForRoots空vocab返回空数组", () => {
    const result = getWordsForRoots(["vis", "spect"], {}, []);
    expect(result).toEqual([]);
  });

  it("buildGuessQuestions空words返回空数组", () => {
    const result = buildGuessQuestions([], [], 10);
    expect(result).toEqual([]);
  });

  it("buildDecomposeQuestions空words返回空数组", () => {
    const result = buildDecomposeQuestions([], ["vis"], 10);
    expect(result).toEqual([]);
  });

  it("getWordsForRoots空rootTexts返回空数组", () => {
    const vocab = [makeWord()];
    const rootIndex: RootIndex = { vis: { m: "see", w: [0] } };
    const result = getWordsForRoots([], rootIndex, vocab);
    expect(result).toEqual([]);
  });
});

describe("只有1个单词时训练流程", () => {
  it("getWordsForRoots单个词根返回正确结果", () => {
    const vocab = [makeWord({ word: "visible" }), makeWord({ word: "other" })];
    const rootIndex: RootIndex = { vis: { m: "see", w: [0] } };
    const result = getWordsForRoots(["vis"], rootIndex, vocab);
    expect(result).toHaveLength(1);
    expect(result[0].word).toBe("visible");
  });

  it("buildGuessQuestions单个单词生成单个问题", () => {
    const words = [makeWord()];
    const result = buildGuessQuestions(words, words, 1);
    expect(result).toHaveLength(1);
  });

  it("buildDecomposeQuestions单个单词生成单个问题", () => {
    const words = [makeWord()];
    const result = buildDecomposeQuestions(words, ["test"], 1);
    expect(result).toHaveLength(1);
  });

  it("单个词根的decompose问题包含正确的rootPool", () => {
    const words = [makeWord()];
    const result = buildDecomposeQuestions(words, ["test", "extra1", "extra2"], 1);
    expect(result).toHaveLength(1);
    expect(result[0].rootPool).toContain("test");
    expect(result[0].correctRoots).toEqual(["test"]);
  });
});

describe("超长单词(>30字符)显示", () => {
  it("getWordsForRoots处理超长单词", () => {
    const longWord = "pneumonoultramicroscopicsilicovolcanoconiosis";
    const vocab = [makeWord({ word: longWord })];
    const rootIndex: RootIndex = { test: { m: "test", w: [0] } };
    const result = getWordsForRoots(["test"], rootIndex, vocab);
    expect(result).toHaveLength(1);
    expect(result[0].word).toBe(longWord);
  });

  it("buildGuessQuestions处理超长释义", () => {
    const longDef = "a".repeat(200);
    const entry = makeWord({ definition: longDef });
    const words = [entry, makeWord({ word: "w2", definition: "d2" })];
    const result = buildGuessQuestions(words, words, 1);
    expect(result).toHaveLength(1);
    expect(result[0].options).toHaveLength(4);
  });

  it("buildDecomposeQuestions处理超长单词", () => {
    const longWord = "a".repeat(50);
    const words = [makeWord({ word: longWord })];
    const result = buildDecomposeQuestions(words, ["test"], 1);
    expect(result).toHaveLength(1);
    expect(result[0].entry.word).toBe(longWord);
  });
});

describe("含特殊字符单词", () => {
  it("连字符单词在getWordsForRoots中正常处理", () => {
    const vocab = [makeWord({ word: "self-control" })];
    const rootIndex: RootIndex = { test: { m: "test", w: [0] } };
    const result = getWordsForRoots(["test"], rootIndex, vocab);
    expect(result).toHaveLength(1);
    expect(result[0].word).toBe("self-control");
  });

  it("带撇号单词正常处理", () => {
    const vocab = [makeWord({ word: "it's" })];
    const rootIndex: RootIndex = { test: { m: "test", w: [0] } };
    const result = getWordsForRoots(["test"], rootIndex, vocab);
    expect(result).toHaveLength(1);
    expect(result[0].word).toBe("it's");
  });

  it("带数字单词正常处理", () => {
    const vocab = [makeWord({ word: "3D" })];
    const rootIndex: RootIndex = { test: { m: "test", w: [0] } };
    const result = getWordsForRoots(["test"], rootIndex, vocab);
    expect(result).toHaveLength(1);
    expect(result[0].word).toBe("3D");
  });

  it("大写单词正常处理", () => {
    const vocab = [makeWord({ word: "DNA" })];
    const rootIndex: RootIndex = { test: { m: "test", w: [0] } };
    const result = getWordsForRoots(["test"], rootIndex, vocab);
    expect(result).toHaveLength(1);
    expect(result[0].word).toBe("DNA");
  });

  it("带斜杠的词根文本正常处理", () => {
    const vocab = [makeWord({
      parts: [{ type: "root", text: "vis/vid", meaning: "see", decomposed: false }],
    })];
    const rootIndex: RootIndex = { "vis/vid": { m: "see", w: [0] } };
    const result = getWordsForRoots(["vis/vid"], rootIndex, vocab);
    expect(result).toHaveLength(1);
  });
});

describe("词根文本空字符串", () => {
  it("getWordsForRoots空词根文本匹配空键", () => {
    const vocab = [makeWord()];
    const rootIndex: RootIndex = { "": { m: "empty", w: [0] } };
    const result = getWordsForRoots([""], rootIndex, vocab);
    expect(result).toHaveLength(1);
  });

  it("getWordsForRoots不存在的词根返回空", () => {
    const vocab = [makeWord()];
    const rootIndex: RootIndex = { vis: { m: "see", w: [0] } };
    const result = getWordsForRoots(["nonexistent"], rootIndex, vocab);
    expect(result).toEqual([]);
  });

  it("rootIndex中w为空数组时返回空", () => {
    const vocab = [makeWord()];
    const rootIndex: RootIndex = { vis: { m: "see", w: [] } };
    const result = getWordsForRoots(["vis"], rootIndex, vocab);
    expect(result).toEqual([]);
  });

  it("vocab为空但rootIndex有数据时不崩溃", () => {
    const rootIndex: RootIndex = { vis: { m: "see", w: [0, 1, 2] } };
    const result = getWordsForRoots(["vis"], rootIndex, []);
    expect(result).toEqual([]);
  });

  it("rootIndex中有无效索引时不崩溃", () => {
    const vocab = [makeWord({ word: "valid" })];
    const rootIndex: RootIndex = { test: { m: "test", w: [0, 99, 100] } };
    const result = getWordsForRoots(["test"], rootIndex, vocab);
    expect(result).toHaveLength(1);
    expect(result[0].word).toBe("valid");
  });
});

describe("getWordsForRoots去重正确", () => {
  it("同一单词被多个词根引用时不重复", () => {
    const vocab = [makeWord({ word: "transportation" })];
    const rootIndex: RootIndex = {
      trans: { m: "across", w: [0] },
      port: { m: "carry", w: [0] },
    };
    const result = getWordsForRoots(["trans", "port"], rootIndex, vocab);
    expect(result).toHaveLength(1);
    expect(result[0].word).toBe("transportation");
  });

  it("完全重复的词根列表去重", () => {
    const vocab = [makeWord({ word: "visible" })];
    const rootIndex: RootIndex = { vis: { m: "see", w: [0] } };
    const result = getWordsForRoots(["vis", "vis", "vis"], rootIndex, vocab);
    expect(result).toHaveLength(1);
  });

  it("多个词根部分重叠的词正确去重", () => {
    const vocab = [
      makeWord({ word: "visible" }),
      makeWord({ word: "inspect" }),
      makeWord({ word: "transport" }),
    ];
    const rootIndex: RootIndex = {
      vis: { m: "see", w: [0] },
      spect: { m: "look", w: [0, 1] },
      port: { m: "carry", w: [0, 2] },
    };
    const result = getWordsForRoots(["vis", "spect", "port"], rootIndex, vocab);
    expect(result).toHaveLength(3);
    const words = result.map((w) => w.word);
    expect(words).toContain("visible");
    expect(words).toContain("inspect");
    expect(words).toContain("transport");
  });

  it("buildGuessQuestions从重复数据生成问题不崩溃", () => {
    const words = [
      makeWord({ word: "visible" }),
      makeWord({ word: "visible" }),
      makeWord({ word: "vision" }),
      makeWord({ word: "visit" }),
      makeWord({ word: "revise" }),
    ];
    const result = buildGuessQuestions(words, words, 3);
    expect(result).toHaveLength(3);
    result.forEach((q) => {
      expect(q.options).toHaveLength(4);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(4);
    });
  });

  it("buildDecomposeQuestions从重复数据生成问题不崩溃", () => {
    const words = [
      makeWord({ word: "visible" }),
      makeWord({ word: "visible" }),
      makeWord({ word: "vision" }),
      makeWord({ word: "visitor" }),
      makeWord({ word: "revise" }),
    ];
    const result = buildDecomposeQuestions(words, ["vis"], 3);
    expect(result).toHaveLength(3);
    result.forEach((q) => {
      expect(q.correctRoots).toBeDefined();
      expect(q.rootPool).toBeDefined();
    });
  });
});

describe("快速连续操作不崩溃", () => {
  it("getWordsForRoots连续调用不崩溃", () => {
    const vocab = makeWords(50);
    const rootIndex: RootIndex = {};
    vocab.forEach((_, i) => {
      rootIndex[`root${i + 1}`] = { m: `m${i}`, w: [i] };
    });
    const rootTexts = Object.keys(rootIndex);
    for (let i = 0; i < 100; i++) {
      const result = getWordsForRoots(rootTexts, rootIndex, vocab);
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it("buildGuessQuestions连续调用不崩溃", () => {
    const words = makeWords(50);
    for (let i = 0; i < 100; i++) {
      const result = buildGuessQuestions(words, words, 10);
      expect(result).toHaveLength(10);
    }
  });

  it("buildDecomposeQuestions连续调用不崩溃", () => {
    const words = makeWords(50);
    for (let i = 0; i < 100; i++) {
      const result = buildDecomposeQuestions(words, ["root1", "root2", "root3"], 10);
      expect(result).toHaveLength(10);
    }
  });

  it("混合连续调用不崩溃", () => {
    const vocab = makeWords(50);
    const rootIndex: RootIndex = {};
    vocab.forEach((_, i) => {
      rootIndex[`root${i + 1}`] = { m: `m${i}`, w: [i] };
    });
    for (let i = 0; i < 50; i++) {
      const words = getWordsForRoots(["root1"], rootIndex, vocab);
      const guess = buildGuessQuestions(words, vocab, 5);
      const decompose = buildDecomposeQuestions(words, ["root1"], 5);
      expect(guess.length).toBeLessThanOrEqual(5);
      expect(decompose.length).toBeLessThanOrEqual(5);
    }
  });
});
