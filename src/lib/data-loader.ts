import type { VocabEntry, RootIndex, SearchIndex } from "./types";

let cachedIndex: SearchIndex | null = null;
let loadingPromise: Promise<SearchIndex> | null = null;

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

export async function loadSearchIndex(): Promise<SearchIndex> {
  if (cachedIndex) return cachedIndex;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const [data, rootIndex] = await Promise.all([
      fetchJSON<VocabEntry[]>("/data/vocab.json"),
      fetchJSON<RootIndex>("/data/roots-index.json"),
    ]);

    const wordSorted = data
      .map((entry, i) => ({ w: entry.word.toLowerCase(), i }))
      .sort((a, b) => a.w.localeCompare(b.w));

    cachedIndex = { data, rootIndex, wordSorted };
    return cachedIndex;
  })();

  return loadingPromise;
}

export function getCachedIndex(): SearchIndex | null {
  return cachedIndex;
}
