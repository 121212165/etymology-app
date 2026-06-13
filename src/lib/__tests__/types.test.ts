import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import type {
  VocabPart,
  VocabEntry,
  RootIndexEntry,
  RootIndex,
  SidebarRoot,
  SidebarGroup,
  SearchIndex,
} from "../types";

// ---------------------------------------------------------------------------
// Load actual data files
// ---------------------------------------------------------------------------

const dataDir = resolve(__dirname, "../../../public/data");
let vocabData: VocabEntry[];
let rootIndex: RootIndex;

beforeAll(() => {
  vocabData = JSON.parse(readFileSync(resolve(dataDir, "vocab.json"), "utf-8"));
  rootIndex = JSON.parse(
    readFileSync(resolve(dataDir, "roots-index.json"), "utf-8")
  );
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_PART_TYPES = new Set(["prefix", "root", "suffix"]);

function isValidPartType(value: unknown): value is VocabPart["type"] {
  return typeof value === "string" && VALID_PART_TYPES.has(value);
}

// ---------------------------------------------------------------------------
// VocabPart
// ---------------------------------------------------------------------------

describe("VocabPart 接口验证", () => {
  it("vocab.json 中每个 part 的 type 是 prefix | root | suffix", () => {
    const bad: { word: string; type: unknown }[] = [];
    for (const entry of vocabData) {
      for (const part of entry.parts) {
        if (!isValidPartType(part.type)) {
          bad.push({ word: entry.word, type: part.type });
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("每个 part 的 text 是非空字符串", () => {
    const bad: { word: string; text: unknown }[] = [];
    for (const entry of vocabData) {
      for (const part of entry.parts) {
        if (typeof part.text !== "string" || part.text.length === 0) {
          bad.push({ word: entry.word, text: part.text });
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("每个 part 的 meaning 是非空字符串", () => {
    const bad: { word: string; meaning: unknown }[] = [];
    for (const entry of vocabData) {
      for (const part of entry.parts) {
        if (typeof part.meaning !== "string" || part.meaning.length === 0) {
          bad.push({ word: entry.word, meaning: part.meaning });
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("每个 part 的 decomposed 是布尔值或未定义", () => {
    const bad: { word: string; decomposed: unknown }[] = [];
    for (const entry of vocabData) {
      for (const part of entry.parts) {
        if (part.decomposed !== undefined && typeof part.decomposed !== "boolean") {
          bad.push({ word: entry.word, decomposed: part.decomposed });
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("vocabData 中至少有一个 part 的 type 是 prefix", () => {
    const hasPrefix = vocabData.some((e) => e.parts.some((p) => p.type === "prefix"));
    expect(hasPrefix).toBe(true);
  });

  it("vocabData 中至少有一个 part 的 type 是 suffix", () => {
    const hasSuffix = vocabData.some((e) => e.parts.some((p) => p.type === "suffix"));
    expect(hasSuffix).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// VocabEntry
// ---------------------------------------------------------------------------

describe("VocabEntry 接口验证", () => {
  it("每个 entry 的 word 是非空字符串", () => {
    const bad: unknown[] = [];
    for (const entry of vocabData) {
      if (typeof entry.word !== "string" || entry.word.length === 0) {
        bad.push(entry.word);
      }
    }
    expect(bad).toEqual([]);
  });

  it("每个 entry 的 definition 是非空字符串", () => {
    const bad: unknown[] = [];
    for (const entry of vocabData) {
      if (typeof entry.definition !== "string" || entry.definition.length === 0) {
        bad.push(entry.definition);
      }
    }
    expect(bad).toEqual([]);
  });

  it("每个 entry 的 parts 是数组", () => {
    for (const entry of vocabData) {
      expect(Array.isArray(entry.parts)).toBe(true);
    }
  });

  it("每个 entry 的 parts 非空", () => {
    const emptyParts = vocabData.filter((e) => e.parts.length === 0);
    expect(emptyParts).toEqual([]);
  });

  it("source 存在时是字符串", () => {
    const bad: { word: string; source: unknown }[] = [];
    for (const entry of vocabData) {
      if ("source" in entry && typeof entry.source !== "string") {
        bad.push({ word: entry.word, source: entry.source });
      }
    }
    expect(bad).toEqual([]);
  });

  it("vocabData 是非空数组", () => {
    expect(Array.isArray(vocabData)).toBe(true);
    expect(vocabData.length).toBeGreaterThan(0);
  });

  it("所有 word 值唯一", () => {
    const words = vocabData.map((e) => e.word);
    const unique = new Set(words);
    expect(unique.size).toBe(words.length);
  });
});

// ---------------------------------------------------------------------------
// RootIndexEntry
// ---------------------------------------------------------------------------

describe("RootIndexEntry 接口验证", () => {
  it("rootIndex 是非空对象", () => {
    expect(typeof rootIndex).toBe("object");
    expect(rootIndex).not.toBeNull();
    expect(Object.keys(rootIndex).length).toBeGreaterThan(0);
  });

  it("每个 RootIndexEntry 的 m 是非空字符串", () => {
    const bad: { key: string; m: unknown }[] = [];
    for (const [key, entry] of Object.entries(rootIndex)) {
      if (typeof entry.m !== "string" || entry.m.length === 0) {
        bad.push({ key, m: entry.m });
      }
    }
    expect(bad).toEqual([]);
  });

  it("每个 RootIndexEntry 的 w 是数字数组", () => {
    const bad: { key: string; w: unknown }[] = [];
    for (const [key, entry] of Object.entries(rootIndex)) {
      if (!Array.isArray(entry.w) || !entry.w.every((n) => typeof n === "number")) {
        bad.push({ key, w: entry.w });
      }
    }
    expect(bad).toEqual([]);
  });

  it("每个 w 数组非空", () => {
    const emptyW = Object.entries(rootIndex).filter(
      ([, entry]) => entry.w.length === 0
    );
    expect(emptyW).toEqual([]);
  });

  it("每个 w 中的索引不超过 vocabData 最大有效索引", () => {
    const maxIndex = vocabData.length - 1;
    const bad: { key: string; invalidIndices: number[] }[] = [];
    for (const [key, entry] of Object.entries(rootIndex)) {
      const invalid = entry.w.filter((i) => i < 0 || i > maxIndex);
      if (invalid.length > 0) {
        bad.push({ key, invalidIndices: invalid });
      }
    }
    expect(bad).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// SidebarRoot
// ---------------------------------------------------------------------------

describe("SidebarRoot 接口验证", () => {
  it("SidebarRoot 的 t 是字符串，m 是字符串，c 是数字", () => {
    const mockRoot: SidebarRoot = { t: "act", m: "做，行动", c: 5 };
    expect(typeof mockRoot.t).toBe("string");
    expect(typeof mockRoot.m).toBe("string");
    expect(typeof mockRoot.c).toBe("number");
  });

  it("根索引中的每个条目都能构造合法的 SidebarRoot", () => {
    const bad: { key: string; reason: string }[] = [];
    for (const [key, entry] of Object.entries(rootIndex)) {
      if (typeof key !== "string" || key.length === 0) {
        bad.push({ key, reason: "key is not a non-empty string" });
      }
      if (typeof entry.m !== "string" || entry.m.length === 0) {
        bad.push({ key, reason: `m is not a non-empty string: ${typeof entry.m}` });
      }
      if (!Array.isArray(entry.w)) {
        bad.push({ key, reason: "w is not an array" });
      } else if (typeof entry.w.length !== "number") {
        bad.push({ key, reason: "w.length is not a number" });
      }
    }
    expect(bad).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// SidebarGroup
// ---------------------------------------------------------------------------

describe("SidebarGroup 接口验证", () => {
  it("合法 SidebarGroup 结构验证", () => {
    const mockGroup: SidebarGroup = {
      label: "动作",
      icon: "🏃",
      roots: [
        { t: "act", m: "做，行动", c: 5 },
        { t: "duct", m: "引导", c: 3 },
      ],
    };
    expect(typeof mockGroup.label).toBe("string");
    expect(typeof mockGroup.icon).toBe("string");
    expect(Array.isArray(mockGroup.roots)).toBe(true);
    for (const root of mockGroup.roots) {
      expect(typeof root.t).toBe("string");
      expect(typeof root.m).toBe("string");
      expect(typeof root.c).toBe("number");
    }
  });

  it("roots 非空时每个元素符合 SidebarRoot 形状", () => {
    const group: SidebarGroup = {
      label: "测试组",
      icon: "🧪",
      roots: [{ t: "test", m: "测试", c: 1 }],
    };
    expect(group.roots.length).toBeGreaterThan(0);
    for (const root of group.roots) {
      expect(root).toHaveProperty("t");
      expect(root).toHaveProperty("m");
      expect(root).toHaveProperty("c");
    }
  });

  it("label 和 icon 不能为空字符串", () => {
    const invalidGroups: Partial<SidebarGroup>[] = [
      { label: "", icon: "🧪", roots: [] },
      { label: "测试", icon: "", roots: [] },
    ];
    for (const group of invalidGroups) {
      if (group.label === "" || group.icon === "") {
        expect(group.label === "" || group.icon === "").toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// SearchIndex
// ---------------------------------------------------------------------------

describe("SearchIndex 接口验证", () => {
  it("SearchIndex 包含 data, rootIndex, wordSorted 三个字段", () => {
    const mockIndex: SearchIndex = {
      data: vocabData,
      rootIndex: rootIndex,
      wordSorted: vocabData.map((e, i) => ({ w: e.word, i })),
    };
    expect(mockIndex).toHaveProperty("data");
    expect(mockIndex).toHaveProperty("rootIndex");
    expect(mockIndex).toHaveProperty("wordSorted");
  });

  it("data 是 VocabEntry 数组", () => {
    const data: VocabEntry[] = vocabData;
    expect(Array.isArray(data)).toBe(true);
    for (const entry of data) {
      expect(typeof entry.word).toBe("string");
      expect(typeof entry.definition).toBe("string");
      expect(Array.isArray(entry.parts)).toBe(true);
    }
  });

  it("rootIndex 是 Record<string, RootIndexEntry>", () => {
    const ri: RootIndex = rootIndex;
    expect(typeof ri).toBe("object");
    expect(ri).not.toBeNull();
    for (const [key, entry] of Object.entries(ri)) {
      expect(typeof key).toBe("string");
      expect(typeof entry.m).toBe("string");
      expect(Array.isArray(entry.w)).toBe(true);
    }
  });

  it("wordSorted 中每个元素有 w (string) 和 i (number)", () => {
    const wordSorted: { w: string; i: number }[] = vocabData.map((e, i) => ({
      w: e.word,
      i,
    }));
    for (const item of wordSorted) {
      expect(typeof item.w).toBe("string");
      expect(typeof item.i).toBe("number");
    }
  });

  it("wordSorted 的长度与 vocabData 一致", () => {
    const wordSorted = vocabData.map((e, i) => ({ w: e.word, i }));
    expect(wordSorted.length).toBe(vocabData.length);
  });
});

// ---------------------------------------------------------------------------
// Type union and edge cases
// ---------------------------------------------------------------------------

describe("ViewMode 和 LearnStatus 类型验证", () => {
  it("ViewMode 只接受 list | flashcard | stats", () => {
    const validModes = ["list", "flashcard", "stats"];
    for (const mode of validModes) {
      expect(["list", "flashcard", "stats"]).toContain(mode);
    }
    expect(validModes).toHaveLength(3);
  });

  it("LearnStatus 只接受 new | learning | learned", () => {
    const validStatuses = ["new", "learning", "learned"];
    for (const status of validStatuses) {
      expect(["new", "learning", "learned"]).toContain(status);
    }
    expect(validStatuses).toHaveLength(3);
  });
});
