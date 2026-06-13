import type { VocabEntry, RootIndex, SearchIndex } from "./types";

interface ChunkFile {
  indices: number[];
  entries: VocabEntry[];
}

interface Manifest {
  [level: string]: { roots: string[]; count: number };
}

const CHUNK_LEVELS = ["hot", "warm", "cool", "cold"] as const;
export type ChunkLevel = (typeof CHUNK_LEVELS)[number];

let manifest: Manifest | null = null;
let rootIndex: RootIndex | null = null;
let allData: (VocabEntry | null)[] = [];
let totalWords = 0;
const loadedChunks = new Set<ChunkLevel>();
const loadingChunks = new Map<ChunkLevel, Promise<void>>();

let cachedIndex: SearchIndex | null = null;
let initialLoadPromise: Promise<SearchIndex> | null = null;

function buildWordSorted(data: (VocabEntry | null)[]): { w: string; i: number }[] {
  const result: { w: string; i: number }[] = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i]) {
      result.push({ w: data[i]!.word.toLowerCase(), i });
    }
  }
  result.sort((a, b) => a.w.localeCompare(b.w));
  return result;
}

function buildPrefixIndex(data: (VocabEntry | null)[]): Record<string, string> {
  const index: Record<string, string> = {};
  for (const entry of data) {
    if (!entry) continue;
    for (const part of entry.parts) {
      if (part.type === "prefix" && !index[part.text]) {
        index[part.text] = part.meaning;
      }
    }
  }
  return index;
}

function buildSuffixIndex(data: (VocabEntry | null)[]): Record<string, string> {
  const index: Record<string, string> = {};
  for (const entry of data) {
    if (!entry) continue;
    for (const part of entry.parts) {
      if (part.type === "suffix" && !index[part.text]) {
        index[part.text] = part.meaning;
      }
    }
  }
  return index;
}

function buildPrefixSuffixIndices(data: (VocabEntry | null)[]): [Record<string, string>, Record<string, string>] {
  const prefixMap: Record<string, string> = {};
  const suffixMap: Record<string, string> = {};
  for (const entry of data) {
    if (!entry) continue;
    for (const part of entry.parts) {
      if (part.type === "prefix" && !prefixMap[part.text]) prefixMap[part.text] = part.meaning;
      if (part.type === "suffix" && !suffixMap[part.text]) suffixMap[part.text] = part.meaning;
    }
  }
  return [prefixMap, suffixMap];
}

function rebuildIndex() {
  if (!rootIndex) return;
  const [prefixIndex, suffixIndex] = buildPrefixSuffixIndices(allData);
  cachedIndex = {
    data: allData as VocabEntry[],
    rootIndex,
    wordSorted: buildWordSorted(allData),
    prefixIndex,
    suffixIndex,
  };
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

async function loadChunkFile(level: ChunkLevel): Promise<void> {
  if (loadedChunks.has(level)) return;
  if (loadingChunks.has(level)) return loadingChunks.get(level)!;

  const promise = (async () => {
    const chunk: ChunkFile = await fetchJSON(`/data/chunks/chunk-${level}.json`);
    for (let i = 0; i < chunk.indices.length; i++) {
      allData[chunk.indices[i]] = chunk.entries[i];
    }
    loadedChunks.add(level);
    rebuildIndex();
  })();

  loadingChunks.set(level, promise);
  await promise;
  loadingChunks.delete(level);
}

export function getLoadedIndices(): number[] {
  const result: number[] = [];
  for (let i = 0; i < allData.length; i++) {
    if (allData[i] !== null) result.push(i);
  }
  return result;
}

export function isIndexLoaded(idx: number): boolean {
  return idx >= 0 && idx < allData.length && allData[idx] !== null;
}

export async function loadChunk(level: ChunkLevel): Promise<void> {
  await loadChunkFile(level);
}

export function getRootChunkLevel(rootText: string): ChunkLevel | null {
  if (!manifest) return null;
  for (const level of CHUNK_LEVELS) {
    if (manifest[level]?.roots.includes(rootText)) return level;
  }
  return null;
}

export async function ensureChunksForRoots(rootTexts: string[]): Promise<void> {
  const needed = new Set<ChunkLevel>();
  for (const root of rootTexts) {
    const level = getRootChunkLevel(root);
    if (level && !loadedChunks.has(level)) needed.add(level);
  }
  await Promise.all([...needed].map(loadChunkFile));
}

export async function loadSearchIndex(): Promise<SearchIndex> {
  if (cachedIndex) return cachedIndex;
  if (initialLoadPromise) return initialLoadPromise;

  initialLoadPromise = (async () => {
    try {
      const [m, ri] = await Promise.all([
        fetchJSON<Manifest>("/data/chunks/manifest.json"),
        fetchJSON<RootIndex>("/data/roots-index.json"),
      ]);
      manifest = m;
      rootIndex = ri;

      totalWords = Object.values(m).reduce((sum, c) => sum + c.count, 0);
      allData = new Array(totalWords).fill(null);

      await loadChunkFile("hot");
      return cachedIndex!;
    } catch (e) {
      initialLoadPromise = null;
      throw e;
    }
  })();

  return initialLoadPromise;
}

export function getCachedIndex(): SearchIndex | null {
  return cachedIndex;
}

export function getLoadedChunkLevels(): Set<ChunkLevel> {
  return new Set(loadedChunks);
}
