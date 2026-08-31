// scripts/build-vocab-v2.ts
//
// 数据质量重建（v2）：读 public/data/vocab.json + roots-index.json，
// 产出修复后的 vocab.json（同名覆盖，条数与顺序不变）。
//
// 修复三类问题：
// 1. 同化前缀规范化：word-initial 的 1-3 字母 root 部件若为同化表面拼写
//    （a/at/ap/... → ad；im/il/ir → in；oc/of/op → ob；...），改写为
//    type:"prefix" + text=引用形态 + surface=原表面拼写。
// 2. 完整划分校验：parts 拼接（按 surface，无则 text）必须等于原词；
//    缺口先尝试词根向右延长（延长形态须存在于 roots-index），否则插入 linker。
// 3. 词中字母错位/脱落（如 expire 的 ex+spir 实际拼作 "pire"）：以 surface
//    记录词内实际拼写，text 保留引用形态。
//
// 用法：npm run build:vocab2
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { VocabEntry, VocabPart, RootIndex } from '../src/lib/types'

// ────────────────────────── 规则常量 ──────────────────────────

/**
 * 同化前缀表面表：表面拼写 → 引用形态。
 * 拉丁前缀在特定辅音前发生同化（ad-→ac-/af-/ag-...），上游生成器把这些
 * 表面拼写登记成了独立"词根"。键的排列顺序即歧义时的默认优先级。
 */
const ASSIMILATED_PREFIXES: Readonly<Record<string, string>> = {
  // ad- 系
  a: 'ad', at: 'ad', ap: 'ad', ar: 'ad', as: 'ad',
  ac: 'ad', af: 'ad', ag: 'ad', al: 'ad', an: 'ad',
  // in- 系（im- 可能是否定前缀本身 → 歧义）
  im: 'in', il: 'in', ir: 'in',
  // ob- 系
  oc: 'ob', of: 'ob', op: 'ob',
  // sub- 系
  suc: 'sub', suf: 'sub', sug: 'sub', sup: 'sub', sur: 'sub', sus: 'sub',
  // com-/con- 系
  col: 'com', cor: 'com', co: 'com',
  // ex- 系
  e: 'ex', ef: 'ex',
  // dis- 系
  dif: 'dis',
}

/**
 * 歧义表面拼写：该表面本身也是独立常用词（a/as/at/of）或独立否定前缀
 * （im/il/ir，如 impossible 的 im- 是 in-（不）而非 in-（进入））。
 * 命中时按表内默认引用形态改写，并标 parseQuality:"low"。
 */
const AMBIGUOUS_SURFACES: ReadonlySet<string> = new Set(['a', 'as', 'at', 'of', 'im', 'il', 'ir'])

/**
 * 引用形态 → 全部可能表面拼写（含引用形态本身），用于首部件为 prefix 类型
 * 而词首字母对不上时的表面推导（succeed：prefix "sub" vs 词首 "suc"）。
 * 在标准同化表之外补充了上游数据中实际出现的形态（di-）。
 */
const CANONICAL_SURFACES: Readonly<Record<string, readonly string[]>> = (() => {
  const map: Record<string, string[]> = {}
  const add = (canonical: string, surface: string) => {
    if (!map[canonical]) map[canonical] = []
    if (!map[canonical].includes(surface)) map[canonical].push(surface)
  }
  for (const [surface, canonical] of Object.entries(ASSIMILATED_PREFIXES)) add(canonical, surface)
  for (const canonical of Object.values(ASSIMILATED_PREFIXES)) add(canonical, canonical)
  // 数据中实际出现、标准表未列的变体
  add('dis', 'di')
  // 长形态优先尝试
  for (const surfaces of Object.values(map)) surfaces.sort((x, y) => y.length - x.length)
  return map
})()

const LINKER_MEANING = '连接字母'
/** 缺口搜索的最大长度（数据中实际最大缺口 5：acknowledge 的 "ledge"） */
const MAX_GAP = 8

// ────────────────────────── 对齐与修复 ──────────────────────────

interface RepairStats {
  converted: number
  ambiguous: number
  extended: number
  linkers: number
  surfacesDerived: number
  lowQuality: number
}

const stats: RepairStats = {
  converted: 0, ambiguous: 0, extended: 0, linkers: 0, surfacesDerived: 0, lowQuality: 0,
}

const failures: string[] = []

function isRootExtensionTarget(part: VocabPart | null | undefined): part is VocabPart {
  return !!part && part.type === 'root' && part.surface === undefined
}

/** 词根部件向右延长覆盖缺口；延长形态不在 roots-index 时返回 false */
function extendRootOverGap(result: VocabPart[], gap: string, rootIndex: RootIndex): boolean {
  const prev = result[result.length - 1]
  if (!isRootExtensionTarget(prev)) return false
  const extended = prev.text + gap
  if (!rootIndex[extended]) return false
  result[result.length - 1] = { ...prev, text: extended }
  stats.extended++
  return true
}

