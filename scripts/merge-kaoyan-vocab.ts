// scripts/merge-kaoyan-vocab.ts
//
// 把考研词库中现有词库没有的词（约 1447 个）跑词根拆分并并入 vocab.json。
//
// 分段策略（确定性、保守）：
// - 词根候选 = roots-index.json 的键（curated 集合，保证 roots-index 索引一致性，
//   不引入新词根键）；前缀/后缀候选 = 现有 vocab 拆分中 type=prefix/suffix 且
//   出现 ≥5 次的形态（含众数词义）
// - DFS 最长优先匹配，允许最多 1 处 ≤2 字母的缺口（记 linker，parseQuality:"low"）
// - 全词覆盖才收词；至少含 1 个 root 部件；拆不动 → parts=[]（parseQuality:"low"）
//   ——宁可少拆不拆错
// - 专有名词（首字母大写）不拆——拆出来是伪部件；杂项（非纯字母/连字符）不入库
//
// 合并策略：
// - 现有条目原样保留（索引不位移），新词追加在尾部；word 重复（含大小写折叠撞车）跳过
// - roots-index.json 增量更新：既有键的 w 追加新词下标（m 不动），不新增键
//
// 用法：npm run build:kaoyan-merge
// 之后需依次运行 build:vocab2 → build:mindmap → build:derivations 刷新下游。

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { VocabEntry, VocabPart, RootIndex } from '../src/lib/types'

const DATA_DIR = join(process.cwd(), 'public', 'data')

// ────────────────────────── 语素清单 ──────────────────────────

interface Morpheme {
  text: string
  meaning: string
  type: VocabPart['type']
}

function majorityMeaning(entries: { text: string; meaning: string }[]): string {
  const votes = new Map<string, number>()
  for (const e of entries) votes.set(e.meaning, (votes.get(e.meaning) ?? 0) + 1)
  let best = ''
  let n = -1
  for (const [m, c] of votes) {
    if (c > n || (c === n && m < best)) {
      n = c
      best = m
    }
  }
  return best
}

function buildInventories(vocab: VocabEntry[], rootIndex: RootIndex) {
  const prefixVotes = new Map<string, { text: string; meaning: string }[]>()
  const suffixVotes = new Map<string, { text: string; meaning: string }[]>()
  for (const entry of vocab) {
    for (const p of entry.parts ?? []) {
      if (p.type !== 'prefix' && p.type !== 'suffix') continue
      const bucket = p.type === 'prefix' ? prefixVotes : suffixVotes
      if (!bucket.has(p.text)) bucket.set(p.text, [])
      bucket.get(p.text)!.push({ text: p.text, meaning: p.meaning })
    }
  }
  const MIN_FREQ = 5
  const morphemes: Morpheme[] = []
  for (const [text, list] of prefixVotes) {
    if (list.length >= MIN_FREQ) morphemes.push({ text: text.toLowerCase(), meaning: majorityMeaning(list), type: 'prefix' })
  }
  for (const [text, list] of suffixVotes) {
    if (list.length >= MIN_FREQ) morphemes.push({ text: text.toLowerCase(), meaning: majorityMeaning(list), type: 'suffix' })
  }
  // 词根只取 curated roots-index 键（带 m 词义），不引入新键
  for (const [text, entry] of Object.entries(rootIndex)) {
    if (text.length >= 2) morphemes.push({ text: text.toLowerCase(), meaning: entry.m, type: 'root' })
  }
  // 同形态前缀/后缀/词根并存时：前缀 > 后缀 > 词根（词首/词尾角色优先，减少歧义）
  const typeRank: Record<VocabPart['type'], number> = { prefix: 0, suffix: 1, root: 2, linker: 3 }
  morphemes.sort(
    (a, b) => b.text.length - a.text.length || typeRank[a.type] - typeRank[b.type] || (a.text < b.text ? -1 : 1),
  )
  return morphemes
}

// ────────────────────────── 分段 ──────────────────────────

const MAX_GAPS = 1
const MAX_GAP_LEN = 2

interface Segmentation {
  parts: VocabPart[]
  gaps: number
}

/** 在 pos 处尝试所有语素（调用方已按长度降序排列），首个完整覆盖的路径即结果 */
function dfs(
  word: string,
  pos: number,
  morphemes: Morpheme[],
  acc: VocabPart[],
  gaps: number,
  memo: Map<string, Segmentation | null>,
): Segmentation | null {
  if (pos === word.length) return { parts: [...acc], gaps }
  const memoKey = `${pos}:${gaps}`
  if (memo.has(memoKey)) return memo.get(memoKey)!
  for (const m of morphemes) {
    if (word.startsWith(m.text, pos)) {
      acc.push({ type: m.type, text: m.text, meaning: m.meaning })
      const found = dfs(word, pos + m.text.length, morphemes, acc, gaps, memo)
      acc.pop()
      if (found) {
        memo.set(memoKey, found)
        return found
      }
    }
  }
  // 缺口：跳过 1..MAX_GAP_LEN 个字母记 linker（出现 ≤MAX_GAPS 处）
  if (gaps < MAX_GAPS) {
    for (let len = 1; len <= MAX_GAP_LEN && pos + len <= word.length; len++) {
      acc.push({ type: 'linker', text: word.slice(pos, pos + len), meaning: '衔接' })
      const found = dfs(word, pos + len, morphemes, acc, gaps + 1, memo)
      acc.pop()
      if (found) {
        memo.set(memoKey, found)
        return found
      }
    }
  }
  memo.set(memoKey, null)
  return null
}

