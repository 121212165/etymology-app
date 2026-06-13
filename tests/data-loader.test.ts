import { describe, it, expect, vi, beforeEach } from "vitest";

const mockManifest = {
  hot: { roots: ["test"], count: 1 },
};
const mockRoots = { test: { m: "test", w: [0] } };
const mockChunk = {
  indices: [0],
  entries: [{ word: "test", definition: "a test word", parts: [] }],
};

function mockFetchSuccess() {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url === "/data/chunks/manifest.json") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifest) });
      }
      if (url === "/data/roots-index.json") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockRoots) });
      }
      if (url === "/data/chunks/chunk-hot.json") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockChunk) });
      }
      return Promise.resolve({ ok: false, status: 404 });
    })
  );
}

function mockFetchFail() {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve({ ok: false, status: 500 }))
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("loadSearchIndex", () => {
  it("loads and returns search index from fetch", async () => {
    mockFetchSuccess();
    const { loadSearchIndex } = await import("@/lib/data-loader");
    const index = await loadSearchIndex();
    expect(index.data.length).toBe(1);
    expect(index.data[0].word).toBe("test");
    expect(index.rootIndex).toEqual(mockRoots);
    expect(index.wordSorted.length).toBe(1);
  });

  it("returns cached index on second call", async () => {
    mockFetchSuccess();
    const { loadSearchIndex } = await import("@/lib/data-loader");
    const first = await loadSearchIndex();
    const second = await loadSearchIndex();
    expect(second).toBe(first);
  });

  it("throws on fetch failure", async () => {
    mockFetchFail();
    const { loadSearchIndex } = await import("@/lib/data-loader");
    await expect(loadSearchIndex()).rejects.toThrow("Failed to fetch");
  });

  it("deduplicates concurrent load calls", async () => {
    mockFetchSuccess();
    const { loadSearchIndex } = await import("@/lib/data-loader");
    const [a, b] = await Promise.all([loadSearchIndex(), loadSearchIndex()]);
    expect(a).toBe(b);
  });
});

describe("getCachedIndex", () => {
  it("returns null before any load", async () => {
    const { getCachedIndex } = await import("@/lib/data-loader");
    expect(getCachedIndex()).toBeNull();
  });

  it("returns cached index after load", async () => {
    mockFetchSuccess();
    const { loadSearchIndex, getCachedIndex } = await import("@/lib/data-loader");
    await loadSearchIndex();
    const cached = getCachedIndex();
    expect(cached).not.toBeNull();
    expect(cached!.data[0].word).toBe("test");
  });
});

describe("loadChunk", () => {
  it("loads a chunk level successfully", async () => {
    mockFetchSuccess();
    const { loadSearchIndex, loadChunk, getLoadedChunkLevels } = await import("@/lib/data-loader");
    await loadSearchIndex();
    await loadChunk("hot");
    expect(getLoadedChunkLevels()).toContain("hot");
  });

  it("re-loading the same chunk does not throw", async () => {
    mockFetchSuccess();
    const { loadSearchIndex, loadChunk } = await import("@/lib/data-loader");
    await loadSearchIndex();
    await loadChunk("hot");
    await expect(loadChunk("hot")).resolves.toBeUndefined();
  });

  it("getLoadedChunkLevels returns loaded levels", async () => {
    mockFetchSuccess();
    const { loadSearchIndex, getLoadedChunkLevels } = await import("@/lib/data-loader");
    expect(getLoadedChunkLevels().size).toBe(0);
    await loadSearchIndex();
    expect(getLoadedChunkLevels()).toContain("hot");
  });
});

describe("ensureChunksForRoots", () => {
  it("loads the chunk for a specified root", async () => {
    mockFetchSuccess();
    const { loadSearchIndex, ensureChunksForRoots, getLoadedChunkLevels } = await import("@/lib/data-loader");
    await loadSearchIndex();
    await ensureChunksForRoots(["test"]);
    expect(getLoadedChunkLevels()).toContain("hot");
  });

  it("does not throw for non-existent roots", async () => {
    mockFetchSuccess();
    const { loadSearchIndex, ensureChunksForRoots } = await import("@/lib/data-loader");
    await loadSearchIndex();
    await expect(ensureChunksForRoots(["nonexistent"])).resolves.toBeUndefined();
  });
});

describe("index building", () => {
  it("getCachedIndex is non-null after loadSearchIndex", async () => {
    mockFetchSuccess();
    const { loadSearchIndex, getCachedIndex } = await import("@/lib/data-loader");
    await loadSearchIndex();
    expect(getCachedIndex()).not.toBeNull();
  });

  it("SearchIndex contains all required fields", async () => {
    mockFetchSuccess();
    const { loadSearchIndex, getCachedIndex } = await import("@/lib/data-loader");
    await loadSearchIndex();
    const index = getCachedIndex()!;
    expect(index.data).toBeDefined();
    expect(index.rootIndex).toBeDefined();
    expect(index.wordSorted).toBeDefined();
    expect(index.prefixIndex).toBeDefined();
    expect(index.suffixIndex).toBeDefined();
  });

  it("prefixIndex and suffixIndex are built from entry parts", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === "/data/chunks/manifest.json") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ hot: { roots: ["test"], count: 1 } }) });
      }
      if (url === "/data/roots-index.json") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ test: { m: "test", w: [0] } }) });
      }
      if (url === "/data/chunks/chunk-hot.json") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            indices: [0],
            entries: [{
              word: "preview",
              definition: "see before",
              parts: [
                { type: "prefix", text: "pre-", meaning: "before", decomposed: true },
                { type: "suffix", text: "-view", meaning: "see", decomposed: true },
              ],
            }],
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { loadSearchIndex, getCachedIndex } = await import("@/lib/data-loader");
    await loadSearchIndex();
    const index = getCachedIndex()!;
    expect(index.prefixIndex["pre-"]).toBe("before");
    expect(index.suffixIndex["-view"]).toBe("see");
  });
});

describe("error handling", () => {
  it("throws when fetch fails", async () => {
    mockFetchFail();
    const { loadSearchIndex } = await import("@/lib/data-loader");
    await expect(loadSearchIndex()).rejects.toThrow("Failed to fetch");
  });

  it("can retry after a failed load", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockImplementation((url: string) => {
        if (url === "/data/chunks/manifest.json") {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ hot: { roots: ["test"], count: 1 } }) });
        }
        if (url === "/data/roots-index.json") {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ test: { m: "test", w: [0] } }) });
        }
        if (url === "/data/chunks/chunk-hot.json") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ indices: [0], entries: [{ word: "test", definition: "a test word", parts: [] }] }),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });
    vi.stubGlobal("fetch", fetchMock);
    const { loadSearchIndex } = await import("@/lib/data-loader");
    await expect(loadSearchIndex()).rejects.toThrow();
    await expect(loadSearchIndex()).resolves.toBeDefined();
  });
});
