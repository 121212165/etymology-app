// etymonline 词源交叉校验逻辑（纯函数，不做 I/O）
//
// 数据：.cache/etymonline-index.json（yosevu/etymonline 抓取的 etymonline.com 镜像，
// 46000+ 词条，条目为 { word, etymology, years[] }，etymology 为英文词源叙述文本）。
// 与 etymwn/wiktionary 两路（结构化词源关系图）不同，本源是**叙述文本**：
// 证据来自 etymonline.ts 的 extractGlossSegments 抽取 (形态, gloss, 语言) 三元组。
//
// 本路的独特价值：唯一携带英文 gloss 的源，可用 meaning-bridge 做「中文词根义 ↔
// 英文语素义」机判（match/mismatch），其余两路如实 unverified。
//
// 判定标准与另两路对齐（三源可比，合入同一报告）：
// - confirmed：古典语（拉丁/希腊/PIE）强度≥2 形态命中 ≥1，或罗曼语（法语/西语等
//   传播路径）强度≥2 命中 ≥2（计数按「语言+归一形态」去重）；
// - conflict：无任何强度≥2 命中，且词源文本只提及日耳曼语源、完全不提古典/罗曼语言
//   ——叙述文本没有结构化谱系链，该规则是启发式（另两路是结构化判定），methodNotes 注明；
// - 词条未收录（etymonline 无该词）不算 conflict，如实 not_found 并在 detail 注明。

import type { RootCheckResult, RootEntry, VocabEntryLike, WordCheckResult, XStatus } from './types'
import type { FormMatchStrength } from './normalize'
import { normalizeForm, rootForms } from './normalize'
import {
  buildEtymonlineWordMap,
  findGlossEvidence,
  isLatinGreekLangName,
  selectBestGlossHit,
  type EtymonlineEntry,
  type GlossHit,
} from './etymonline'
import { verdictMeaning } from './meaning-bridge'
import { pickSampleWords, type SampledWord } from './sampling'

/** 形态证据的最低强度（与另两路一致：≥2 才算证据） */
export const MIN_EVIDENCE_STRENGTH: FormMatchStrength = 2

/** 罗曼语命中达到该数量时可作为拉丁词源的间接证据（与另两路一致） */
export const ROMANCE_CONFIRM_COUNT = 2

/** etymonline 语言名 → 罗曼语（拉丁的传播路径，间接证据） */
const ROMANCE_LANGNAMES = new Set([
  'Anglo-French', 'Old French', 'Middle French', 'French',
  'Old Spanish', 'Spanish', 'Italian', 'Catalan', 'Portuguese', 'Romanian',
])

/** etymonline 语言名 → 日耳曼语族（conflict 启发式的依据） */
const GERMANIC_LANGNAMES = new Set([
  'Old English', 'Middle English', 'Old Norse', 'Old High German',
  'Old Frisian', 'Old Saxon', 'Dutch', 'German',
])

const GERMANIC_MENTION_RE =
  /\bOld English\b|\bMiddle English\b|\bOld Norse\b|\bProto-Germanic\b|\bOld High German\b|\bOld Frisian\b|\bOld Saxon\b|\bDutch\b|\bGerman\b/
const CLASSICAL_MENTION_RE = /\bLatin\b|\bGreek\b|\bPIE\b|\bProto-Indo-European\b/
const ROMANCE_MENTION_RE = /\bFrench\b|\bSpanish\b|\bItalian\b|\bPortuguese\b|\bCatalan\b|\bRomanian\b/

export type EtymonlineFamily = 'classical' | 'romance' | 'germanic' | 'other'

export function classifyLangName(name: string): EtymonlineFamily {
  if (isLatinGreekLangName(name)) return 'classical'
  if (ROMANCE_LANGNAMES.has(name)) return 'romance'
  if (GERMANIC_LANGNAMES.has(name)) return 'germanic'
  return 'other'
}

/** 强度≥MIN_EVIDENCE_STRENGTH 的命中（弱命中仅记录不判定，与另两路一致） */
export function strongHits(hits: GlossHit[]): GlossHit[] {
  return hits.filter((h) => h.strength >= MIN_EVIDENCE_STRENGTH)
}


/** 单个抽样词的查证输入：etymonline 词条（缺省=未收录） */
export interface WordEvidence {
  sample: SampledWord
  strong: GlossHit[]
  anyStrong: boolean
  present: boolean
  bestGloss: string | undefined
  /** 词源叙述原文（conflict 启发式与 detail 截断用；不进产物） */
  entry: EtymonlineEntry | undefined
}

