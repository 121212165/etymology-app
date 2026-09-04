"use server";

import type { VocabEntry, RootIndex } from "@/lib/types";
import { readFileSync } from "fs";
import { join } from "path";

interface DecomposePart {
  type: "prefix" | "root" | "suffix";
  text: string;
  meaning: string;
}

interface DecomposeResult {
  word: string;
  parts: DecomposePart[];
  confidence: number;
  family: string[];
  etymology: string;
}

const PREFIXES: [string, string][] = [
  ["un", "不，非"],
  ["re", "再，重新"],
  ["in", "不，进入"],
  ["im", "不，进入"],
  ["dis", "不，分离"],
  ["en", "使成为"],
  ["em", "使成为"],
  ["non", "非"],
  ["pre", "前，预先"],
  ["pro", "向前，赞成"],
  ["ex", "出，前"],
  ["sub", "下，次"],
  ["super", "超，上"],
  ["trans", "跨越"],
  ["inter", "在...之间"],
  ["mis", "错误"],
  ["over", "过度"],
  ["under", "不足"],
  ["out", "出，外"],
  ["up", "向上"],
  ["down", "向下"],
  ["fore", "前，预先"],
  ["self", "自我"],
  ["semi", "半"],
  ["anti", "反对"],
  ["auto", "自动"],
  ["bi", "二，双"],
  ["co", "共同"],
  ["con", "共同"],
  ["com", "共同"],
  ["de", "向下，去除"],
  ["di", "二，分离"],
  ["dif", "分离"],
  ["il", "不"],
  ["ir", "不"],
  ["macro", "大"],
  ["micro", "小"],
  ["mid", "中"],
  ["mini", "小"],
  ["mono", "单一"],
  ["multi", "多"],
  ["neo", "新"],
  ["omni", "全"],
  ["para", "旁，类似"],
  ["poly", "多"],
  ["post", "后"],
  ["pseudo", "假"],
  ["re", "再"],
  ["retro", "回，向后"],
  ["tri", "三"],
  ["uni", "一"],
  ["vice", "副"],
];

const SUFFIXES: [string, string][] = [
  ["tion", "行为，状态"],
  ["sion", "行为，状态"],
  ["ment", "行为，结果"],
  ["ness", "性质，状态"],
  ["ity", "性质"],
  ["ance", "性质，状态"],
  ["ence", "性质，状态"],
  ["able", "能够...的"],
  ["ible", "能够...的"],
  ["ful", "充满...的"],
  ["less", "无...的"],
  ["ous", "充满...的"],
  ["ious", "充满...的"],
  ["ive", "倾向于...的"],
  ["ative", "倾向于...的"],
  ["itive", "倾向于...的"],
  ["al", "...的"],
  ["ial", "...的"],
  ["ual", "...的"],
  ["ical", "...的"],
  ["ist", "做...的人"],
  ["ism", "主义，学说"],
  ["er", "做...的人"],
  ["or", "做...的人"],
  ["ar", "做...的人"],
  ["eer", "做...的人"],
  ["ier", "做...的人"],
  ["ee", "被...的人"],
  ["ant", "做...的人"],
  ["ent", "做...的人"],
  ["dom", "领域，状态"],
  ["ship", "身份，关系"],
  ["hood", "身份，状态"],
  ["age", "行为，状态"],
  ["ure", "行为，结果"],
  ["ence", "行为，状态"],
  ["ling", "小"],
  ["let", "小"],
  ["ette", "小"],
  ["fy", "使...化"],
  ["ify", "使...化"],
  ["ize", "使...化"],
  ["ise", "使...化"],
  ["ly", "...地"],
  ["ward", "向..."],
  ["wise", "以...方式"],
  ["teen", "十"],
  ["ty", "十"],
  ["th", "第..."],
  ["en", "使成为"],
  ["ish", "略带...的"],
  ["esque", "...风格的"],
];

let vocabCache: VocabEntry[] | null = null;
let rootIndexCache: RootIndex | null = null;

function loadVocab(): VocabEntry[] {
  if (vocabCache) return vocabCache;
  const filePath = join(process.cwd(), "public", "data", "vocab.json");
  vocabCache = JSON.parse(readFileSync(filePath, "utf-8"));
  return vocabCache!;
}

function loadRootIndex(): RootIndex {
  if (rootIndexCache) return rootIndexCache;
  const filePath = join(process.cwd(), "public", "data", "roots-index.json");
  rootIndexCache = JSON.parse(readFileSync(filePath, "utf-8"));
  return rootIndexCache!;
}

