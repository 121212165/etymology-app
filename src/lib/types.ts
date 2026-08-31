export interface VocabPart {
  type: "prefix" | "root" | "suffix" | "linker";
  text: string;
  meaning: string;
  /**
   * 词内实际拼写（表面形态）。缺省时表面拼写即 text。
   * 典型场景：同化前缀 offer = of + fer，引用形态为 ob-，surface 为 "of"。
   */
  surface?: string;
}

export interface VocabEntry {
  word: string;
  definition: string;
  parts: VocabPart[];
  /**
   * 解析质量标记。仅在以下情形写为 "low"：
   * 含连接字母（linker）、歧义同化前缀、或 parts 为空。
   */
  parseQuality?: "low";
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
