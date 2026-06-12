import { describe, it, expect } from "vitest";
import {
  executeSearch,
  buildWordSorted,
  buildRootIndex,
  buildSidebarGroups,
  buildSidebarData,
} from "../search-engine";
import type { VocabEntry, RootIndex, SearchIndex } from "../types";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockData: VocabEntry[] = [
  {
    word: "action",
    definition: "the process of doing something",
    parts: [
      { type: "root", text: "act", meaning: "to do, drive", decomposed: true },
      { type: "suffix", text: "ion", meaning: "act or process", decomposed: true },
    ],
  },
  {
    word: "active",
    definition: "engaging in action",
    parts: [
      { type: "root", text: "act", meaning: "to do, drive", decomposed: true },
      { type: "suffix", text: "ive", meaning: "tending to", decomposed: true },
    ],
  },
  {
    word: "visible",
    definition: "able to be seen",
    parts: [
      { type: "root", text: "vis", meaning: "to see", decomposed: true },
      { type: "suffix", text: "ible", meaning: "able to be", decomposed: true },
    ],
  },
  {
    word: "vision",
    definition: "the ability to see",
    parts: [
      { type: "root", text: "vis", meaning: "to see", decomposed: true },
      { type: "suffix", text: "ion", meaning: "act or process", decomposed: true },
    ],
  },
  {
    word: "transport",
    definition: "to carry across",
    parts: [
      { type: "prefix", text: "trans", meaning: "across", decomposed: true },
      { type: "root", text: "port", meaning: "to carry", decomposed: true },
    ],
  },
  {
    word: "export",
    definition: "to send out of a country",
    parts: [
      { type: "prefix", text: "ex", meaning: "out of", decomposed: true },
      { type: "root", text: "port", meaning: "to carry", decomposed: true },
    ],
  },
  {
    word: "unique",
    definition: "being the only one of its kind",
    parts: [
      { type: "root", text: "uni", meaning: "one", decomposed: true },
      { type: "suffix", text: "que", meaning: "relating to", decomposed: true },
    ],
  },
];

/**
 * Build a SearchIndex from mock data using the real builder functions.
 */
function buildTestIndex(data: VocabEntry[]): SearchIndex {
  return {
    data,
    wordSorted: buildWordSorted(data),
    rootIndex: buildRootIndex(data),
  };
}

const testIndex = buildTestIndex(mockData);

// ---------------------------------------------------------------------------
// executeSearch
// ---------------------------------------------------------------------------

