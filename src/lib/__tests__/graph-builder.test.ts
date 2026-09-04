import { describe, it, expect } from "vitest";
import { getWordsForRoots } from "../root-network";
import { buildRootIndex } from "../search-engine";
import type { VocabEntry, RootIndex } from "../types";

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
    word: "reaction",
    definition: "an action in response",
    parts: [
      { type: "prefix", text: "re", meaning: "back, again", decomposed: true },
      { type: "root", text: "act", meaning: "to do, drive", decomposed: true },
      { type: "suffix", text: "ion", meaning: "act or process", decomposed: true },
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
    word: "inspection",
    definition: "the act of looking closely",
    parts: [
      { type: "prefix", text: "in", meaning: "into", decomposed: true },
      { type: "root", text: "spect", meaning: "to look", decomposed: true },
      { type: "suffix", text: "ion", meaning: "act or process", decomposed: true },
    ],
  },
  {
    word: "spectator",
    definition: "a person who watches",
    parts: [
      { type: "root", text: "spect", meaning: "to look", decomposed: true },
      { type: "suffix", text: "ator", meaning: "one who", decomposed: true },
    ],
  },
  {
    word: "transportable",
    definition: "able to be carried across",
    parts: [
      { type: "prefix", text: "trans", meaning: "across", decomposed: true },
      { type: "root", text: "port", meaning: "to carry", decomposed: true },
      { type: "root", text: "act", meaning: "to do, drive", decomposed: true },
      { type: "suffix", text: "able", meaning: "capable of", decomposed: true },
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
  {
    word: "construct",
    definition: "to build",
    parts: [
      { type: "prefix", text: "con", meaning: "together", decomposed: true },
      { type: "root", text: "struct", meaning: "to build", decomposed: true },
    ],
  },
  {
    word: "structure",
    definition: "something built",
    parts: [
      { type: "root", text: "struct", meaning: "to build", decomposed: true },
      { type: "suffix", text: "ure", meaning: "act or result", decomposed: true },
    ],
  },
];

const rootIndex: RootIndex = buildRootIndex(mockData);

function getWordNames(entries: VocabEntry[]): string[] {
  return entries.map((e) => e.word);
}

function getRootTexts(word: VocabEntry): string[] {
  return word.parts.filter((p) => p.type === "root").map((p) => p.text);
}

describe("getWordsForRoots", () => {
  it("returns correct word list for a single root", () => {
    const result = getWordsForRoots(["act"], rootIndex, mockData);
    expect(getWordNames(result)).toEqual(
      expect.arrayContaining(["action", "active", "reaction", "transportable"])
    );
    expect(result.length).toBe(4);
  });

  it("returns deduplicated union for multiple roots", () => {
    const result = getWordsForRoots(["vis", "spect"], rootIndex, mockData);
    const names = getWordNames(result);
    expect(names).toEqual(
      expect.arrayContaining(["visible", "vision", "inspection", "spectator"])
    );
    expect(result.length).toBe(4);
    const uniqueNames = [...new Set(names)];
    expect(names.length).toBe(uniqueNames.length);
  });

  it("sorts results by parts.length ascending", () => {
    const result = getWordsForRoots(["act"], rootIndex, mockData);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].parts.length).toBeGreaterThanOrEqual(
        result[i - 1].parts.length
      );
    }
  });

  it("returns empty array for a non-existent root", () => {
    const result = getWordsForRoots(["xyz_nonexistent"], rootIndex, mockData);
    expect(result).toEqual([]);
  });

  it("returns empty array for empty root list", () => {
    const result = getWordsForRoots([], rootIndex, mockData);
    expect(result).toEqual([]);
  });

  it("handles mix of existing and non-existing roots", () => {
    const result = getWordsForRoots(
      ["act", "xyz_nonexistent"],
      rootIndex,
      mockData
    );
    expect(getWordNames(result)).toEqual(
      expect.arrayContaining(["action", "active", "reaction", "transportable"])
    );
    expect(result.length).toBe(4);
  });
});

