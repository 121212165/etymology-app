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

export interface SidebarGroup {
  label: string;      // 分组中文名
  icon: string;       // 图标标识
  roots: SidebarRoot[];
}

export interface SearchIndex {
  data: VocabEntry[];
  rootIndex: RootIndex;
  wordSorted: { w: string; i: number }[];
  prefixIndex: Record<string, string>;
  suffixIndex: Record<string, string>;
}

export type ViewMode = "list" | "flashcard" | "stats";

export type LearnStatus = "unseen" | "learning" | "reviewing" | "mastered";

export interface RootProgress {
  status: LearnStatus;
  easeFactor: number;
  interval: number;
  nextReview: string;
  reviewCount: number;
  lastReview: string | null;
  correctStreak: number;
}

export type ProgressMap = Record<string, RootProgress>;