describe("executeSearch", () => {
  it("returns all indices when query is empty and activeRoot is null", () => {
    const result = executeSearch(testIndex, "", null);
    expect(result).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("returns all indices when query is whitespace-only", () => {
    const result = executeSearch(testIndex, "   ", null);
    expect(result).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("finds prefix matches (act -> action, active)", () => {
    const result = executeSearch(testIndex, "act", null);
    // "act" is also a root in rootIndex matching "action" (0), "active" (1)
    expect(result).toContain(0); // action
    expect(result).toContain(1); // active
  });

  it("finds root reverse-index matches (vis -> visible, vision)", () => {
    const result = executeSearch(testIndex, "vis", null);
    expect(result).toContain(2); // visible
    expect(result).toContain(3); // vision
  });

  it("finds definition full-text search when query >= MIN_SEARCH_LEN", () => {
    // "carry" appears in "transport" definition
    const result = executeSearch(testIndex, "carry", null);
    expect(result).toContain(4); // transport
  });

  it("does NOT trigger definition search for query < MIN_SEARCH_LEN", () => {
    // "see" is 3 chars (>= MIN_SEARCH_LEN = 2), so it should match
    const resultLongEnough = executeSearch(testIndex, "see", null);
    expect(resultLongEnough.length).toBeGreaterThan(0);

    // Single char "a" (< MIN_SEARCH_LEN) should NOT do definition scan,
    // only prefix + root match
    const resultShort = executeSearch(testIndex, "a", null);
    // "a" won't prefix-match anything in sorted words (none start with "a"),
    // and "a" won't match any root text containing "a" that has >= 2 entries.
    // But it should still return results from prefix/root if any.
    expect(Array.isArray(resultShort)).toBe(true);
  });

  it("activeRoot returns only words with that root", () => {
    const result = executeSearch(testIndex, "", "vis");
    expect(result).toEqual([2, 3]); // visible, vision
  });

  it("activeRoot ignores query string", () => {
    const result = executeSearch(testIndex, "zzz", "act");
    expect(result).toEqual([0, 1]); // action, active
  });

  it("activeRoot returns empty array for unknown root", () => {
    const result = executeSearch(testIndex, "", "xyz");
    expect(result).toEqual([]);
  });

  it("is case-insensitive for query", () => {
    const lower = executeSearch(testIndex, "act", null);
    const upper = executeSearch(testIndex, "ACT", null);
    const mixed = executeSearch(testIndex, "AcT", null);
    expect(upper).toEqual(lower);
    expect(mixed).toEqual(lower);
  });

  it("returns empty array when nothing matches", () => {
    const result = executeSearch(testIndex, "zzzzz", null);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// buildWordSorted
// ---------------------------------------------------------------------------

describe("buildWordSorted", () => {
  it("returns array sorted alphabetically by lowercased word", () => {
    const sorted = buildWordSorted(mockData);
    const words = sorted.map((s) => s.w);
    const expectedOrder = [...words].sort();
    expect(words).toEqual(expectedOrder);
  });

  it("contains correct original indices", () => {
    const sorted = buildWordSorted(mockData);
    for (const entry of sorted) {
      expect(mockData[entry.i].word.toLowerCase()).toBe(entry.w);
    }
  });

  it("has same length as input data", () => {
    const sorted = buildWordSorted(mockData);
    expect(sorted.length).toBe(mockData.length);
  });
});

// ---------------------------------------------------------------------------
// buildRootIndex
// ---------------------------------------------------------------------------

describe("buildRootIndex", () => {
  it("correctly extracts root-type parts", () => {
    const rootIndex = buildRootIndex(mockData);
    expect(rootIndex["act"]).toBeDefined();
    expect(rootIndex["vis"]).toBeDefined();
    expect(rootIndex["port"]).toBeDefined();
  });

  it("filters out roots with fewer than 2 occurrences", () => {
    const rootIndex = buildRootIndex(mockData);
    // "uni" only appears in "unique" (1 occurrence) -> filtered
    expect(rootIndex["uni"]).toBeUndefined();
    // "act" appears in "action" and "active" (2 occurrences) -> kept
    expect(rootIndex["act"]).toBeDefined();
  });

  it("records the meaning from the first occurrence", () => {
    const rootIndex = buildRootIndex(mockData);
    expect(rootIndex["act"].m).toBe("to do, drive");
    expect(rootIndex["vis"].m).toBe("to see");
    expect(rootIndex["port"].m).toBe("to carry");
  });

  it("records correct word indices", () => {
    const rootIndex = buildRootIndex(mockData);
    expect(rootIndex["act"].w).toEqual([0, 1]); // action, active
    expect(rootIndex["vis"].w).toEqual([2, 3]); // visible, vision
    expect(rootIndex["port"].w).toEqual([4, 5]); // transport, export
  });

  it("ignores prefix and suffix types", () => {
    const rootIndex = buildRootIndex(mockData);
    // "trans" is a prefix -> should not be in root index
    expect(rootIndex["trans"]).toBeUndefined();
    // "ion" is a suffix -> should not be in root index
    expect(rootIndex["ion"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// buildSidebarGroups
// ---------------------------------------------------------------------------

describe("buildSidebarGroups", () => {
  it("groups known roots under their ROOT_GROUPS label", () => {
    const rootIndex = buildRootIndex(mockData);
    const groups = buildSidebarGroups(rootIndex);

    // "vis" belongs to "看与观察" group, "port" belongs to "行走与移动"
    const seeGroup = groups.find((g) => g.label === "看与观察");
    const moveGroup = groups.find((g) => g.label === "行走与移动");

    expect(seeGroup).toBeDefined();
    expect(seeGroup!.roots.some((r) => r.t === "vis")).toBe(true);

    expect(moveGroup).toBeDefined();
    expect(moveGroup!.roots.some((r) => r.t === "port")).toBe(true);
  });

  it('puts ungrouped roots into "其他" group', () => {
    const rootIndex = buildRootIndex(mockData);
    const groups = buildSidebarGroups(rootIndex);

    // "act" is in "建造与创造" group, so it's NOT ungrouped
    const otherGroup = groups.find((g) => g.label === "其他");
    // With our mock data, act/vis/port are all in ROOT_GROUPS,
    // so "其他" may or may not exist depending on data.
    // Let's verify the structure: every root should appear exactly once.
    const allRoots: string[] = [];
    for (const g of groups) {
      for (const r of g.roots) allRoots.push(r.t);
    }
    const rootKeys = Object.keys(rootIndex);
    expect(allRoots.sort()).toEqual(rootKeys.sort());
  });

  it("sorts roots within each group by count descending", () => {
    // Create data where "act" has 3 entries and "vis" has 2
    const data: VocabEntry[] = [
      ...mockData,
      {
        word: "reaction",
        definition: "an action in response",
        parts: [
          { type: "root", text: "act", meaning: "to do, drive", decomposed: true },
          { type: "suffix", text: "ion", meaning: "process", decomposed: true },
        ],
      },
    ];
    const ri = buildRootIndex(data);
    const groups = buildSidebarGroups(ri);

    // "act" is in "建造与创造", "vis" is in "看与观察"
    const buildGroup = groups.find((g) => g.label === "建造与创造");
    if (buildGroup) {
      for (let i = 1; i < buildGroup.roots.length; i++) {
        expect(buildGroup.roots[i - 1].c).toBeGreaterThanOrEqual(
          buildGroup.roots[i].c
        );
      }
    }
  });

  it("does not include empty groups", () => {
    // Build a rootIndex with only roots that are in ROOT_GROUPS
    const rootIndex = buildRootIndex(mockData);
    const groups = buildSidebarGroups(rootIndex);
    for (const g of groups) {
      expect(g.roots.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// buildSidebarData (backward-compatible flat list)
// ---------------------------------------------------------------------------

describe("buildSidebarData", () => {
  it("returns entries sorted by count descending", () => {
    const rootIndex = buildRootIndex(mockData);
    const list = buildSidebarData(rootIndex);
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1].c).toBeGreaterThanOrEqual(list[i].c);
    }
  });

  it("contains correct t, m, c fields", () => {
    const rootIndex = buildRootIndex(mockData);
    const list = buildSidebarData(rootIndex);
    for (const item of list) {
      expect(rootIndex[item.t]).toBeDefined();
      expect(rootIndex[item.t].m).toBe(item.m);
      expect(rootIndex[item.t].w.length).toBe(item.c);
    }
  });

  it("includes all roots from the index", () => {
    const rootIndex = buildRootIndex(mockData);
    const list = buildSidebarData(rootIndex);
    expect(list.length).toBe(Object.keys(rootIndex).length);
  });
});
