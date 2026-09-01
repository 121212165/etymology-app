// scripts/lib/xcheck-merge.ts
// 三路词源校验分报告的合并规则（纯函数，确定性）。
//
// 输入：xcheck-etymwn.json / xcheck-wiktionary.json / xcheck-etymonline.json
// （三路同构：{source, sourceInfo, runStatus, roots[], words[], methodNotes[]}，
//   roots 均为 569 全量且顺序同 enhanced-roots.json，words 同一抽样器产出）
//
// 合并规则（保守取向，宁可 not_found 不夸大）：
// - 词根级 status：任一源 confirmed → confirmed；否则任一源 conflict → conflict；否则 not_found
//   （某源的 not_found 是覆盖缺口不是反证，不参与拉低：etymwn/wiktionary 有结构性
//    缺口——PIE 层缺失、希腊字母形态不参与匹配、部分常用词未收录）
// - evidence：只保留确认源的证据，按【源】前缀拼接，封顶 3 条
// - 词级 status 同上；meaningVerdict 取最优（match > mismatch > unverified），
//   wordsChecked/wordMismatch 只统计机判过的词
// - 计数类字段（classicalHits/romanceHits/sampledWords）取跨源最大值，避免同一
//   词源形态在多源重复计数

import type {
  RootCheckResult,
  SourceInfo,
  SourceRunStatus,
  WordCheckResult,
  XStatus,
} from '../../src/lib/xcheck/types'

export interface SourcePartialReport {
  source: 'etymwn' | 'wiktionary' | 'etymonline'
  sourceInfo: SourceInfo
  runStatus: SourceRunStatus
  roots: RootCheckResult[]
  words: WordCheckResult[]
  methodNotes: string[]
}

export interface MergedReport {
  summary: {
    rootTotal: number
    confirmed: number
    notFound: number
    conflict: number
    wordsChecked: number
    wordMismatch: number
    layerBreakdown: { layer: string; confirmed: number; notFound: number; conflict: number }[]
    verdicts: { match: number; mismatch: number; unverified: number }
  }
  roots: RootCheckResult[]
  words: WordCheckResult[]
  sources: SourceInfo[]
  sourceStatus: SourceRunStatus[]
  methodNotes: string[]
}

const STATUS_RANK: Record<XStatus, number> = { confirmed: 2, conflict: 1, not_found: 0 }

function combineStatus(statuses: XStatus[]): XStatus {
  let best: XStatus = 'not_found'
  for (const s of statuses) {
    if (STATUS_RANK[s] > STATUS_RANK[best]) best = s
  }
  return best
}

/** 汇集某词根在三源中的结果（缺源的源自动缺席，不视为反证） */
function collectRoot(text: string, rootBySource: Map<string, Map<string, RootCheckResult>>): { source: string; r: RootCheckResult }[] {
  const perSource: { source: string; r: RootCheckResult }[] = []
  for (const [source, inner] of rootBySource) {
    const r = inner.get(text)
    if (r) perSource.push({ source, r })
  }
  return perSource
}

function mergeRoot(text: string, rootBySource: Map<string, Map<string, RootCheckResult>>): RootCheckResult {
  const perSource = collectRoot(text, rootBySource)
  if (perSource.length === 0) throw new Error(`mergeRoot: 所有源都没有词根 ${text}`)
  const primary = perSource[0].r
  const status = combineStatus(perSource.map((x) => x.r.status))
  const confirmedSources = perSource.filter((x) => x.r.status === 'confirmed')
  const conflictSources = perSource.filter((x) => x.r.status === 'conflict')

  const evidenceParts =
    status === 'confirmed'
      ? confirmedSources.map((x) => (x.r.evidence ? `【${x.source}】${x.r.evidence}` : '')).filter(Boolean)
      : status === 'conflict'
        ? conflictSources.map((x) => (x.r.evidence ? `【${x.source}】${x.r.evidence}` : '')).filter(Boolean)
        : []

  const nonClassical = new Set<string>()
  for (const x of perSource) {
    for (const e of x.r.nonClassicalEvidence ?? []) nonClassical.add(e)
  }

  return {
    text: primary.text,
    layer: primary.layer,
    meaning: primary.meaning,
    status,
    evidence: evidenceParts.slice(0, 3).join('；'),
    source: status === 'not_found' ? '' : (status === 'confirmed' ? confirmedSources : conflictSources).map((x) => x.source).join(','),
    classicalHits: Math.max(0, ...perSource.map((x) => x.r.classicalHits ?? 0)),
    romanceHits: Math.max(0, ...perSource.map((x) => x.r.romanceHits ?? 0)),
    nonClassicalEvidence: [...nonClassical].slice(0, 3),
    sampledWords: Math.max(0, ...perSource.map((x) => x.r.sampledWords ?? 0)),
  }
}

/** 汇集某抽样词在三源中的结果（键 root+空格+word） */
function collectWord(key: string, wordBySource: Map<string, Map<string, WordCheckResult>>): { source: string; w: WordCheckResult }[] {
  const all: { source: string; w: WordCheckResult }[] = []
  for (const [source, inner] of wordBySource) {
    const w = inner.get(key)
    if (w) all.push({ source, w })
  }
  return all
}

