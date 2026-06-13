import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  lowerBound,
  buildWordSorted,
  buildRootIndex,
  executeSearch,
  quickDecompose,
} from "@/lib/search-engine";
import type { VocabEntry, SearchIndex } from "@/lib/types";

vi.mock("@/lib/data-loader", () => ({
  getLoadedIndices: vi.fn(() => []),
  isIndexLoaded: vi.fn(() => false),
}));

import { getLoadedIndices, isIndexLoaded } from "@/lib/data-loader";

const mockGetLoadedIndices = vi.mocked(getLoadedIndices);
const mockIsIndexLoaded = vi.mocked(isIndexLoaded);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetLoadedIndices.mockReturnValue([]);
  mockIsIndexLoaded.mockReturnValue(false);
});

const sampleData: VocabEntry[] = [
  {
    word: "Biology",
    definition: "the study of life",
    parts: [
      { type: "root", text: "bio", meaning: "life", decomposed: false },
      { type: "suffix", text: "logy", meaning: "study of", decomposed: false },
    ],
  },
  {
    word: "Biography",
    definition: "a written account of someone's life",
    parts: [
      { type: "root", text: "bio", meaning: "life", decomposed: false },
      { type: "root", text: "graph", meaning: "write", decomposed: false },
    ],
  },
  {
    word: "Geography",
    definition: "the study of earth's surface",
    parts: [
      { type: "root", text: "geo", meaning: "earth", decomposed: false },
      { type: "root", text: "graph", meaning: "write", decomposed: false },
    ],
  },
  {
    word: "Telephone",
    definition: "a device for transmitting sound over distance",
    parts: [
      { type: "root", text: "phone", meaning: "sound", decomposed: false },
    ],
  },
];

function buildIndex(data: VocabEntry[]): SearchIndex {
  return {
    data,
    rootIndex: buildRootIndex(data),
    wordSorted: buildWordSorted(data),
    prefixIndex: { un: "not", re: "again" },
    suffixIndex: { tion: "act of", ment: "result of" },
  };
}

describe("lowerBound", () => {
  const arr = [
    { w: "apple", i: 0 },
    { w: "banana", i: 1 },
    { w: "cherry", i: 2 },
    { w: "date", i: 3 },
  ];

  it("returns 0 for empty array", () => {
    expect(lowerBound([], "anything")).toBe(0);
  });

  it("returns 0 when target is less than all elements", () => {
    expect(lowerBound(arr, "a")).toBe(0);
  });

  it("returns length when target is greater than all elements", () => {
    expect(lowerBound(arr, "zzz")).toBe(4);
  });

  it("returns correct index for exact match", () => {
    expect(lowerBound(arr, "cherry")).toBe(2);
  });

  it("returns first index for multiple identical elements", () => {
    const dupes = [
      { w: "aaa", i: 0 },
      { w: "aaa", i: 1 },
      { w: "aaa", i: 2 },
      { w: "bbb", i: 3 },
    ];
    expect(lowerBound(dupes, "aaa")).toBe(0);
  });
});

describe("buildWordSorted", () => {
  it("returns sorted array", () => {
    const sorted = buildWordSorted(sampleData);
    expect(sorted.map((s) => s.w)).toEqual([
      "biography",
      "biology",
      "geography",
      "telephone",
    ]);
  });

  it("converts words to lowercase", () => {
    const sorted = buildWordSorted(sampleData);
    for (const entry of sorted) {
      expect(entry.w).toBe(entry.w.toLowerCase());
    }
  });

  it("index i maps to original data position", () => {
    const sorted = buildWordSorted(sampleData);
    for (const entry of sorted) {
      expect(sampleData[entry.i].word.toLowerCase()).toBe(entry.w);
    }
  });
});

describe("buildRootIndex", () => {
  it("correctly builds inverted index", () => {
    const rootIndex = buildRootIndex(sampleData);
    expect(rootIndex["bio"].w).toEqual([0, 1]);
    expect(rootIndex["graph"].w).toEqual([1, 2]);
  });

  it("filters out roots with < 2 occurrences", () => {
    const rootIndex = buildRootIndex(sampleData);
    expect(rootIndex["geo"]).toBeUndefined();
    expect(rootIndex["phone"]).toBeUndefined();
  });

  it("correctly records meaning", () => {
    const rootIndex = buildRootIndex(sampleData);
    expect(rootIndex["bio"].m).toBe("life");
    expect(rootIndex["graph"].m).toBe("write");
  });

  it("keeps roots with count >= 2", () => {
    const rootIndex = buildRootIndex(sampleData);
    for (const key of Object.keys(rootIndex)) {
      expect(rootIndex[key].w.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("executeSearch", () => {
  const index = buildIndex(sampleData);

  it("returns all loaded indices for empty query", () => {
    mockGetLoadedIndices.mockReturnValue([0, 1, 2, 3]);
    const results = executeSearch(index, "", null);
    expect(results).toEqual([0, 1, 2, 3]);
  });

  it("returns only activeRoot words when activeRoot is set", () => {
    mockIsIndexLoaded.mockImplementation((idx: number) => idx === 0 || idx === 1);
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
    mockIsIndexLoaded.mockImplementation((idx: number) => idx === 1 || idx === 2);
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
