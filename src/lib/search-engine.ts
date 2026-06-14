import type { SearchIndex } from "./types";

export function executeSearch(
  index: SearchIndex,
  query: string,
  activeRoot: string | null
): number[] {
  if (activeRoot) {
    return index.rootIndex[activeRoot]?.w.filter(i => i < index.data.length) ?? [];
  }

  const q = query.trim().toLowerCase();
  if (!q) return index.data.map((_, i) => i);

  const results: number[] = [];
  for (let i = 0; i < index.data.length; i++) {
    if (index.data[i].word.toLowerCase().startsWith(q)) results.push(i);
  }

  for (const rootText in index.rootIndex) {
    if (rootText.includes(q)) {
      for (const idx of index.rootIndex[rootText].w) {
        if (!results.includes(idx)) results.push(idx);
      }
    }
  }

  return results;
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
