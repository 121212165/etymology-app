import type { VocabEntry, RootIndex, SearchIndex, SidebarGroup } from "./types";
import { MIN_SEARCH_LEN } from "./constants";
import { ROOT_GROUPS } from "./root-groups";

/** Binary search: find first index where arr[i].w >= target */
function lowerBound(
  arr: { w: string; i: number }[],
  target: string
): number {
  let lo = 0,
    hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid].w < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Three-level search engine:
 * 1. Binary prefix search on wordSorted
 * 2. Root inverted index lookup
 * 3. Full-text scan on definitions
 */
export function executeSearch(
  index: SearchIndex,
  query: string,
  activeRoot: string | null
): number[] {
  const results = new Set<number>();
  const q = query.trim().toLowerCase();

  // If active root is set, show only words with that root
  if (activeRoot) {
    const entry = index.rootIndex[activeRoot];
    if (entry) return entry.w;
    return [];
  }

  if (!q) {
    return index.data.map((_, i) => i);
  }

  // Level 1: Binary prefix search on words
  const start = lowerBound(index.wordSorted, q);
  for (let k = start; k < index.wordSorted.length; k++) {
    if (!index.wordSorted[k].w.startsWith(q)) break;
    results.add(index.wordSorted[k].i);
  }

  // Level 2: Root inverted index match
  for (const rootText in index.rootIndex) {
    if (rootText.includes(q)) {
      const entry = index.rootIndex[rootText];
      for (const idx of entry.w) results.add(idx);
    }
  }

  // Level 3: Full definition scan (only for queries >= MIN_SEARCH_LEN)
  if (q.length >= MIN_SEARCH_LEN) {
    for (let i = 0; i < index.data.length; i++) {
      const item = index.data[i];
      if (
        item.definition.toLowerCase().includes(q) ||
        item.word.toLowerCase().includes(q)
      ) {
        results.add(i);
      }
    }
  }

  return Array.from(results);
}

/** Build word sorted index from data */
export function buildWordSorted(data: VocabEntry[]): { w: string; i: number }[] {
  return data
    .map((entry, i) => ({ w: entry.word.toLowerCase(), i }))
    .sort((a, b) => a.w.localeCompare(b.w));
}

/** Build root inverted index from data */
export function buildRootIndex(data: VocabEntry[]): RootIndex {
  const rootMap: Record<string, { m: string; w: number[] }> = {};

  for (let i = 0; i < data.length; i++) {
    for (const part of data[i].parts) {
      if (part.type === "root") {
        const key = part.text;
        if (!rootMap[key]) rootMap[key] = { m: "", w: [] };
        if (!rootMap[key].m) rootMap[key].m = part.meaning;
        rootMap[key].w.push(i);
      }
    }
  }

  // Filter: only roots with >= 2 occurrences
  const filtered: RootIndex = {};
  for (const [key, val] of Object.entries(rootMap)) {
    if (val.w.length >= 2) filtered[key] = val;
  }
  return filtered;
}

/** Build sidebar data from root index */
export function buildSidebarData(
  rootIndex: RootIndex
): { t: string; m: string; c: number }[] {
  return Object.entries(rootIndex)
    .map(([t, v]) => ({ t, m: v.m, c: v.w.length }))
    .sort((a, b) => b.c - a.c);
}

/** Build grouped sidebar data from root index */
export function buildSidebarGroups(rootIndex: RootIndex): SidebarGroup[] {
  const assigned = new Set<string>();
  const groups: SidebarGroup[] = [];

  for (const group of ROOT_GROUPS) {
    const roots = group.members
      .filter((key) => rootIndex[key] !== undefined)
      .map((key) => {
        assigned.add(key);
        return { t: key, m: rootIndex[key].m, c: rootIndex[key].w.length };
      })
      .sort((a, b) => b.c - a.c);

    if (roots.length > 0) {
      groups.push({ label: group.label, icon: group.icon, roots });
    }
  }

  // Collect ungrouped roots into "其他"
  const otherRoots: { t: string; m: string; c: number }[] = [];
  for (const key in rootIndex) {
    if (!assigned.has(key)) {
      otherRoots.push({ t: key, m: rootIndex[key].m, c: rootIndex[key].w.length });
    }
  }
  otherRoots.sort((a, b) => b.c - a.c);
  if (otherRoots.length > 0) {
    groups.push({ label: "其他", icon: "more", roots: otherRoots });
  }

  return groups;
}