/** 单词级判定：词源文本证据 → WordCheckResult */
function wordResult(root: RootEntry, ev: WordEvidence): WordCheckResult {
  const { sample, strong, present } = ev
  const hasClassical = strong.some((h) => classifyLangName(h.language) === 'classical')
  const romanceCount = strong.filter((h) => classifyLangName(h.language) === 'romance').length
  const germanicOnly =
    present && strong.length === 0 &&
    GERMANIC_MENTION_RE.test(evTextOf(ev)) &&
    !CLASSICAL_MENTION_RE.test(evTextOf(ev)) &&
    !ROMANCE_MENTION_RE.test(evTextOf(ev))

  let status: XStatus = 'not_found'
  if (!present) {
    status = 'not_found' // 未收录不算反证，如实不判
  } else if (hasClassical || romanceCount >= ROMANCE_CONFIRM_COUNT) {
    status = 'confirmed'
  } else if (germanicOnly) {
    status = 'conflict'
  }

  let detail: string
  if (!present) {
    detail = `etymonline 未收录 ${sample.word}，无词源叙述可查`
  } else if (status === 'confirmed') {
    detail = strong
      .slice(0, 2)
      .map((h) => `${sample.word}: ${h.form} "${h.gloss}"（${h.language}），强度${h.strength}`)
      .join('；')
  } else if (status === 'conflict') {
    detail = `无词根形态命中；词源叙述仅提及日耳曼语源：${evTextOf(ev).slice(0, 120)}`
  } else {
    detail =
      `无强度≥2 命中；词源叙述${CLASSICAL_MENTION_RE.test(evTextOf(ev)) || ROMANCE_MENTION_RE.test(evTextOf(ev)) ? '提及古典/罗曼语言但形态不符' : '无可匹配的形态-释义片段'}：${evTextOf(ev).slice(0, 120)}`
  }

  return {
    word: sample.word,
    root: root.primaryText,
    status,
    detail,
    meaningVerdict: verdictMeaning(root.primaryText, ev.bestGloss),
    ...(ev.bestGloss ? { gloss: ev.bestGloss } : {}),
  }
}

// WordEvidence 携带原文以便 conflict 启发式与 detail 截断；不进产物
function evTextOf(ev: WordEvidence): string {
  return ev.entry?.etymology ?? ''
}

/** 从一次查证构造 WordEvidence（供 wordResult 与聚合共用） */
export function inspectWord(
  root: RootEntry,
  sample: SampledWord,
  entry: EtymonlineEntry | undefined,
): WordEvidence {
  const hits = entry ? findGlossEvidence(entry.etymology, rootForms(root.primaryText, root.aliases)) : []
  const strong = strongHits(hits)
  const best = selectBestGlossHit(hits)
  return { sample, strong, anyStrong: hits.length > 0, present: !!entry, bestGloss: best?.gloss, entry }
}

/** 词根级证据（跨抽样词按 语言+归一形态 去重，取前 max 条） */
function topEvidence(entries: WordEvidence[], max: number): string {
  const seen = new Set<string>()
  const out: string[] = []
  for (const ev of entries) {
    for (const h of ev.strong) {
      const key = `${h.language}:${normalizeForm(h.form)}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(`经由 ${ev.sample.word}：${h.form} "${h.gloss}"（${h.language}），强度${h.strength}`)
      if (out.length >= max) return out.join('；')
    }
  }
  return out.join('；')
}

export interface RootCheckOutput {
  root: RootCheckResult
  words: WordCheckResult[]
}

/**
 * 单词根校验：抽样词（pickSampleWords ≤2 个）在 etymonline 的词源叙述 → 词根级 + 词级结论。
 * entryMap 由运行器/测试方提供（buildEtymonlineWordMap 的产物）。
 */
export function checkRootEtymonline(
  root: RootEntry,
  vocab: VocabEntryLike[],
  entryMap: Map<string, EtymonlineEntry>,
): RootCheckOutput {
  const samples = pickSampleWords(root, vocab, 2)
  const words: WordCheckResult[] = []
  const perWord: WordEvidence[] = []
  for (const sample of samples) {
    const ev = inspectWord(root, sample, entryMap.get(sample.word.toLowerCase()))
    perWord.push(ev)
    words.push(wordResult(root, ev))
  }

  // 词根级聚合计数（按 语言+归一形态 去重，与另两路一致）
  const classicalKeys = new Set<string>()
  const romanceKeys = new Set<string>()
  for (const ev of perWord) {
    for (const h of ev.strong) {
      const fam = classifyLangName(h.language)
      if (fam !== 'classical' && fam !== 'romance') continue
      const key = `${h.language}:${normalizeForm(h.form)}`
      if (fam === 'classical') classicalKeys.add(key)
      else romanceKeys.add(key)
    }
  }
  const classicalHits = classicalKeys.size
  const romanceHits = romanceKeys.size

  let status: XStatus
  if (classicalHits >= 1 || romanceHits >= ROMANCE_CONFIRM_COUNT) status = 'confirmed'
  else if (words.length > 0 && words.every((w) => w.status === 'conflict')) status = 'conflict'
  else status = 'not_found'

  const rootResult: RootCheckResult = {
    text: root.primaryText,
    layer: root.layer,
    meaning: root.meaning,
    status,
    evidence: '',
    source: status === 'not_found' ? '' : 'etymonline',
    classicalHits,
    romanceHits,
    nonClassicalEvidence: [],
    sampledWords: samples.length,
  }

  if (status === 'confirmed') {
    rootResult.evidence = topEvidence(perWord, 3)
  } else if (status === 'conflict') {
    rootResult.evidence = words
      .filter((w) => w.status === 'conflict')
      .map((w) => w.detail)
      .slice(0, 3)
      .join('；')
    rootResult.nonClassicalEvidence = words
      .filter((w) => w.status === 'conflict')
      .map((w) => w.word)
  }
  return { root: rootResult, words }
}

/** 运行器/测试共用：从词条数组建映射（词小写键；同词取首个，确定性） */
export function mapEntries(entries: EtymonlineEntry[]): Map<string, EtymonlineEntry> {
  return buildEtymonlineWordMap(entries)
}

