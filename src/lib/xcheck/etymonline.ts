// etymonline 文本解析：从词源叙述中抽取 (形态, 释义 gloss, 语言) 三元组（纯函数）
//
// 数据：yosevu/etymonline 仓库 index.json（etymonline.com 词条文本抓取镜像，
// 46,000+ 词条）。文本形如：
//   "from Latin visionem (nominative visio) \"act of seeing, sight, ...\" ... of videre \"to see.\""
// 抽取目标：语言 + 词源形态 + 引号内释义，用于校验词根义（中文）与开源语素义的一致性。

import { matchStrength, type FormMatchStrength } from './normalize'

export interface EtymonlineEntry {
  word: string
  etymology: string
}

export interface GlossSegment {
  /** 词源形态（如 visionem / videre / *spek-） */
  form: string
  /** 引号内英文释义 */
  gloss: string
  /** 就近归属的语言名（etymonline 原文写法，如 Latin / Old French / PIE） */
  language: string
  /** 在原文中的字符位置（用于稳定排序） */
  position: number
}

// 语言关键词 → 归属语言（按原文写法保留，便于溯源）
const LANG_KEYWORDS: [string, string][] = [
  ['Proto-Indo-European root', 'PIE'],
  ['Proto-Indo-European', 'PIE'],
  [' PIE root ', 'PIE'],
  ['PIE ', 'PIE'],
  ['Medieval Latin', 'Medieval Latin'],
  ['Late Latin', 'Late Latin'],
  ['Vulgar Latin', 'Vulgar Latin'],
  ['Old Latin', 'Old Latin'],
  ['Church Latin', 'Church Latin'],
  ['Latin', 'Latin'],
  ['Ancient Greek', 'Ancient Greek'],
  ['Modern Greek', 'Modern Greek'],
  ['Greek', 'Greek'],
  ['Anglo-French', 'Anglo-French'],
  ['Old French', 'Old French'],
  ['Middle French', 'Middle French'],
  ['French', 'French'],
  ['Old Spanish', 'Old Spanish'],
  ['Spanish', 'Spanish'],
  ['Italian', 'Italian'],
  ['Old Norse', 'Old Norse'],
  ['Old High German', 'Old High German'],
  ['Middle English', 'Middle English'],
  ['Old English', 'Old English'],
]

/** etymonline 归属语言 → 是否拉丁/希腊家族（用于古典性判定） */
const LATIN_GREEK_LANGNAMES = new Set([
  'Latin',
  'Medieval Latin',
  'Late Latin',
  'Vulgar Latin',
  'Old Latin',
  'Church Latin',
  'Ancient Greek',
  'Greek',
  'Modern Greek',
])

export function isLatinGreekLangName(name: string): boolean {
  return LATIN_GREEK_LANGNAMES.has(name) || name.startsWith('PIE')
}

/**
 * 从一段 etymonline 词源文本中抽取形态-释义对。
 * 策略（确定性）：
 * 1. 统一弯引号为直引号；
 * 2. 从左到右扫描，维护「最近出现的语言关键词」；
 * 3. 捕获 `<form> "<gloss>"`（form 为带变音符/连字符/星号的词）；
 * 4. 另捕获 `(nominative visio)` 等括注形态，其释义取其后 60 字符内的首个引号段。
 */
export function extractGlossSegments(rawText: string): GlossSegment[] {
  const text = rawText.replace(/[“”„]/g, '"').replace(/[‘’]/g, "'")
  const out: GlossSegment[] = []
  const re = /([A-Za-zĀ-ſἀ-῿Ⰰ-Ɀ＀-｠*''\u0100-\u024f\u1e00-\u1eff-]{1,40})\s*"([^"]{2,120})"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const form = m[1].replace(/^[-']+|[-']+$/g, '')
    const gloss = m[2].trim()
    if (!form || !gloss) continue
    const before = text.slice(0, m.index)
    out.push({ form, gloss, language: nearestLanguage(before), position: m.index })
  }
  // 括注形态：(nominative visio) —— 关联其后首个引号释义
  const parenRe = /\((?:nominative|genitive|dative|accusative|ablative)\s+([A-Za-z\u0100-\u024f\u1e00-\u1eff-]{2,40})\)/gi
  let p: RegExpExecArray | null
  while ((p = parenRe.exec(text)) !== null) {
    const form = p[1]
    const after = text.slice(p.index, p.index + 140)
    const q = after.match(/"([^"]{2,120})"/)
    if (q) {
      const before = text.slice(0, p.index)
      out.push({ form, gloss: q[1].trim(), language: nearestLanguage(before), position: p.index })
    }
  }
  return out.sort((a, b) => a.position - b.position)
}

function nearestLanguage(before: string): string {
  let best = ''
  let bestIdx = -1
  for (const [kw, name] of LANG_KEYWORDS) {
    const idx = before.lastIndexOf(kw)
    if (idx > bestIdx) {
      bestIdx = idx
      best = name
    }
  }
  return bestIdx >= 0 ? best : ''
}

export interface GlossHit {
  form: string
  gloss: string
  language: string
  strength: FormMatchStrength
  /** 在原文中的位置（同强度时取最早出现，保证确定性） */
  position: number
}

/**
 * 在词条文本中寻找与给定词根形态对应的 (形态, 释义) 证据。
 * 候选形态与释义从 extractGlossSegments 获得；形态匹配用 matchStrength；
 * 仅保留 strength > 0 的命中，按 strength 降序、位置升序输出。
 */
export function findGlossEvidence(
  text: string,
  rootForms: string[],
  opts: { requireLatinGreek?: boolean } = {},
): GlossHit[] {
  const segments = extractGlossSegments(text)
  const hits: GlossHit[] = []
  for (const seg of segments) {
    let best: FormMatchStrength = 0
    for (const rf of rootForms) {
      const s = matchStrength(rf, seg.form)
      if (s > best) best = s
    }
    if (best === 0) continue
    if (opts.requireLatinGreek && !isLatinGreekLangName(seg.language)) continue
    hits.push({ form: seg.form, gloss: seg.gloss, language: seg.language, strength: best, position: seg.position })
  }
  return hits.sort((a, b) => b.strength - a.strength || a.position - b.position)
}

/**
 * 挑选用于「词根义 ↔ 开源语素义」比对的证据命中：
 * 强度 ≥2 才视为有效形态证据（弱命中不参与语义机判）；同强取位置最早。
 * 无达标命中返回 null。
 */
export function selectBestGlossHit(hits: GlossHit[]): GlossHit | null {
  let best: GlossHit | null = null
  for (const h of hits) {
    if (h.strength < 2) continue
    if (!best || h.strength > best.strength) best = h
  }
  return best
}

/** 由 etymonline 条目数组构建 word → entry 映射（word 小写；同词取首个） */
export function buildEtymonlineWordMap(entries: EtymonlineEntry[]): Map<string, EtymonlineEntry> {
  const map = new Map<string, EtymonlineEntry>()
  for (const e of entries) {
    if (!e || typeof e.word !== 'string' || typeof e.etymology !== 'string') continue
    const key = e.word.toLowerCase()
    if (!map.has(key)) map.set(key, e)
  }
  return map
}