/**
 * Pass A：严格左→右对齐。部件与词段完全匹配则推进；否则在允许范围内寻找
 * 缺口（先尝试词根延长修复，失败插 linker），找不到缺口则整体失败。
 */
function tryStrictWithGaps(word: string, parts: VocabPart[], rootIndex: RootIndex): VocabPart[] | null {
  const result: VocabPart[] = []
  let pos = 0
  for (const part of parts) {
    const matchText = part.surface ?? part.text
    if (word.startsWith(matchText, pos)) {
      result.push(part)
      pos += matchText.length
      continue
    }
    let gapLen = -1
    for (let g = 1; g <= MAX_GAP; g++) {
      if (word.startsWith(matchText, pos + g)) { gapLen = g; break }
    }
    if (gapLen < 0) return null
    const gap = word.slice(pos, pos + gapLen)
    if (!extendRootOverGap(result, gap, rootIndex)) {
      result.push({ type: 'linker', text: gap, meaning: LINKER_MEANING })
      stats.linkers++
    }
    result.push(part)
    pos += gapLen + matchText.length
  }
  if (pos < word.length) {
    const gap = word.slice(pos)
    if (!extendRootOverGap(result, gap, rootIndex)) {
      result.push({ type: 'linker', text: gap, meaning: LINKER_MEANING })
      stats.linkers++
    }
  }
  return result
}

/**
 * Pass B：两端对齐。后缀部件从词尾严格匹配，前缀部件从词首严格匹配
 * （首部件为 prefix 时允许同化表面族推导），剩余"中段"部件以 surface
 * 记录词内实际拼写。
 */
function tryBothEnds(word: string, parts: VocabPart[], rootIndex: RootIndex): VocabPart[] | null {
  const n = parts.length
  const assigned: (VocabPart | null)[] = new Array(n).fill(null)

  // 后缀游程：从末尾向前严格 endsWith
  let end = word.length
  let sIdx = n - 1
  while (sIdx >= 0) {
    const t = parts[sIdx].surface ?? parts[sIdx].text
    if (end - t.length < 0 || !word.slice(0, end).endsWith(t)) break
    assigned[sIdx] = parts[sIdx]
    end -= t.length
    sIdx--
  }

  // 前缀游程：从头向后严格 startsWith；首部件 prefix 允许表面族推导
  let start = 0
  let pIdx = 0
  while (pIdx <= sIdx) {
    const part = parts[pIdx]
    const t = part.surface ?? part.text
    let matched: string | null = null
    if (word.startsWith(t, start) && start + t.length <= end) {
      matched = t
    } else if (pIdx === 0 && part.type === 'prefix' && part.surface === undefined) {
      const family = CANONICAL_SURFACES[part.text]
      if (family) {
        for (const s of family) {
          if (s !== t && word.startsWith(s, start) && start + s.length <= end) { matched = s; break }
        }
      }
    }
    if (matched === null) break
    if (matched !== t) {
      assigned[pIdx] = { ...part, surface: matched }
      stats.surfacesDerived++
    } else {
      assigned[pIdx] = part
    }
    start += matched.length
    pIdx++
  }

  // 中段部件（pIdx..sIdx）吃掉剩余词段 word[start..end)
  const midCount = sIdx - pIdx + 1
  const midSlice = word.slice(start, end)
  if (midCount < 0) return null // 前后游程重叠
  let trailingLinker: string | null = null
  if (midCount === 0 && midSlice.length > 0) {
    // 前后游程之间仍有空隙：先尝试词根延长修复，失败则插 linker
    const prev = assigned[pIdx - 1]
    const extended = isRootExtensionTarget(prev) && rootIndex[prev.text + midSlice]
    if (prev && extended) {
      assigned[pIdx - 1] = { ...prev, text: prev.text + midSlice }
      stats.extended++
    } else {
      trailingLinker = midSlice
    }
  } else if (midCount === 1) {
    const part = parts[pIdx]
    if (midSlice !== (part.surface ?? part.text)) {
      assigned[pIdx] = { ...part, surface: midSlice }
      stats.surfacesDerived++
    } else {
      assigned[pIdx] = part
    }
  } else if (midCount >= 2) {
    const middle = parts.slice(pIdx, sIdx + 1)
    const sub = tryStrictWithGaps(midSlice, middle, rootIndex)
    if (sub) {
      for (let k = 0; k < sub.length; k++) assigned[pIdx + k] = sub[k]
    } else {
      // 兜底：中段部件按各自文本长度顺序认领词段（词段有剩余时至少认领
      // 1 个字母），保证不产生空 surface
      let cursor = 0
      for (let k = pIdx; k <= sIdx; k++) {
        const want = parts[k].surface ?? parts[k].text
        const take = cursor < midSlice.length
          ? Math.max(1, Math.min(want.length, midSlice.length - cursor))
          : 0
        const piece = midSlice.slice(cursor, cursor + take)
        cursor += take
        if (piece === want) {
          assigned[k] = parts[k]
        } else {
          assigned[k] = { ...parts[k], surface: piece }
          stats.surfacesDerived++
        }
      }
    }
  }

  const result = assigned.map((p, i) => p ?? parts[i])
  if (trailingLinker !== null) {
    result.push({ type: 'linker', text: trailingLinker, meaning: LINKER_MEANING })
    stats.linkers++
  }
  const concat = result.map(p => p.surface ?? p.text).join('')
  return concat === word ? result : null
}

