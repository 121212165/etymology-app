// Standalone runner -- works with: node src/lib/__tests__/vocab-quality.mjs
// No external dependencies required.
// The vitest version is in vocab-quality.test.ts (run after `npm install`).

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..", "..");

let vocab;
let rootsIndex;

before(() => {
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
    assert.ok(Array.isArray(vocab));
    assert.ok(vocab.length > 0);
  });

  it("has >= 4000 entries", () => {
    assert.ok(vocab.length >= 4000, `Expected >= 4000, got ${vocab.length}`);
  });

  it("every entry has word, definition, parts", () => {
    for (const entry of vocab) {
      assert.ok("word" in entry, `Missing word in entry`);
      assert.ok("definition" in entry, `Missing definition in entry`);
      assert.ok("parts" in entry, `Missing parts in entry`);
    }
  });

  it("word is a non-empty string for every entry", () => {
    for (const entry of vocab) {
      assert.equal(typeof entry.word, "string");
      assert.ok(entry.word.length > 0, `Empty word found`);
    }
  });

  it("definition is a non-empty string for every entry", () => {
    for (const entry of vocab) {
      assert.equal(typeof entry.definition, "string");
      assert.ok(entry.definition.length > 0, `Empty definition found`);
    }
  });

  it("parts is an array and every part has type, text, meaning", () => {
    for (const entry of vocab) {
      assert.ok(Array.isArray(entry.parts), `parts not array for "${entry.word}"`);
      for (const part of entry.parts) {
        assert.ok("type" in part, `Missing type in part of "${entry.word}"`);
        assert.ok("text" in part, `Missing text in part of "${entry.word}"`);
        assert.ok("meaning" in part, `Missing meaning in part of "${entry.word}"`);
      }
    }
  });

  it("part type is one of prefix, root, suffix", () => {
    const validTypes = new Set(["prefix", "root", "suffix"]);
    for (const entry of vocab) {
      for (const part of entry.parts) {
        assert.ok(
          validTypes.has(part.type),
          `Invalid type "${part.type}" in "${entry.word}"`
        );
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Vocabulary decomposition accuracy (sampled)
// ---------------------------------------------------------------------------

describe("vocabulary decomposition accuracy", () => {
  const samples = [
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
      assert.ok(entry, `Word "${word}" not found in vocab`);
      const roots = entry.parts.filter((p) => p.type === "root");
      const rootTexts = roots.map((r) => r.text);
      assert.ok(
        rootTexts.includes(expectedRoot),
        `Expected root "${expectedRoot}" in "${word}", got [${rootTexts.join(", ")}]`
      );
    });
  }
});

// ---------------------------------------------------------------------------
// roots-index.json validation
// ---------------------------------------------------------------------------

describe("roots-index.json validation", () => {
  it("is an object (Record)", () => {
    assert.equal(typeof rootsIndex, "object");
    assert.notEqual(rootsIndex, null);
    assert.ok(!Array.isArray(rootsIndex));
  });

  const coreRoots = ["vis", "spect", "dict", "port", "struct", "gen", "ced", "fer"];

  it("contains all core roots", () => {
    for (const root of coreRoots) {
      assert.ok(root in rootsIndex, `Missing core root "${root}"`);
    }
  });

  it("each core root has m (meaning) and w (word indices)", () => {
    for (const root of coreRoots) {
      const entry = rootsIndex[root];
      assert.ok("m" in entry, `Missing m in root "${root}"`);
      assert.equal(typeof entry.m, "string");
      assert.ok(entry.m.length > 0, `Empty m in root "${root}"`);
      assert.ok("w" in entry, `Missing w in root "${root}"`);
      assert.ok(Array.isArray(entry.w), `w not array in root "${root}"`);
      assert.ok(entry.w.length > 0, `Empty w in root "${root}"`);
    }
  });

  it("core roots act, vis, dict each have w length >= 5", () => {
    for (const root of ["act", "vis", "dict"]) {
      assert.ok(
        rootsIndex[root].w.length >= 5,
        `Root "${root}" has only ${rootsIndex[root].w.length} words`
      );
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
        assert.ok(idx >= 0, `Negative index in root "${rootKey}": ${idx}`);
        assert.ok(
          idx < vocabLen,
          `Index ${idx} out of bounds (vocab length ${vocabLen}) in root "${rootKey}"`
        );
      }
    }
  });

  it("sampled roots correctly reference vocab entries that contain them", () => {
    const eligibleRoots = Object.entries(rootsIndex)
      .filter(([, v]) => v.w.length >= 5)
      .slice(0, 10);

    assert.equal(eligibleRoots.length, 10, `Only ${eligibleRoots.length} eligible roots found`);

    for (const [rootKey, rootEntry] of eligibleRoots) {
      for (const idx of rootEntry.w) {
        const entry = vocab[idx];
        const partTexts = entry.parts.map((p) => p.text);
        assert.ok(
          partTexts.includes(rootKey),
          `vocab[${idx}] ("${entry.word}") does not contain root "${rootKey}"`
        );
      }
    }
  });
});
