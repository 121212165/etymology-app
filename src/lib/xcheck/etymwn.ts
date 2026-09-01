// Etymological Wordnet (etymwn) 数据访问与解析（纯函数）
//
// 原始数据：Gerard de Melo, "Etymological Wordnet" 2013-02-08 版，
// TSV 三元组 `lang:word \t rel:xxx \t lang:relatedWord`（ISO 639-3，p_ 前缀为原始语）。
//
// 本仓库使用的 .cache/etymwn-etymologies.json 是该 TSV 的开源转码
// （github.com/parker57/making-sense-of-etymwn，脚本 csv_to_json.py：去正字变体、
// 去关系列、去重后转 JSON），结构：{ [lang]: { [word]: Array<{ [relatedForm]: relatedLang }> } }。

import { decodeJsonString } from './stream-json'
import { isClassicalLang, isRomanceLang } from './normalize'

export interface EtymwnTriple {
  lang: string
  word: string
  relation: string
  relatedLang: string
  relatedForm: string
}

/**
 * 解析 etymwn 原始 TSV 一行：`eng:abandon\trel:etymologically_related\tlat:abandonare`
 * 无关行（注释/空行/非 rel: 列数不足）返回 null。
 */
export function parseEtymwnTsvLine(line: string): EtymwnTriple | null {
  if (!line || line.startsWith('#')) return null
  const cols = line.split('\t')
  if (cols.length < 3) return null
  const parseSide = (s: string): { lang: string; word: string } | null => {
    const idx = s.indexOf(':')
    if (idx <= 0) return null
    return { lang: s.slice(0, idx), word: s.slice(idx + 1) }
  }
  const left = parseSide(cols[0])
  const rel = cols[1].trim()
  const right = parseSide(cols[2])
  if (!left || !right || !rel.startsWith('rel:')) return null
  return {
    lang: left.lang,
    word: left.word,
    relation: rel.slice(4),
    relatedLang: right.lang,
    relatedForm: right.word,
  }
}

/** JSON 转码后的索引类型：每条关系为动态键对象 { 相关形态: 语言 }（见文件头结构说明） */
export type IndexRels = Record<string, string>[]
export type EtymwnIndex = Record<string, Record<string, IndexRels>>

/** etymon 命中记录 */
export interface EtymonHit {
  lang: string
  form: string
  /** 从起始词出发经过的关系跳数（1 = 直接词源） */
  depth: number
}

/**
 * 多跳词源祖先遍历（BFS，环保护，去重保最小深度）。
 * index 结构见文件头；startLang/startWord 为起始词（通常 eng:W）。
 */
export function collectAncestors(
  index: EtymwnIndex,
  startLang: string,
  startWord: string,
  maxDepth: number,
): EtymonHit[] {
  const out = new Map<string, EtymonHit>()
  const seen = new Set<string>([`${startLang}:${startWord}`])
  let frontier: { lang: string; form: string }[] = [{ lang: startLang, form: startWord }]
  for (let depth = 1; depth <= maxDepth && frontier.length > 0; depth++) {
    const next: { lang: string; form: string }[] = []
    for (const cur of frontier) {
      const rels = index[cur.lang]?.[cur.form]
      if (!rels) continue
      for (const pair of rels) {
        const form = Object.keys(pair)[0]
        if (!form) continue
        const lang = pair[form]
        const key = `${lang}:${form}`
        if (!out.has(key)) out.set(key, { lang, form, depth })
        if (!seen.has(key)) {
          seen.add(key)
          next.push({ lang, form })
        }
      }
    }
    frontier = next
  }
  return [...out.values()].sort((a, b) => a.depth - b.depth || a.lang.localeCompare(b.lang) || a.form.localeCompare(b.form))
}

/** 祖先命中按语言家族归类统计 */
export interface AncestorFamilyStats {
  classical: EtymonHit[]
  romance: EtymonHit[]
  other: EtymonHit[]
}

export function classifyAncestors(hits: EtymonHit[]): AncestorFamilyStats {
  const classical: EtymonHit[] = []
  const romance: EtymonHit[] = []
  const other: EtymonHit[] = []
  for (const h of hits) {
    if (isClassicalLang(h.lang)) classical.push(h)
    else if (isRomanceLang(h.lang)) romance.push(h)
    else other.push(h)
  }
  return { classical, romance, other }
}

/**
 * 从顶层 section 原文（形如 {"word":[{form:lang},...], ...}）提取 wanted 词的关系数组。
 * 仅对 wanted 命中的 key 做 JSON.parse，其余 value 只做括号跳过，不占内存。
 * 键匹配先原文后小写（proper noun 容错）；存储保留原文键（后续查找用原文）。
 * ety-wiktionary 的转码结构与此一致，共用本函数。
 */
export function parseIndexWords(raw: string, wanted: Set<string>): Record<string, IndexRels> {
  const out: Record<string, IndexRels> = {}
  const n = raw.length
  let i = 0
  const skipWs = () => {
    while (i < n) {
      const ch = raw[i]
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') i++
      else break
    }
  }
  skipWs()
  if (raw[i] !== '{') return out
  i++
  while (i < n) {
    skipWs()
    if (raw[i] === '}') break
    if (raw[i] !== '"') break // 畸形即止，不猜
    // 读 key 原文（含转义），闭合后统一解码
    i++
    let keyRaw = ''
    let esc = false
    while (i < n) {
      const ch = raw[i]
      if (esc) {
        keyRaw += ch
        esc = false
        i++
        continue
      }
      if (ch === '\\') {
        keyRaw += ch
        esc = true
        i++
        continue
      }
      if (ch === '"') {
        i++
        break
      }
      keyRaw += ch
      i++
    }
    const key = decodeJsonString(keyRaw)
    skipWs()
    if (raw[i] !== ':') break
    i++
    skipWs()
    const start = i
    const ch0 = raw[i]
    if (ch0 === '{' || ch0 === '[') {
      // 字符串感知的括号平衡扫描
      let depth = 0
      let inStr = false
      let esc2 = false
      while (i < n) {
        const ch = raw[i]
        if (inStr) {
          if (esc2) esc2 = false
          else if (ch === '\\') esc2 = true
          else if (ch === '"') inStr = false
          i++
          continue
        }
        if (ch === '"') {
          inStr = true
          i++
          continue
        }
        if (ch === '{' || ch === '[') depth++
        else if (ch === '}' || ch === ']') {
          depth--
          i++
          if (depth === 0) break
          continue
        }
        i++
      }
      if (wanted.has(key) || wanted.has(key.toLowerCase())) {
        try {
          out[key] = JSON.parse(raw.slice(start, i)) as IndexRels
        } catch {
          // 畸形片段跳过（不编造）
        }
      }
    } else {
      // 标量 value：跳过到 , 或 }（字符串感知）
      let inStr = false
      let esc2 = false
      while (i < n) {
        const ch = raw[i]
        if (inStr) {
          if (esc2) esc2 = false
          else if (ch === '\\') esc2 = true
          else if (ch === '"') inStr = false
        } else {
          if (ch === '"') inStr = true
          else if (ch === ',' || ch === '}') break
        }
        i++
      }
    }
    skipWs()
    if (raw[i] === ',') i++
  }
  return out
}