function processEntry(entry: VocabEntry, rootIndex: RootIndex): VocabEntry {
  let parts: VocabPart[] = entry.parts.map(p => ({ ...p }))
  let ambiguous = false

  // ── 同化前缀规范化（仅 word-initial 的 root 部件）──
  const first = parts[0]
  if (
    first && first.type === 'root' &&
    first.text.length >= 1 && first.text.length <= 3 &&
    ASSIMILATED_PREFIXES[first.text]
  ) {
    const surface = first.text
    const canonical = ASSIMILATED_PREFIXES[surface]
    parts[0] = { type: 'prefix', text: canonical, meaning: first.meaning, surface }
    stats.converted++
    if (AMBIGUOUS_SURFACES.has(surface)) {
      ambiguous = true
      stats.ambiguous++
    }
  }

  // ── 完整划分校验 + 修复 ──
  const concat = parts.map(p => p.surface ?? p.text).join('')
  if (concat !== entry.word) {
    const repaired =
      tryStrictWithGaps(entry.word, parts, rootIndex) ??
      tryBothEnds(entry.word, parts, rootIndex)
    if (!repaired) {
      failures.push(`${entry.word}: 无法对齐 (${parts.map(p => p.text).join('+')})`)
      return { ...entry, parts, ...(ambiguous ? { parseQuality: 'low' as const } : {}) }
    }
    parts = repaired
  }

  const hasLinker = parts.some(p => p.type === 'linker')
  const low = hasLinker || ambiguous || parts.length === 0
  if (low) stats.lowQuality++
  return { ...entry, parts, ...(low ? { parseQuality: 'low' as const } : {}) }
}

// ────────────────────────── 主流程 ──────────────────────────

function main() {
  console.log('[build-vocab-v2] Loading source data...')
  const dataDir = join(process.cwd(), 'public', 'data')
  const vocab: VocabEntry[] = JSON.parse(readFileSync(join(dataDir, 'vocab.json'), 'utf-8'))
  const rootIndex: RootIndex = JSON.parse(readFileSync(join(dataDir, 'roots-index.json'), 'utf-8'))
  console.log(`  vocab: ${vocab.length} words`)
  console.log(`  rootIndex: ${Object.keys(rootIndex).length} roots`)

  console.log('[build-vocab-v2] Repairing entries...')
  const result = vocab.map(entry => processEntry(entry, rootIndex))

  console.log(`  converted (assimilated prefix): ${stats.converted}`)
  console.log(`  ambiguous conversions: ${stats.ambiguous}`)
  console.log(`  root extensions: ${stats.extended}`)
  console.log(`  linkers inserted: ${stats.linkers}`)
  console.log(`  surfaces derived: ${stats.surfacesDerived}`)
  console.log(`  low-quality entries: ${stats.lowQuality}`)

  // 最终校验：条数不变、顺序不变、每条拼接等于原词
  let mismatch = 0
  for (let i = 0; i < result.length; i++) {
    const entry = result[i]
    if (entry.word !== vocab[i].word) {
      failures.push(`顺序改变: #${i} ${vocab[i].word} -> ${entry.word}`)
      mismatch++
      continue
    }
    const c = entry.parts.map(p => p.surface ?? p.text).join('')
    if (c !== entry.word) { failures.push(`拼接不等于原词: ${entry.word} (${c})`); mismatch++ }
  }
  console.log(`  partition mismatches: ${mismatch}`)
  if (result.length !== vocab.length) failures.push(`条数变化: ${vocab.length} -> ${result.length}`)

  if (failures.length > 0) {
    console.error(`[build-vocab-v2] FAILED, ${failures.length} problem(s):`)
    for (const f of failures) console.error('  ' + f)
    process.exit(1)
  }

  const outPath = join(dataDir, 'vocab.json')
  writeFileSync(outPath, JSON.stringify(result), 'utf-8')
  console.log(`[build-vocab-v2] Output: ${outPath} (${result.length} entries)`)
}

main()