function segment(word: string, morphemes: Morpheme[]): VocabPart[] | null {
  const seg = dfs(word.toLowerCase(), 0, morphemes, [], 0, new Map())
  if (!seg) return null
  // 至少含 1 个 root 部件才算有效拆分（纯前缀/后缀拼接是伪拆分）
  if (!seg.parts.some((p) => p.type === 'root')) return null
  return seg.parts
}

// ────────────────────────── 主流程 ──────────────────────────

function main() {
  const vocab: VocabEntry[] = JSON.parse(readFileSync(join(DATA_DIR, 'vocab.json'), 'utf-8'))
  const rootIndex: RootIndex = JSON.parse(readFileSync(join(DATA_DIR, 'roots-index.json'), 'utf-8'))
  const kaoyan: { word: string; tran: string; pos?: string }[] = JSON.parse(
    readFileSync(join(DATA_DIR, 'kaoyan-vocab.json'), 'utf-8'),
  )

  const existingExact = new Set(vocab.map((e) => e.word))
  const existingFold = new Set(vocab.map((e) => e.word.toLowerCase()))
  const morphemes = buildInventories(vocab, rootIndex)
  console.log(`[merge-kaoyan] 现有词条 ${vocab.length}，语素清单 ${morphemes.length} 条`)

  const appended: VocabEntry[] = []
  let skippedExact = 0
  let skippedFold = 0
  let skippedJunk = 0
  // 只收纯字母（可含连字符）的词；「a.」之类的源数据杂项不入库
  const WORD_RE = /^[a-zA-Z][a-zA-Z-]*$/
  for (const k of kaoyan) {
    if (!WORD_RE.test(k.word)) {
      skippedJunk++
      continue
    }
    if (existingExact.has(k.word) || appended.some((a) => a.word === k.word)) {
      skippedExact++
      continue
    }
    if (existingFold.has(k.word.toLowerCase())) {
      skippedFold++
      continue
    }
    // 专有名词（首字母大写）不做词根拆分——拆出来是伪部件，只收词义
    const parts = /^[A-Z]/.test(k.word) ? [] : segment(k.word, morphemes)
    appended.push({
      word: k.word,
      definition: k.tran,
      parts: parts ?? [],
      parseQuality: 'low',
      kaoyan: true,
    })
  }

  const parsed = appended.filter((e) => e.parts.length > 0)
  const withLinker = parsed.filter((e) => e.parts.some((p) => p.type === 'linker'))
  console.log(`[merge-kaoyan] 新增 ${appended.length}（跳过已存在 ${skippedExact}，大小写撞车 ${skippedFold}，杂项 ${skippedJunk}）`)
  console.log(`[merge-kaoyan] 拆分成功 ${parsed.length}（${((parsed.length / appended.length) * 100).toFixed(1)}%），其中含 linker ${withLinker.length}；纯空 ${appended.length - parsed.length}`)

  // 抽样核对
  const samples = parsed.slice(0, 12).map((e) => `${e.word} = ${e.parts.map((p) => (p.type === 'linker' ? `[${p.text}]` : `${p.text}(${p.meaning})`)).join(' + ')}`)
  console.log('[merge-kaoyan] 拆分样例:')
  for (const s of samples) console.log('   ', s)
  const emptySamples = appended.filter((e) => e.parts.length === 0).slice(0, 8).map((e) => e.word)
  console.log('[merge-kaoyan] 未拆出样例:', emptySamples.join('、'))

  // 追加（现有索引不位移）+ roots-index 增量（既有键 w 追加，不新增键）
  const nextVocab = [...vocab, ...appended]
  const newRootHits = new Map<string, number[]>()
  appended.forEach((entry, i) => {
    const idx = vocab.length + i
    for (const p of entry.parts) {
      if (p.type !== 'root') continue
      const key = Object.keys(rootIndex).find((t) => t.toLowerCase() === p.text)
      if (!key) continue // 理论不可达：词根候选即 roots-index 键
      if (!newRootHits.has(key)) newRootHits.set(key, [])
      newRootHits.get(key)!.push(idx)
    }
  })
  let touchedKeys = 0
  for (const [key, idxs] of newRootHits) {
    const before = rootIndex[key].w.length
    rootIndex[key] = { m: rootIndex[key].m, w: [...rootIndex[key].w, ...idxs].sort((a, b) => a - b) }
    touchedKeys++
    if (touchedKeys <= 5) console.log(`[merge-kaoyan] roots-index ${key}: ${before} → ${rootIndex[key].w.length} 词`)
  }
  console.log(`[merge-kaoyan] roots-index 更新键数 ${touchedKeys}（词根覆盖扩大，层级由 build:mindmap 重算）`)

  writeFileSync(join(DATA_DIR, 'vocab.json'), JSON.stringify(nextVocab, null, 2) + '\n', 'utf-8')
  writeFileSync(join(DATA_DIR, 'roots-index.json'), JSON.stringify(rootIndex, null, 2) + '\n', 'utf-8')
  console.log(`[merge-kaoyan] vocab.json: ${vocab.length} → ${nextVocab.length}；roots-index.json 已增量更新`)
}

main()
