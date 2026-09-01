// etymwn 词源交叉校验逻辑（纯函数，不做 I/O）
//
// 数据：.cache/etymwn-etymologies.json（Etymological Wordnet 2013-02-08 的开源转码，
// 结构 { [lang]: { [word]: Array<{ [相关形态]: 语言 }> } }，ISO 639-3 + p_ 前缀原始语）。
// 该转码丢弃了原 TSV 的关系名与方向（8 种关系合并为无向边），因此 collectAncestors
// 的「祖先」实为多跳词源关联邻居而非严格谱系；判定规则据此从保守设计。
//
// 判定标准（确定性）：
// - confirmed：古典语（拉丁/希腊，isClassicalLang 含 p_lat/p_grc）强度≥2 形态命中 ≥1
//   （强证据），或罗曼语（fro/frm/fra 等，间接证据）强度≥2 命中 ≥2；
// - conflict：仅当抽样词祖先全为日耳曼语族（含 p_gem/p_gmw）且无任何古典/罗曼命中
//   ——即词源证据与词库的古典语根体系相悖；其余无命中一律 not_found（拿不准不算冲突）；
// - etymwn 无英文 gloss：meaningVerdict 一律 unverified。
//
// 大文件流式读取在 scripts/xcheck-etymwn.ts（运行器）；本文件只做内存内的判定。

import type { RootCheckResult, RootEntry, VocabEntryLike, WordCheckResult, XStatus } from './types'
import type { FormMatchStrength } from './normalize'
import { isClassicalLang, isRomanceLang, matchStrength, normalizeForm, rootForms } from './normalize'
import type { EtymonHit, EtymwnIndex } from './etymwn'
import { pickSampleWords, type SampledWord } from './sampling'

/** BFS 最大跳数（eng → fro/frm/lat/grc/… 的传播链一般 ≤4 跳） */
export const ETYMW_MAX_DEPTH = 4

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
  /** BFS 深度（1 = 与抽样词直接关联） */
  depth: number
  /** 命中的词根形态（primaryText 或别名之一） */
  rootForm: string
  /** 匹配强度（normalize.matchStrength） */
  strength: FormMatchStrength
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
 * 这是 conflict 的必要条件——词源证据指向与古典语根体系无关的日耳曼谱系。
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

/** 单词级判定：祖先命中 → WordCheckResult（etymwn 无 gloss，meaningVerdict 恒 unverified） */
function wordResult(word: string, root: RootEntry, matches: EtymonMatch[], hits: EtymonHit[]): WordCheckResult {
  const hasClassical = matches.some((m) => classifyFamily(m.lang) === 'classical')
  const romanceCount = matches.filter((m) => classifyFamily(m.lang) === 'romance').length
  let status: XStatus = 'not_found'
  if (hasClassical || romanceCount >= ROMANCE_CONFIRM_COUNT) status = 'confirmed'
  else if (isGermanicPure(hits)) status = 'conflict'

  let detail: string
  if (status === 'confirmed') {
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
  for (const { sample, hits } of entries) {
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
 * ancestorsByWord 由运行器/测试方用 collectAncestors(index, 'eng', word, ETYMW_MAX_DEPTH) 预先算好。
 */
export function checkRootEtymwn(
  root: RootEntry,
  vocab: VocabEntryLike[],
  ancestorsByWord: Map<string, EtymonHit[]>,
): RootCheckOutput {
  const forms = rootForms(root.primaryText, root.aliases)
  const samples = pickSampleWords(root, vocab, 2)

  const words: WordCheckResult[] = []
  const perWord: WordMatches[] = []
  for (const sample of samples) {
    const hits = ancestorsByWord.get(sample.word) ?? []
    const matches = findRootMatches(forms, hits, sample.word)
    perWord.push({ sample, matches, hits })
    words.push(wordResult(sample.word, root, matches, hits))
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
    source: status === 'not_found' ? '' : 'etymwn',
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
 * 下一层前沿：frontier 各节点在 index 中的词源关联邻居。
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
