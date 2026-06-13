import type { VocabEntry, RootIndex, SearchIndex, SidebarGroup } from "./types";
import { getLoadedIndices, isIndexLoaded } from "./data-loader";
import { ROOT_GROUPS } from "./root-groups";

export function lowerBound(
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

export function executeSearch(
  index: SearchIndex,
  query: string,
  activeRoot: string | null
): number[] {
  const results = new Set<number>();
  const q = query.trim().toLowerCase();

  if (activeRoot) {
    const entry = index.rootIndex[activeRoot];
    if (entry) {
      for (const idx of entry.w) {
        if (isIndexLoaded(idx)) results.add(idx);
      }
    }
    return Array.from(results);
  }

  if (!q) {
    return getLoadedIndices();
  }

  if (index.wordSorted.length === 0) return [];

  const start = lowerBound(index.wordSorted, q);
  for (let k = start; k < index.wordSorted.length; k++) {
    if (!index.wordSorted[k].w.startsWith(q)) break;
    results.add(index.wordSorted[k].i);
  }

  if (results.size === index.data.length) return Array.from(results);

  for (const rootText in index.rootIndex) {
    if (rootText.includes(q)) {
      const entry = index.rootIndex[rootText];
      for (const idx of entry.w) {
        if (isIndexLoaded(idx)) results.add(idx);
      }
    }
  }

  return Array.from(results);
}

export interface MorphemeMatch {
  type: "prefix" | "root" | "suffix";
  text: string;
  meaning: string;
}

export interface DecomposeResult {
  prefix?: MorphemeMatch;
  root?: MorphemeMatch;
  suffix?: MorphemeMatch;
  matched: boolean;
}

export function quickDecompose(
  index: SearchIndex,
  query: string
): DecomposeResult {
  const q = query.trim().toLowerCase();
  const result: DecomposeResult = { matched: false };

  for (const rootText in index.rootIndex) {
    const rt = rootText.toLowerCase();
    if (rt.includes(q) || q.includes(rt)) {
      result.root = { type: "root", text: rootText, meaning: index.rootIndex[rootText].m };
      result.matched = true;
      break;
    }
  }

  if (!result.matched) {
    for (const [text, meaning] of Object.entries(index.prefixIndex)) {
      const t = text.toLowerCase();
      if (t.includes(q) || q.includes(t)) {
        result.prefix = { type: "prefix", text, meaning };
        result.matched = true;
        break;
      }
    }
  }

  if (!result.matched) {
    for (const [text, meaning] of Object.entries(index.suffixIndex)) {
      const t = text.toLowerCase();
      if (t.includes(q) || q.includes(t)) {
        result.suffix = { type: "suffix", text, meaning };
        result.matched = true;
        break;
      }
    }
  }

  return result;
}

export function buildWordSorted(data: VocabEntry[]): { w: string; i: number }[] {
  return data
    .map((entry, i) => ({ w: entry.word.toLowerCase(), i }))
    .sort((a, b) => a.w.localeCompare(b.w));
}

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

  const filtered: RootIndex = {};
  for (const [key, val] of Object.entries(rootMap)) {
    if (val.w.length >= 2) filtered[key] = val;
  }
  return filtered;
}

export function buildSidebarGroups(rootIndex: RootIndex): SidebarGroup[] {
  const rootKeys = Object.keys(rootIndex);
  const assigned = new Set<string>();
  const groups: SidebarGroup[] = [];

  for (const def of ROOT_GROUPS) {
    const roots = def.members
      .filter((m) => m in rootIndex && !assigned.has(m))
      .map((m) => {
        assigned.add(m);
        return { t: m, m: rootIndex[m].m, c: rootIndex[m].w.length };
      })
      .sort((a, b) => b.c - a.c);
    if (roots.length > 0) {
      groups.push({ label: def.label, icon: def.icon, roots });
    }
  }

  const ungrouped = rootKeys
    .filter((k) => !assigned.has(k))
    .map((k) => ({ t: k, m: rootIndex[k].m, c: rootIndex[k].w.length }))
    .sort((a, b) => b.c - a.c);
  if (ungrouped.length > 0) {
    groups.push({ label: "其他", icon: "misc", roots: ungrouped });
  }

  return groups;
}

export function buildSidebarData(
  rootIndex: RootIndex
): { t: string; m: string; c: number }[] {
  return Object.entries(rootIndex)
    .map(([t, v]) => ({ t, m: v.m, c: v.w.length }))
    .sort((a, b) => b.c - a.c);
}