describe("bidirectional mapping", () => {
  it("root→words: finds all words containing a root", () => {
    const words = getWordsForRoots(["port"], rootIndex, mockData);
    const names = getWordNames(words);
    expect(names).toContain("transport");
    expect(names).toContain("export");
    expect(names).toContain("transportable");
    expect(names.length).toBe(3);
  });

  it("word→roots: from a word, finds its root parts", () => {
    const transport = mockData.find((w) => w.word === "transport")!;
    const roots = getRootTexts(transport);
    expect(roots).toContain("port");
  });

  it("bidirectional consistency: word in root's w[] implies root in word's parts", () => {
    for (const rootText of Object.keys(rootIndex)) {
      const entry = rootIndex[rootText];
      for (const idx of entry.w) {
        const word = mockData[idx];
        expect(word).toBeDefined();
        const wordRoots = getRootTexts(word);
        expect(wordRoots).toContain(rootText);
      }
    }
  });

  it("word→roots→words roundtrip returns superset containing original word", () => {
    const inspection = mockData.find((w) => w.word === "inspection")!;
    const roots = getRootTexts(inspection);
    const roundtripped = getWordsForRoots(roots, rootIndex, mockData);
    const roundtrippedNames = getWordNames(roundtripped);
    expect(roundtrippedNames).toContain("inspection");
  });
});

describe("root network depth", () => {
  it("from one root, through words, reaches other roots", () => {
    const actWords = getWordsForRoots(["act"], rootIndex, mockData);
    const reachableRoots = new Set<string>();
    for (const word of actWords) {
      for (const root of getRootTexts(word)) {
        reachableRoots.add(root);
      }
    }
    expect(reachableRoots.has("act")).toBe(true);
    expect(reachableRoots.size).toBeGreaterThanOrEqual(1);
  });

  it("two-hop traversal: root1 → word → root2 → words2", () => {
    const portWords = getWordsForRoots(["port"], rootIndex, mockData);
    const secondHopRoots = new Set<string>();
    for (const word of portWords) {
      for (const root of getRootTexts(word)) {
        if (root !== "port") secondHopRoots.add(root);
      }
    }
    expect(secondHopRoots.has("act")).toBe(true);
    const secondHopWords: string[] = [];
    for (const root of secondHopRoots) {
      const words = getWordsForRoots([root], rootIndex, mockData);
      secondHopWords.push(...getWordNames(words));
    }
    const uniqueSecondHop = [...new Set(secondHopWords)];
    expect(uniqueSecondHop).toContain("action");
    expect(uniqueSecondHop).toContain("active");
    expect(uniqueSecondHop).toContain("reaction");
    expect(uniqueSecondHop).toContain("transportable");
  });

  it("breadcrumb path: spect → inspection → in → ... traces a valid chain", () => {
    const spectWords = getWordsForRoots(["spect"], rootIndex, mockData);
    const inspection = spectWords.find((w) => w.word === "inspection");
    expect(inspection).toBeDefined();

    const inspectionRoots = getRootTexts(inspection!);
    expect(inspectionRoots).toContain("spect");

    const connectedRoots = inspectionRoots.filter((r) => r !== "spect");
    for (const root of connectedRoots) {
      const neighborWords = getWordsForRoots([root], rootIndex, mockData);
      expect(neighborWords.length).toBeGreaterThan(0);
      for (const w of neighborWords) {
        expect(getRootTexts(w)).toContain(root);
      }
    }
  });

  it("all reachable roots from vis via two hops", () => {
    const visWords = getWordsForRoots(["vis"], rootIndex, mockData);
    const allRoots = new Set<string>();
    for (const word of visWords) {
      for (const root of getRootTexts(word)) {
        allRoots.add(root);
      }
    }
    expect(allRoots.has("vis")).toBe(true);
    const allRootTexts = [...allRoots];
    for (const rootText of allRootTexts) {
      const words = getWordsForRoots([rootText], rootIndex, mockData);
      expect(words.length).toBeGreaterThan(0);
    }
  });
});
