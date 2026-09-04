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