function stripPrefix(word: string): { prefix: [string, string] | null; rest: string } {
  const sorted = [...PREFIXES].sort((a, b) => b[0].length - a[0].length);
  for (const [text, meaning] of sorted) {
    if (word.length > text.length + 2 && word.startsWith(text)) {
      const rest = word.slice(text.length);
      if (rest.length >= 3) {
        return { prefix: [text, meaning], rest };
      }
    }
  }
  return { prefix: null, rest: word };
}

function stripSuffix(word: string): { suffix: [string, string] | null; rest: string } {
  const sorted = [...SUFFIXES].sort((a, b) => b[0].length - a[0].length);
  for (const [text, meaning] of sorted) {
    if (word.length > text.length + 2 && word.endsWith(text)) {
      const rest = word.slice(0, -text.length);
      if (rest.length >= 2) {
        return { suffix: [text, meaning], rest };
      }
    }
  }
  return { suffix: null, rest: word };
}

function findRootMatch(
  stem: string,
  rootIndex: RootIndex
): [string, string] | null {
  const sortedRoots = Object.entries(rootIndex).sort(
    (a, b) => b[0].length - a[0].length
  );
  for (const [rootText, entry] of sortedRoots) {
    if (stem.includes(rootText) && rootText.length >= 2) {
      return [rootText, entry.m];
    }
  }
  return null;
}

function findFamily(word: string, vocab: VocabEntry[]): string[] {
  const entry = vocab.find((e) => e.word.toLowerCase() === word.toLowerCase());
  if (!entry) return [];
  const roots = entry.parts
    .filter((p) => p.type === "root")
    .map((p) => p.text);
  if (roots.length === 0) return [];
  return vocab
    .filter(
      (e) =>
        e.word.toLowerCase() !== word.toLowerCase() &&
        e.parts.some(
          (p) => p.type === "root" && roots.includes(p.text)
        )
    )
    .slice(0, 12)
    .map((e) => e.word);
}

function buildEtymology(word: string, parts: DecomposePart[]): string {
  if (parts.length === 0) return `${word} 的词源分析暂无数据。`;
  const segments = parts.map((p) => {
    const label = p.type === "prefix" ? "前缀" : p.type === "suffix" ? "后缀" : "词根";
    return `${label} "${p.text}"（${p.meaning}）`;
  });
  return `${word} 由 ${segments.join(" + ")} 构成。`;
}

export async function decompose(word: string): Promise<DecomposeResult> {
  const w = word.toLowerCase().trim();
  const vocab = loadVocab();
  const rootIndex = loadRootIndex();

  const existing = vocab.find((e) => e.word.toLowerCase() === w);
  if (existing) {
    const family = findFamily(w, vocab);
    const parts: DecomposePart[] = existing.parts.map((p) => ({
      type: p.type,
      text: p.text,
      meaning: p.meaning,
    }));
    return {
      word: w,
      parts,
      confidence: 1,
      family,
      etymology: buildEtymology(w, parts),
    };
  }

  const parts: DecomposePart[] = [];
  let confidence = 0.6;

  const { prefix, rest: afterPrefix } = stripPrefix(w);
  if (prefix) {
    parts.push({ type: "prefix", text: prefix[0], meaning: prefix[1] });
    confidence += 0.1;
  }

  const { suffix, rest: stem } = stripSuffix(afterPrefix);
  if (suffix) {
    parts.push({ type: "suffix", text: suffix[0], meaning: suffix[1] });
    confidence += 0.1;
  }

  const rootMatch = findRootMatch(stem, rootIndex);
  if (rootMatch) {
    parts.push({ type: "root", text: rootMatch[0], meaning: rootMatch[1] });
    confidence += 0.15;
  } else if (stem.length >= 3) {
    parts.push({ type: "root", text: stem, meaning: "词根（待确认）"});
    confidence -= 0.15;
  }

  if (parts.length === 0) {
    parts.push({ type: "root", text: w, meaning: "未知词根"});
    confidence = 0.2;
  }

  const family: string[] = [];
  const rootPart = parts.find((p) => p.type === "root");
  if (rootPart) {
    const rootEntry = rootIndex[rootPart.text];
    if (rootEntry) {
      family.push(
        ...rootEntry.w
          .slice(0, 12)
          .map((idx) => vocab[idx]?.word)
          .filter((w2): w2 is string => !!w2 && w2.toLowerCase() !== w)
      );
    }
  }

  return {
    word: w,
    parts,
    confidence: Math.min(Math.max(confidence, 0), 1),
    family,
    etymology: buildEtymology(w, parts),
  };
}
