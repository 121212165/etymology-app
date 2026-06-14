import type { VocabEntry, RootIndex, SearchIndex } from "./types";

let cachedIndex: SearchIndex | null = null;
let initialLoadPromise: Promise<SearchIndex> | null = null;

function buildPrefixSuffixIndices(data: VocabEntry[]): [Record<string, string>, Record<string, string>] {
  const prefixMap: Record<string, string> = {};
  const suffixMap: Record<string, string> = {};
  for (const entry of data) {
    for (const part of entry.parts) {
      if (part.type === "prefix" && !prefixMap[part.text]) prefixMap[part.text] = part.meaning;
      if (part.type === "suffix" && !suffixMap[part.text]) suffixMap[part.text] = part.meaning;
    }
  }
  return [prefixMap, suffixMap];
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

export async function loadSearchIndex(): Promise<SearchIndex> {
  if (cachedIndex) return cachedIndex;
  if (initialLoadPromise) return initialLoadPromise;

  initialLoadPromise = (async () => {
    try {
      const [vocab, rootIndex] = await Promise.all([
        fetchJSON<VocabEntry[]>("/data/vocab.json"),
        fetchJSON<RootIndex>("/data/roots-index.json"),
      ]);
      const [prefixIndex, suffixIndex] = buildPrefixSuffixIndices(vocab);
      cachedIndex = { data: vocab, rootIndex, prefixIndex, suffixIndex };
      return cachedIndex;
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
