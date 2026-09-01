// Wiktionary 词源交叉校验逻辑（纯函数，不做 I/O）
//
// 数据：.cache/ety-wiktionary-etymologies.json（英文 Wiktionary 词源数据的开源转码，
// 结构实测：{ [lang]: { [word]: Array<{ [相关形态]: 语言 }> } }，与 etymwn 转码同构，
// 复用 etymwn.ts 的 collectAncestors / parseIndexWords）。
//
// 与 etymwn 转码的关键差异（实测，见 scripts 运行器统计）：
// - 关系有方向：数组条目是「派生词 → 词源词」（eng:vision → lat:visio），BFS 即沿
//   真实词源谱系向上走，不是 etymwn 那种丢掉方向的无向关联；
// - 中间形态词条稀疏（如 lat:visio 无词条、eng 仅 10 万词），抽样词可能未收录，
//   词源链常在 2-3 跳内断掉；
// - 无英文 gloss：meaningVerdict 一律 unverified。
//
// 判定标准与 etymwn 路保持一致（三源可比，合入同一报告）：
// - confirmed：古典语（拉丁/希腊，isClassicalLang 含 p_lat/p_grc）强度≥2 形态命中 ≥1，
//   或罗曼语（fro/frm/fra 等，间接证据）强度≥2 命中 ≥2（计数按「语言+归一形态」去重）；
// - conflict：抽样词祖先全为日耳曼语族（含 p_gem/p_gmw）且无任何古典/罗曼命中
//   ——本数据有方向，日耳曼纯链是真实谱系而非关联噪声；其余无命中一律 not_found；
// - 词条未收录（eng 无该词）不算 conflict，如实 not_found 并在 detail 注明。
//
// 大文件流式读取在 scripts/xcheck-wiktionary.ts（运行器）；本文件只做内存内的判定。

import type { RootCheckResult, RootEntry, VocabEntryLike, WordCheckResult, XStatus } from './types'
import type { FormMatchStrength } from './normalize'
import { isClassicalLang, isRomanceLang, matchStrength, normalizeForm, rootForms } from './normalize'
import type { EtymonHit, EtymwnIndex } from './etymwn'
import { pickSampleWords, type SampledWord } from './sampling'

/** BFS 最大跳数（eng → enm/fro/lat/… 的谱系链一般 ≤4 跳；本源链短，4 为保守上限） */
export const WIKT_MAX_DEPTH = 4

/** 形态证据的最低强度（normalize.matchStrength：≥2 才算证据，弱命中仅记录不判定） */
export const MIN_EVIDENCE_STRENGTH: FormMatchStrength = 2

/** 罗曼语命中达到该数量时可作为拉丁词源的间接证据（单个罗曼命中不足以确认） */
export const ROMANCE_CONFIRM_COUNT = 2

/** 日耳曼语族（本数据集出现的 ISO 639-3 码 + 原始日耳曼语键；不含作为起点的 eng） */
const GERMANIC_LANGS = new Set([
  'got', 'non', 'isl', 'fao', 'dan', 'swe', 'nob', 'nno', 'nor',
  'ang', 'enm', 'osx', 'gml', 'dum', 'gmh', 'goh', 'nld', 'afr',
  'deu', 'yid', 'ofs',
])

/** 词源祖先的语言家族归类（classical 含 p_lat/p_grc；germanic 含原始日耳曼语） */
export type EtymonFamily = 'classical' | 'romance' | 'germanic' | 'other'

export function classifyFamily(lang: string): EtymonFamily {
  if (isClassicalLang(lang)) return 'classical'
  if (isRomanceLang(lang)) return 'romance'
  const l = lang.toLowerCase()
  if (GERMANIC_LANGS.has(l) || l === 'p_gem' || l.startsWith('p_gm')) return 'germanic'
  return 'other'
}

/** etymon 命中：祖先形态 × 词根形态的一次匹配 */
export interface EtymonMatch {
  /** 经由的抽样词（eng:word 为 BFS 起点） */
  viaWord: string
  /** 祖先形态所在语言 */
  lang: string
  /** 祖先形态原文（保留数据集写法，便于溯源） */
  form: string
  /** BFS 深度（1 = 抽样词的直接词源） */
  depth: number
  /** 命中的词根形态（primaryText 或别名之一） */
  rootForm: string
  /** 匹配强度（normalize.matchStrength） */
  strength: FormMatchStrength
}

