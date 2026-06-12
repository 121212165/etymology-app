import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..", "..", "..");

let vocab: Array<{
  word: string;
  definition: string;
  parts: Array<{ type: string; text: string; meaning: string }>;
}>;
let rootsIndex: Record<
  string,
  { m: string; w: number[] }
>;

beforeAll(() => {
  vocab = JSON.parse(
    readFileSync(join(ROOT, "public", "data", "vocab.json"), "utf8")
  );
  rootsIndex = JSON.parse(
    readFileSync(join(ROOT, "public", "data", "roots-index.json"), "utf8")
  );
});

// ---------------------------------------------------------------------------
// vocab.json structure
// ---------------------------------------------------------------------------

describe("vocab.json structure", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(vocab)).toBe(true);
    expect(vocab.length).toBeGreaterThan(0);
  });

  it("has >= 4000 entries", () => {
    expect(vocab.length).toBeGreaterThanOrEqual(4000);
  });

  it("every entry has word, definition, parts", () => {
    for (const entry of vocab) {
      expect(entry).toHaveProperty("word");
      expect(entry).toHaveProperty("definition");
      expect(entry).toHaveProperty("parts");
    }
  });

  it("word is a non-empty string for every entry", () => {
    for (const entry of vocab) {
      expect(typeof entry.word).toBe("string");
      expect(entry.word.length).toBeGreaterThan(0);
    }
  });

  it("definition is a non-empty string for every entry", () => {
    for (const entry of vocab) {
      expect(typeof entry.definition).toBe("string");
      expect(entry.definition.length).toBeGreaterThan(0);
    }
  });

  it("parts is an array and every part has type, text, meaning", () => {
    for (const entry of vocab) {
      expect(Array.isArray(entry.parts)).toBe(true);
      for (const part of entry.parts) {
        expect(part).toHaveProperty("type");
        expect(part).toHaveProperty("text");
        expect(part).toHaveProperty("meaning");
      }
    }
  });

  it("part type is one of prefix, root, suffix", () => {
    const validTypes = new Set(["prefix", "root", "suffix"]);
    for (const entry of vocab) {
      for (const part of entry.parts) {
        expect(validTypes.has(part.type)).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Vocabulary decomposition accuracy (sampled)
// ---------------------------------------------------------------------------

describe("vocabulary decomposition accuracy", () => {
  const samples: Array<{
    word: string;
    expectedRoot: string;
  }> = [
    { word: "action", expectedRoot: "act" },
    { word: "visible", expectedRoot: "vis" },
    { word: "transport", expectedRoot: "port" },
    { word: "construct", expectedRoot: "struct" },
    { word: "predict", expectedRoot: "dict" },
    { word: "receive", expectedRoot: "ceive" },
    { word: "inspect", expectedRoot: "spect" },
    { word: "generate", expectedRoot: "gen" },
  ];

  for (const { word, expectedRoot } of samples) {
    it(`"${word}" contains root "${expectedRoot}"`, () => {
      const entry = vocab.find((e) => e.word === word);
      expect(entry).toBeDefined();
      const roots = entry!.parts.filter((p) => p.type === "root");
      const rootTexts = roots.map((r) => r.text);
      expect(rootTexts).toContain(expectedRoot);
    });
  }
});

// ---------------------------------------------------------------------------
// roots-index.json validation
// ---------------------------------------------------------------------------

describe("roots-index.json validation", () => {
  it("is an object (Record)", () => {
    expect(typeof rootsIndex).toBe("object");
    expect(rootsIndex).not.toBeNull();
    expect(Array.isArray(rootsIndex)).toBe(false);
  });

  const coreRoots = [
    "vis",
    "spect",
    "dict",
    "port",
    "struct",
    "gen",
    "ced",
    "fer",
  ];

  it("contains all core roots", () => {
    for (const root of coreRoots) {
      expect(rootsIndex).toHaveProperty(root);
    }
  });

  it("each core root has m (meaning) and w (word indices)", () => {
    for (const root of coreRoots) {
      const entry = rootsIndex[root];
      expect(entry).toHaveProperty("m");
      expect(typeof entry.m).toBe("string");
      expect(entry.m.length).toBeGreaterThan(0);
      expect(entry).toHaveProperty("w");
      expect(Array.isArray(entry.w)).toBe(true);
      expect(entry.w.length).toBeGreaterThan(0);
    }
  });

  const largeCoreRoots = ["act", "vis", "dict"];

  it("core roots act, vis, dict each have w length >= 5", () => {
    for (const root of largeCoreRoots) {
      expect(rootsIndex[root].w.length).toBeGreaterThanOrEqual(5);
    }
  });
});

// ---------------------------------------------------------------------------
// Data consistency: roots-index <-> vocab
// ---------------------------------------------------------------------------

describe("data consistency", () => {
  it("all word indices in roots-index are within vocab bounds", () => {
    const vocabLen = vocab.length;
    for (const [rootKey, rootEntry] of Object.entries(rootsIndex)) {
      for (const idx of rootEntry.w) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(vocabLen);
      }
    }
  });

  it("sampled roots correctly reference vocab entries that contain them", () => {
    // Pick 10 roots deterministically (first 10 keys that have >= 5 words)
    const eligibleRoots = Object.entries(rootsIndex)
      .filter(([, v]) => v.w.length >= 5)
      .slice(0, 10);

    expect(eligibleRoots.length).toBe(10);

    for (const [rootKey, rootEntry] of eligibleRoots) {
      for (const idx of rootEntry.w) {
        const entry = vocab[idx];
        const partTexts = entry.parts.map((p) => p.text);
        expect(partTexts).toContain(rootKey);
      }
    }
  });
});
