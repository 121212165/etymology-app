import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { getWordsForRoots, buildGuessQuestions, buildDecomposeQuestions } from "@/lib/root-network";
import type { VocabEntry, RootIndex } from "@/lib/types";

const dataDir = path.resolve(__dirname, "../public/data");

const vocab: VocabEntry[] = JSON.parse(
  fs.readFileSync(path.join(dataDir, "vocab.json"), "utf-8")
);
const rootIndex: RootIndex = JSON.parse(
  fs.readFileSync(path.join(dataDir, "roots-index.json"), "utf-8")
);

const allRootTexts = Object.keys(rootIndex);

const chunkSizes = {
  hot: 552,
  warm: 595,
  cool: 633,
  cold: 3231,
};

function buildMockManifest() {
  return {
    hot: { roots: allRootTexts.slice(0, 50), count: chunkSizes.hot },
    warm: { roots: allRootTexts.slice(50, 200), count: chunkSizes.warm },
    cool: { roots: allRootTexts.slice(200, 500), count: chunkSizes.cool },
    cold: { roots: allRootTexts.slice(500), count: chunkSizes.cold },
  };
}

function buildMockChunk(start: number, count: number) {
  const entries = vocab.slice(start, start + count);
  const indices = entries.map((_, i) => start + i);
  return { indices, entries };
}

function buildMockFetch() {
  const manifest = buildMockManifest();
  const chunks = {
    hot: buildMockChunk(0, chunkSizes.hot),
    warm: buildMockChunk(chunkSizes.hot, chunkSizes.warm),
    cool: buildMockChunk(chunkSizes.hot + chunkSizes.warm, chunkSizes.cool),
    cold: buildMockChunk(
      chunkSizes.hot + chunkSizes.warm + chunkSizes.cool,
      chunkSizes.cold
    ),
  };

  return vi.fn((url: string) => {
    if (url === "/data/chunks/manifest.json") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(manifest) });
    }
    if (url === "/data/roots-index.json") {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(rootIndex) });
    }
    for (const level of ["hot", "warm", "cool", "cold"] as const) {
      if (url === `/data/chunks/chunk-${level}.json`) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(chunks[level]) });
      }
    }
    return Promise.resolve({ ok: false, status: 404 });
  });
}

describe("getWordsForRoots performance", () => {
  it("50 roots query < 10ms", () => {
    const sampleRoots = allRootTexts.slice(0, 50);
    const start = performance.now();
    const result = getWordsForRoots(sampleRoots, rootIndex, vocab);
    const elapsed = performance.now() - start;
    expect(result.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(10);
  });

  it("all 613 roots query < 50ms", () => {
    const start = performance.now();
    const result = getWordsForRoots(allRootTexts, rootIndex, vocab);
    const elapsed = performance.now() - start;
    expect(result.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(50);
  });
});

describe("buildGuessQuestions performance", () => {
  it("generate 100 questions < 10ms", () => {
    const words = vocab.slice(0, 200);
    const allGroupWords = vocab.slice(0, 500);
    buildGuessQuestions(words, allGroupWords, 100);
    const start = performance.now();
    const qs = buildGuessQuestions(words, allGroupWords, 100);
    const elapsed = performance.now() - start;
    expect(qs.length).toBe(100);
    expect(elapsed).toBeLessThan(10);
  });
});

describe("buildDecomposeQuestions performance", () => {
  it("generate 100 questions < 10ms", () => {
    const words = vocab.slice(0, 200);
    const groupMembers = allRootTexts.slice(0, 30);
    const start = performance.now();
    const qs = buildDecomposeQuestions(words, groupMembers, 100);
    const elapsed = performance.now() - start;
    expect(qs.length).toBe(100);
    expect(elapsed).toBeLessThan(10);
  });
});

describe("data loading performance", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("loadSearchIndex first load < 1000ms", async () => {
    vi.stubGlobal("fetch", buildMockFetch());
    const { loadSearchIndex } = await import("@/lib/data-loader");
    const start = performance.now();
    const index = await loadSearchIndex();
    const elapsed = performance.now() - start;
    expect(index.data.length).toBe(vocab.length);
    expect(elapsed).toBeLessThan(1000);
  });

  it("loadChunk incremental load < 500ms", async () => {
    vi.stubGlobal("fetch", buildMockFetch());
    const { loadSearchIndex, loadChunk } = await import("@/lib/data-loader");
    await loadSearchIndex();
    const start = performance.now();
    await loadChunk("warm");
    await loadChunk("cool");
    await loadChunk("cold");
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });
});

describe("memory test", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("full chunk load memory increase < 50MB", async () => {
    if (global.gc) global.gc();
    const before = process.memoryUsage().heapUsed;
    vi.stubGlobal("fetch", buildMockFetch());
    const { loadSearchIndex, loadChunk } = await import("@/lib/data-loader");
    await loadSearchIndex();
    await loadChunk("warm");
    await loadChunk("cool");
    await loadChunk("cold");
    if (global.gc) global.gc();
    const after = process.memoryUsage().heapUsed;
    const increaseMB = (after - before) / (1024 * 1024);
    expect(increaseMB).toBeLessThan(50);
  });
});
