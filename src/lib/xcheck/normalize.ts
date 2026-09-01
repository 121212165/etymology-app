// 形态归一化与词根-词源形态匹配规则（纯函数，确定性）

/**
 * 归一化拉丁/希腊语系词源形态：
 * 小写、NFD 去变音符（ā→a, ē→e…）、仅保留 a-z 字母。
 */
export function normalizeForm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
}

export type FormMatchStrength = 0 | 1 | 2 | 3

/**
 * 常见英语虚词/代词等 1-2 字母词：作为截断词根做「全等匹配」时只会产生噪声
 * （etymonline 行文里 `it "..."`、`a "..."` 这类引号紧跟虚词的片段），
 * 永远不作为词源证据。注意 at/as/im 等同化前缀表面拼写正是靠这条挡掉伪确认。
 */
const SHORT_FUNCTION_WORDS = new Set([
  'a', 'an', 'am', 'as', 'at', 'be', 'by', 'do', 'go', 'he', 'if', 'in', 'is',
  'it', 'me', 'my', 'no', 'of', 'on', 'or', 'so', 'to', 'up', 'us', 'we',
])

/**
 * 词根（词库里的截断词干）是否能在词源形态（etymon）中找到对应。
 * 返回 0 = 不匹配；1 = 弱；2 = 中；3 = 强。
 *
 * 规则（确定性，按匹配强度；对短词根从严，防伪命中）：
 * - 完全相等（词根 ≥2 字母且非常见虚词，如 ed→*ed-）→ 3
 * - etymon 以词根开头，词根 ≥3 字母（如 spect→spectare）→ 3
 * - etymon 以词根结尾，词根 ≥3 字母（如 dict→addictus）→ 3
 * - etymon 包含词根，词根 ≥3 字母（如 fer→transfero）→ 2
 * - etymon 包含词根，词根 2 字母（如 it→exitus）→ 1（弱，仅记录不判 confirmed）
 * - 词根 1 字母或常见虚词全等 → 0
 */
export function matchStrength(root: string, form: string): FormMatchStrength {
  const r = normalizeForm(root)
  const f = normalizeForm(form)
  if (!r || !f) return 0
  if (f === r) {
    if (r.length >= 2 && !SHORT_FUNCTION_WORDS.has(r)) return 3
    return 0
  }
  if (r.length >= 3 && f.startsWith(r)) return 3
  if (r.length >= 3 && f.endsWith(r)) return 3
  if (f.includes(r)) return r.length >= 3 ? 2 : 1
  return 0
}

/**
 * 词根的全部候选形态：primaryText + aliases。
 */
export function rootForms(primaryText: string, aliases: string[]): string[] {
  const set = new Set<string>([primaryText, ...aliases])
  return [...set].filter(Boolean)
}

/**
 * etymwn 的语言代码 → 是否古典语（拉丁/希腊家族）。
 * etymwn 使用 ISO 639-3，另有 p_ 前缀表示原始语（proto-language）。
 */
const CLASSICAL_LANGS = new Set([
  'lat', // Latin
  'la', // Latin (ISO 639-2)
  'grc', // Ancient Greek
  'el', // Greek (ISO 639-2)
  'grc-koi', // Koine Greek
  'la-lat', // 防御性冗余
  'la-med', // Medieval Latin（部分数据源用）
  'lat-med',
  'LL.',
])

/** 罗曼语族 / 中古传播路径（可作为拉丁词源的间接证据） */
const ROMANCE_LANGS = new Set([
  'fro', // Old French
  'frm', // Middle French
  'fra', // French
  'xno', // Anglo-Norman
  'ita', // Italian
  'spa', // Spanish
  'por', // Portuguese
  'cat', // Catalan
  'ron', // Romanian
  'pro', // Old Occitan
  'roa-opt', // Old Portuguese
  'roa-oit', // Old Italian
])

export function isClassicalLang(lang: string): boolean {
  const l = lang.toLowerCase()
  return CLASSICAL_LANGS.has(l) || l.startsWith('p_lat') || l.startsWith('p_grc')
}

export function isRomanceLang(lang: string): boolean {
  return ROMANCE_LANGS.has(lang.toLowerCase())
}

/** 从 "lat:specto" 形式的 key 中拆出语言与形态 */
export function splitLangKey(key: string): { lang: string; form: string } {
  const idx = key.indexOf(':')
  if (idx < 0) return { lang: '', form: key }
  return { lang: key.slice(0, idx), form: key.slice(idx + 1) }
}
