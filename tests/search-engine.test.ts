import { describe, it, expect } from "vitest";
import {
  executeSearch,
  quickDecompose,
} from "@/lib/search-engine";
import type { VocabEntry, SearchIndex } from "@/lib/types";

const sampleData: VocabEntry[] = [
  {
    word: "Biology",
    definition: "the study of life",
    parts: [
      { type: "root", text: "bio", meaning: "life" },
      { type: "suffix", text: "logy", meaning: "study of" },
    ],
  },
  {
    word: "Biography",
    definition: "a written account of someone's life",
    parts: [
      { type: "root", text: "bio", meaning: "life" },
      { type: "root", text: "graph", meaning: "write" },
    ],
  },
  {
    word: "Geography",
    definition: "the study of earth's surface",
    parts: [
      { type: "root", text: "geo", meaning: "earth" },
      { type: "root", text: "graph", meaning: "write" },
    ],
  },
  {
    word: "Telephone",
    definition: "a device for transmitting sound over distance",
    parts: [
      { type: "root", text: "phone", meaning: "sound" },
    ],
  },
];

function buildIndex(data: VocabEntry[]): SearchIndex {
  const rootMap: Record<string, { m: string; w: number[] }> = {};
  for (let i = 0; i < data.length; i++) {
    for (const part of data[i].parts) {
      if (part.type === "root") {
        if (!rootMap[part.text]) rootMap[part.text] = { m: "", w: [] };
        if (!rootMap[part.text].m) rootMap[part.text].m = part.meaning;
        rootMap[part.text].w.push(i);
      }
    }
  }
  const rootIndex: Record<string, { m: string; w: number[] }> = {};
  for (const [key, val] of Object.entries(rootMap)) {
    if (val.w.length >= 2) rootIndex[key] = val;
  }
  return {
    data,
    rootIndex,
    prefixIndex: { un: "not", re: "again" },
    suffixIndex: { tion: "act of", ment: "result of" },
  };
}

describe("executeSearch", () => {
  const index = buildIndex(sampleData);

  it("returns all indices for empty query", () => {
    const results = executeSearch(index, "", null);
    expect(results).toEqual([0, 1, 2, 3]);
  });

  it("returns only activeRoot words when activeRoot is set", () => {
    const results = executeSearch(index, "", "bio");
    expect(results).toEqual([0, 1]);
  });

  it("prefix match works correctly", () => {
    const results = executeSearch(index, "bio", null);
    expect(results).toContain(0);
    expect(results).toContain(1);
    expect(results).not.toContain(2);
    expect(results).not.toContain(3);
  });

  it("root match works correctly", () => {
    const results = executeSearch(index, "graph", null);
    expect(results).toContain(1);
    expect(results).toContain(2);
  });

  it("returns empty array for no matches", () => {
    const results = executeSearch(index, "zzzzz", null);
    expect(results).toEqual([]);
  });
});

describe("quickDecompose", () => {
  const index = buildIndex(sampleData);

  it("matches known prefix and returns prefix", () => {
    const result = quickDecompose(index, "un");
    expect(result.matched).toBe(true);
    expect(result.prefix).toBeDefined();
    expect(result.prefix!.type).toBe("prefix");
    expect(result.prefix!.text).toBe("un");
    expect(result.prefix!.meaning).toBe("not");
  });

  it("matches known suffix and returns suffix", () => {
    const result = quickDecompose(index, "tion");
    expect(result.matched).toBe(true);
    expect(result.suffix).toBeDefined();
    expect(result.suffix!.type).toBe("suffix");
    expect(result.suffix!.text).toBe("tion");
    expect(result.suffix!.meaning).toBe("act of");
  });

  it("matches known root and returns root", () => {
    const result = quickDecompose(index, "bio");
    expect(result.matched).toBe(true);
    expect(result.root).toBeDefined();
    expect(result.root!.type).toBe("root");
    expect(result.root!.text).toBe("bio");
    expect(result.root!.meaning).toBe("life");
  });

  it("returns matched=false for no match", () => {
    const result = quickDecompose(index, "zzzzz");
    expect(result.matched).toBe(false);
    expect(result.prefix).toBeUndefined();
    expect(result.root).toBeUndefined();
    expect(result.suffix).toBeUndefined();
  });
});
