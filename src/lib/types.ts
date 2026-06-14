export interface VocabPart {
  type: "prefix" | "root" | "suffix";
  text: string;
  meaning: string;
}

export interface VocabEntry {
  word: string;
  definition: string;
  parts: VocabPart[];
}

export interface RootIndexEntry {
  m: string;
  w: number[];
}

export type RootIndex = Record<string, RootIndexEntry>;

export interface SearchIndex {
  data: VocabEntry[];
  rootIndex: RootIndex;
  prefixIndex: Record<string, string>;
  suffixIndex: Record<string, string>;
}