function mergeWord(key: string, wordBySource: Map<string, Map<string, WordCheckResult>>): WordCheckResult {
  const all = collectWord(key, wordBySource)
  const [rootText, word] = key.split(' ')
  const status = combineStatus(all.map((x) => x.w.status))
  const verdicts = all.map((x) => x.w.meaningVerdict)
  const meaningVerdict = verdicts.includes('match') ? 'match' : verdicts.includes('mismatch') ? 'mismatch' : 'unverified'
  const gloss = all.map((x) => x.w.gloss).find((g) => !!g)
  const detail = all
    .filter((x) => x.w.detail)
    .map((x) => `【${x.source}】${x.w.detail}`)
    .slice(0, 3)
    .join('；')
  return {
    word,
    root: rootText,
    status,
    detail,
    meaningVerdict,
    ...(gloss ? { gloss } : {}),
  }
}

/** 合并三分报告（roots 顺序取第一份的顺序 = enhanced-roots 顺序） */
export function mergeReports(partials: SourcePartialReport[]): MergedReport {
  if (partials.length === 0) throw new Error('没有任何分报告可合并')

  const rootBySource = new Map<string, Map<string, RootCheckResult>>()
  const wordBySource = new Map<string, Map<string, WordCheckResult>>()
  for (const p of partials) {
    rootBySource.set(p.source, new Map(p.roots.map((r) => [r.text, r])))
    wordBySource.set(p.source, new Map(p.words.map((w) => [`${w.root} ${w.word}`, w])))
  }

  const order = partials[0].roots
  const roots = order.map((r) => mergeRoot(r.text, rootBySource))

  // 词级：以「root word」为键取并集（三源同一抽样器，理论同键集；缺源按现有源合并）
  const wordKeys: string[] = []
  const seenWordKey = new Set<string>()
  for (const p of partials) {
    for (const w of p.words) {
      const key = `${w.root} ${w.word}`
      if (!seenWordKey.has(key)) {
        seenWordKey.add(key)
        wordKeys.push(key)
      }
    }
  }
  const words = wordKeys.map((key) => mergeWord(key, wordBySource))

  const counts = { confirmed: 0, notFound: 0, conflict: 0 }
  const layerBreakdownMap = new Map<string, { layer: string; confirmed: number; notFound: number; conflict: number }>()
  for (const r of roots) {
    counts[r.status === 'not_found' ? 'notFound' : r.status]++
    const row = layerBreakdownMap.get(r.layer) ?? { layer: r.layer, confirmed: 0, notFound: 0, conflict: 0 }
    row[r.status === 'not_found' ? 'notFound' : r.status]++
    layerBreakdownMap.set(r.layer, row)
  }
  const LAYER_ORDER = ['core', 'middle', 'edge']
  const layerBreakdown = LAYER_ORDER.filter((l) => layerBreakdownMap.has(l)).map((l) => layerBreakdownMap.get(l)!)

  const verdicts = { match: 0, mismatch: 0, unverified: 0 }
  let wordsChecked = 0
  let wordMismatch = 0
  for (const w of words) {
    verdicts[w.meaningVerdict]++
    if (w.meaningVerdict !== 'unverified') wordsChecked++
    if (w.meaningVerdict === 'mismatch') wordMismatch++
  }

  const methodNotes = [
    '合并规则（保守取向）：词根/词级 status 取任一源的最高结论（confirmed > conflict > not_found）；单源 not_found 视为该源覆盖缺口而非反证，不拉低合并结论',
    'evidence 按【源】前缀拼接（确认源优先），计数类字段取跨源最大值避免同形重复计数',
    '三源判定规则一致：古典语（拉丁/希腊）强度≥2 命中≥1，或罗曼语强度≥2 命中≥2；conflict 仅在「证据指向纯非古典且无古典成分」时给出',
    ...partials.map((p) => `【${p.source}】${p.runStatus.ok ? '运行成功' : `运行失败：${p.runStatus.note}`}；${p.methodNotes[0] ?? ''}`),
    '已知结构性缺口：etymwn/wiktionary 转码无 PIE 顶层键、希腊形态为希腊字母原文不参与匹配；etymonline 为叙述文本的启发式抽取——三类缺口都可能造成 confirmed 偏少，报告中 confirmed 是「有实证的下界」',
    'core/middle 层 conflict 与全部词级 mismatch 是人工复核重点（edge 层 conflict 多为日耳曼本源基础词，应解读为「该词根本非古典语源」）',
  ]

  return {
    summary: {
      rootTotal: roots.length,
      confirmed: counts.confirmed,
      notFound: counts.notFound,
      conflict: counts.conflict,
      wordsChecked,
      wordMismatch,
      layerBreakdown,
      verdicts,
    },
    roots,
    words,
    sources: partials.map((p) => p.sourceInfo),
    sourceStatus: partials.map((p) => p.runStatus),
    methodNotes,
  }
}
