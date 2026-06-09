export interface VocabPart {
  type: "prefix" | "root" | "suffix";
  text: string;
  meaning: string;
  decomposed: boolean;
}

export interface VocabEntry {
  word: string;
  definition: string;
  parts: VocabPart[];
  source?: string;
}

export interface RootIndexEntry {
  m: string; // meaning
  w: number[]; // word indices in VOCAB_DATA
}

export type RootIndex = Record<string, RootIndexEntry>;

export interface SidebarRoot {
  t: string; // text
  m: string; // meaning
  c: number; // count
}

export interface SearchIndex {
  data: VocabEntry[];
  rootIndex: RootIndex;
  wordSorted: { w: string; i: number }[];
}

export type ViewMode = "list" | "flashcard" | "stats";
export type LearnStatus = "new" | "learning" | "learned";