/** 单个抽样词的词源查证输入：BFS 祖先 + eng 词条是否存在（未收录须如实区分） */
export interface WordAncestry {
  hits: EtymonHit[]
  present: boolean
}

const FAMILY_RANK: Record<EtymonFamily, number> = { classical: 0, romance: 1, germanic: 2, other: 3 }

function cmpStr(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * 在祖先集合中寻找词根形态命中（强度≥MIN_EVIDENCE_STRENGTH）。
 * 排序：强度降序 → 家族（古典优先）→ 深度升序 → 语言/形态（同为稳定排序，输入有序故确定性）。
 */
export function findRootMatches(forms: string[], hits: EtymonHit[], viaWord: string): EtymonMatch[] {
  const out: EtymonMatch[] = []
  for (const h of hits) {
    let best: FormMatchStrength = 0
    let bestForm = ''
    for (const rf of forms) {
      const s = matchStrength(rf, h.form)
      if (s > best) {
        best = s
        bestForm = rf
      }
    }
    if (best < MIN_EVIDENCE_STRENGTH) continue
    out.push({ viaWord, lang: h.lang, form: h.form, depth: h.depth, rootForm: bestForm, strength: best })
  }
  return out.sort(
    (a, b) =>
      b.strength - a.strength ||
      FAMILY_RANK[classifyFamily(a.lang)] - FAMILY_RANK[classifyFamily(b.lang)] ||
      a.depth - b.depth ||
      cmpStr(a.lang, b.lang) ||
      cmpStr(a.form, b.form),
  )
}

/**
 * 祖先是否全为日耳曼语族：无任何古典/罗曼命中，且至少一个日耳曼语命中。
 * 本数据方向为派生词→词源词，这是真实的日耳曼谱系链，构成 conflict 的必要条件。
 */
export function isGermanicPure(hits: EtymonHit[]): boolean {
  if (hits.length === 0) return false
  let hasGermanic = false
  for (const h of hits) {
    const fam = classifyFamily(h.lang)
    if (fam === 'classical' || fam === 'romance') return false
    if (fam === 'germanic') hasGermanic = true
  }
  return hasGermanic
}

function formatHit(lang: string, form: string, depth: number): string {
  return `${lang}:${form}(深度${depth})`
}

function formatMatch(m: EtymonMatch, withStrength: boolean): string {
  return `eng:${m.viaWord} → ${formatHit(m.lang, m.form, m.depth)}${withStrength ? `，强度${m.strength}` : ''}`
}

/** 单词级判定：祖先命中 → WordCheckResult（本源无 gloss，meaningVerdict 恒 unverified） */
function wordResult(word: string, root: RootEntry, matches: EtymonMatch[], hits: EtymonHit[], present: boolean): WordCheckResult {
  const hasClassical = matches.some((m) => classifyFamily(m.lang) === 'classical')
  const romanceCount = matches.filter((m) => classifyFamily(m.lang) === 'romance').length
  let status: XStatus = 'not_found'
  if (!present) {
    status = 'not_found' // 未收录不算证据缺失以外的事，如实不判
  } else if (hasClassical || romanceCount >= ROMANCE_CONFIRM_COUNT) {
    status = 'confirmed'
  } else if (isGermanicPure(hits)) {
    status = 'conflict'
  }

  let detail: string
  if (!present) {
    detail = `eng:${word} 词条未收录，无词源路径可查`
  } else if (status === 'confirmed') {
    detail = matches
      .slice(0, 2)
      .map((m) => formatMatch(m, false))
      .join('；')
  } else if (status === 'conflict') {
    detail =
      '无词根形态命中；祖先无古典/罗曼语、呈日耳曼语族路径：' +
      hits
        .slice(0, 3)
        .map((h) => formatHit(h.lang, h.form, h.depth))
        .join('、')
  } else {
    detail =
      `无词根形态命中；祖先${hits.length}个` +
      (hits.length > 0
        ? `：${hits
            .slice(0, 3)
            .map((h) => formatHit(h.lang, h.form, h.depth))
            .join('、')}`
        : '')
  }
  return { word, root: root.primaryText, status, detail, meaningVerdict: 'unverified' }
}

interface WordMatches {
  sample: SampledWord
  matches: EtymonMatch[]
  hits: EtymonHit[]
  present: boolean
}

/** 词根级证据（跨抽样词按 语言+归一形态 去重，取前 max 条） */
function topEvidence(entries: WordMatches[], max: number): string {
  const seen = new Set<string>()
  const out: string[] = []
  for (const { matches } of entries) {
    for (const m of matches) {
      const key = `${m.lang}:${normalizeForm(m.form)}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(formatMatch(m, true))
      if (out.length >= max) return out.join('；')
    }
  }
  return out.join('；')
}

/** 非古典/非罗曼的祖先证据（conflict 的解释性明细；去重后按深度/语言/形态排序） */
function topNonClassical(entries: WordMatches[], max: number): string[] {
  const seen = new Set<string>()
  const picked: { via: string; lang: string; form: string; depth: number }[] = []
  for (const { sample, hits, present } of entries) {
    if (!present) continue // 未收录词条没有词源路径，不入明细
    for (const h of hits) {
      const fam = classifyFamily(h.lang)
      if (fam !== 'germanic' && fam !== 'other') continue
      const key = `${h.lang}:${normalizeForm(h.form)}`
      if (seen.has(key)) continue
      seen.add(key)
      picked.push({ via: sample.word, lang: h.lang, form: h.form, depth: h.depth })
    }
  }
  return picked
    .sort((a, b) => a.depth - b.depth || cmpStr(a.lang, b.lang) || cmpStr(a.form, b.form))
    .slice(0, max)
    .map((h) => `eng:${h.via} → ${formatHit(h.lang, h.form, h.depth)}`)
}

export interface RootCheckOutput {
  root: RootCheckResult
  words: WordCheckResult[]
}

/**
 * 单词根校验：抽样词（pickSampleWords ≤2 个）的词源祖先 → 词根级 + 词级结论。
 * ancByWord 由运行器/测试方提供：key 为抽样词，value 为 collectAncestors 结果 + eng 词条存在性。
 */
export function checkRootWiktionary(
  root: RootEntry,
  vocab: VocabEntryLike[],
  ancByWord: Map<string, WordAncestry>,
): RootCheckOutput {
  const forms = rootForms(root.primaryText, root.aliases)
  const samples = pickSampleWords(root, vocab, 2)

  const words: WordCheckResult[] = []
  const perWord: WordMatches[] = []
  for (const sample of samples) {
    const anc = ancByWord.get(sample.word) ?? { hits: [], present: false }
    const matches = findRootMatches(forms, anc.hits, sample.word)
    perWord.push({ sample, matches, hits: anc.hits, present: anc.present })
    words.push(wordResult(sample.word, root, matches, anc.hits, anc.present))
  }

  // 词根级聚合计数（按 语言+归一形态 去重，同一词源形态经多个抽样词命中只计一次）
  const classicalKeys = new Set<string>()
  const romanceKeys = new Set<string>()
  for (const { matches } of perWord) {
    for (const m of matches) {
      const fam = classifyFamily(m.lang)
      if (fam !== 'classical' && fam !== 'romance') continue
      const key = `${m.lang}:${normalizeForm(m.form)}`
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
    source: status === 'not_found' ? '' : 'wiktionary',
    classicalHits,
    romanceHits,
    nonClassicalEvidence: [],
    sampledWords: samples.length,
  }

  if (status === 'confirmed') {
    rootResult.evidence = topEvidence(perWord, 3)
  } else {
    const others = topNonClassical(perWord, 3)
    rootResult.nonClassicalEvidence = others
    if (status === 'conflict') rootResult.evidence = others.join('；')
  }
  return { root: rootResult, words }
}

// ────────────────────────── BFS 前沿扩展（运行器与测试共用） ──────────────────────────

export interface FrontierNode {
  lang: string
  form: string
}

export function frontierNodeKey(node: FrontierNode): string {
  return `${node.lang}:${node.form}`
}

/**
 * 下一层前沿：frontier 各节点在 index 中的词源词（数据方向为派生词→词源词）。
 * 跳过 expanded 与自环，按遇序去重（确定性）；条目缺失的节点视为死路。
 */
export function expandFrontier(
  index: EtymwnIndex,
  frontier: FrontierNode[],
  expanded: Set<string>,
): FrontierNode[] {
  const out: FrontierNode[] = []
  const seen = new Set<string>()
  for (const node of frontier) {
    const rels = index[node.lang]?.[node.form]
    if (!rels) continue
    const selfKey = frontierNodeKey(node)
    for (const pair of rels) {
      const form = Object.keys(pair)[0]
      if (!form) continue
      const lang = pair[form]
      const key = `${lang}:${form}`
      if (key === selfKey || expanded.has(key) || seen.has(key)) continue
      seen.add(key)
      out.push({ lang, form })
    }
  }
  return out
}
