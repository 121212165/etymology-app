// scripts/xcheck-wiktionary.ts
//
// 运行器：Wiktionary 词源数据源交叉校验
//   569 词根全量 × 每根 ≤2 抽样词，eng:word 起点 BFS（深度 4）
//   → public/data/xcheck-wiktionary.json（与另两路数据源同构，供合并器直接拼接）
//
// 用法：npx tsx scripts/xcheck-wiktionary.ts
// 数据：.cache/ety-wiktionary-etymologies.json（15MB，250 个顶层语言 section）。
// 内存要点：虽可整读，但沿用共享层 stream-json 的流式扫描更稳：每轮 BFS 只提取
// 「当前前沿语言」的顶层 section（最大单个 section 约 3.4MB），即取即放。
// 方向实测：条目为「派生词 → 词源词」（eng:vision → lat:visio），BFS 沿真实谱系向上。
// 确定性：无随机/时间戳，同输入重跑输出逐字节一致。

import { createReadStream, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { TopLevelJsonScanner } from '../src/lib/xcheck/stream-json'
import { collectAncestors, parseIndexWords, type EtymwnIndex } from '../src/lib/xcheck/etymwn'
import {
  checkRootWiktionary,
  expandFrontier,
  WIKT_MAX_DEPTH,
  type FrontierNode,
  type WordAncestry,
} from '../src/lib/xcheck/check-wiktionary'
import { pickSampleWords } from '../src/lib/xcheck/sampling'
import type {
  RootCheckResult,
  RootEntry,
  SourceInfo,
  SourceRunStatus,
  VocabEntryLike,
  WordCheckResult,
} from '../src/lib/xcheck/types'

const DATA_DIR = join(process.cwd(), 'public', 'data')
const CACHE_FILE = join(process.cwd(), '.cache', 'ety-wiktionary-etymologies.json')
const OUT_FILE = join(DATA_DIR, 'xcheck-wiktionary.json')
const MAX_PER_ROOT = 2

const SOURCE_INFO: SourceInfo = {
  id: 'wiktionary',
  description:
    '英文 Wiktionary 词源数据的开源转码 JSON（仓库 .cache 快照）：{语言:{词:[{词源形态:语言}]}}，条目方向为派生词→词源词；转码未附上游版本与许可标注，内容源为 Wiktionary（CC BY-SA / GFDL 双许可）',
  version: '未标注（仓库 .cache 转码快照）',
  license: 'Wiktionary CC BY-SA / GFDL（转码文件本身未标注）',
  origin: '英文 Wiktionary 词源章节（.cache/ety-wiktionary-etymologies.json，转码上游仓库未在文件中标注）',
}

const METHOD_NOTES = [
  '结构实测：{ [语言]: { [词]: Array<{ [词源形态]: 语言 }> } }，250 个顶层语言 section、28.6 万词条、47.3 万关系对；每对恒为单键（形态→语言码）',
  '关系有方向：条目是「派生词 → 词源词」（如 eng:vision → lat:visio），collectAncestors 的多跳遍历即真实词源谱系向上链，与 etymwn 路的无向关联不同',
  '该转码无 p_ie / p_lat / p_grc 顶层键，PIE 层证据在本数据源结构性缺失；希腊语形态多为希腊字母原文（如 γράφω），按 a-z 归一后为空串无法参与匹配，希腊词根证据天然偏少',
  'confirmed 判定：古典语（拉丁/希腊）强度≥2 命中≥1，或罗曼语（fro/frm/fra 等传播路径，间接证据）强度≥2 命中≥2（与 etymwn 路同规则，三源可比）；计数按「语言+归一形态」去重',
  'conflict 仅在抽样词词源链全为日耳曼语族（含 p_gem/p_gmw）且无任何古典/罗曼命中时判定；本数据方向真实，日耳曼纯链可信度高于 etymwn 的无向关联',
  'eng 顶层 10 万词，未收录抽样词（本次约占 1/3）一律如实 not_found 且 detail 注明「词条未收录」，不构成 conflict 也不算反证',
  '该源无英文 gloss（值恒为语言码）：meaningVerdict 一律 unverified，gloss 字段缺省，meaning-bridge 未启用',
  '词根全量校验；每根抽 ≤2 代表词（sampling.pickSampleWords，与其他数据源一致）；BFS 深度 4，每轮只流式提取当前前沿语言的顶层 section（不整读 15MB 文件）',
]

// ────────────────────────── 流式提取与索引构建 ──────────────────────────

/** 把一个顶层 section 解析出的待查词条并入索引（大小写别名兜底，保证 rels 引用可查） */
function mergeSection(index: EtymwnIndex, lang: string, raw: string, wanted: Set<string>): void {
  const entries = parseIndexWords(raw, wanted)
  const bucket = index[lang] || (index[lang] = {})
  for (const form of Object.keys(entries)) {
    const rels = entries[form]
    bucket[form] = rels
    const lower = form.toLowerCase()
    if (lower !== form && !bucket[lower]) bucket[lower] = rels
  }
}

/** 流式扫描文件，仅提取 wantedLangs 的顶层 section，逐个交给 onSection（原文即取即放） */
async function extractWantedSections(
  file: string,
  wantedLangs: Set<string>,
  onSection: (lang: string, raw: string) => void,
): Promise<void> {
  const scanner = new TopLevelJsonScanner((key) => wantedLangs.has(key))
  const stream = createReadStream(file, { encoding: 'utf8', highWaterMark: 1 << 20 })
  for await (const chunk of stream) {
    for (const sec of scanner.push(chunk)) {
      if (sec.raw) onSection(sec.key, sec.raw)
    }
  }
  for (const sec of scanner.push('')) {
    if (sec.raw) onSection(sec.key, sec.raw)
  }
  if (scanner.finish() !== 'done') {
    throw new Error(`ety-wiktionary JSON 流式解析未完整闭合（state=${scanner.state}）`)
  }
}

/**
 * 逐轮 BFS 构建部分索引：
 * 轮 1 提取 eng（起点词条）；轮 d 提取「深度 d-1 前沿语言」的 section 并展开。
 * 这样任何从起点出发深度 ≤ WIKT_MAX_DEPTH 的节点都能保证有其词条可供 collectAncestors 展开。
 */
async function buildIndex(
  file: string,
  startWords: string[],
): Promise<{ index: EtymwnIndex; frontierSizes: number[] }> {
  const index: EtymwnIndex = {}
  const expanded = new Set<string>()
  const startNodes: FrontierNode[] = startWords.map((w) => ({ lang: 'eng', form: w }))
  for (const n of startNodes) expanded.add(`${n.lang}:${n.form}`)

  const startForms = new Set<string>()
  for (const w of startWords) {
    startForms.add(w)
    startForms.add(w.toLowerCase())
  }
  await extractWantedSections(file, new Set(['eng']), (lang, raw) => mergeSection(index, lang, raw, startForms))

  let frontier = expandFrontier(index, startNodes, expanded)
  const frontierSizes = [frontier.length]
  for (let depth = 2; depth <= WIKT_MAX_DEPTH && frontier.length > 0; depth++) {
    const langs = new Set(frontier.map((n) => n.lang))
    const forms = new Set<string>()
    for (const n of frontier) {
      forms.add(n.form)
      forms.add(n.form.toLowerCase())
    }
    for (const n of frontier) expanded.add(`${n.lang}:${n.form}`)
    await extractWantedSections(file, langs, (lang, raw) => mergeSection(index, lang, raw, forms))
    frontier = expandFrontier(index, frontier, expanded)
    frontierSizes.push(frontier.length)
  }
  return { index, frontierSizes }
}

// ────────────────────────── 主流程 ──────────────────────────

async function main(): Promise<void> {
  const t0 = Date.now()
  const rootsData = JSON.parse(readFileSync(join(DATA_DIR, 'enhanced-roots.json'), 'utf-8')) as {
    roots: RootEntry[]
  }
  const roots: RootEntry[] = rootsData.roots
  const vocab = JSON.parse(readFileSync(join(DATA_DIR, 'vocab.json'), 'utf-8')) as VocabEntryLike[]

  // 抽样与其他数据源完全一致
  const samplesByRoot = roots.map((r) => pickSampleWords(r, vocab, MAX_PER_ROOT))
  const startWords = [...new Set(samplesByRoot.flat().map((s) => s.word))]

  let runStatus: SourceRunStatus
  const rootsOut: RootCheckResult[] = []
  const wordsOut: WordCheckResult[] = []
  let frontierSizes: number[] = []
  let indexEntries = 0
  let absentSamples = 0

  try {
    const { index, frontierSizes: sizes } = await buildIndex(CACHE_FILE, startWords)
    frontierSizes = sizes
    indexEntries = Object.values(index).reduce((n, bucket) => n + Object.keys(bucket).length, 0)

    // 同词跨词根只算一次 BFS（确定性：结果与逐根重算完全一致）
    const ancCache = new Map<string, WordAncestry>()
    const ancestryOf = (word: string): WordAncestry => {
      const hit = ancCache.get(word)
      if (hit) return hit
      const present = index.eng?.[word] !== undefined || index.eng?.[word.toLowerCase()] !== undefined
      const anc: WordAncestry = {
        hits: present ? collectAncestors(index, 'eng', word, WIKT_MAX_DEPTH) : [],
        present,
      }
      ancCache.set(word, anc)
      return anc
    }

    for (let i = 0; i < roots.length; i++) {
      const ancByWord = new Map<string, WordAncestry>()
      for (const s of samplesByRoot[i]) {
        const anc = ancestryOf(s.word)
        if (!anc.present) absentSamples++
        ancByWord.set(s.word, anc)
      }
      const out = checkRootWiktionary(roots[i], vocab, ancByWord)
      rootsOut.push(out.root)
      wordsOut.push(...out.words)
    }
    runStatus = {
      id: 'wiktionary',
      ok: true,
      note: `流式解析与 BFS 完成：起点词 ${startWords.length} 个，BFS 深度 ${WIKT_MAX_DEPTH}，各轮前沿 ${frontierSizes.join('/')}，索引词条 ${indexEntries} 个`,
    }
  } catch (err) {
    runStatus = {
      id: 'wiktionary',
      ok: false,
      note: `ety-wiktionary 解析失败，本源结果为空：${err instanceof Error ? err.message : String(err)}`,
    }
  }

  // conflict 构成说明（随输入确定性计算）：本源方向真实，日耳曼纯链即真实谱系
  const conflictRoots = rootsOut.filter((r) => r.status === 'conflict')
  const edgeConflicts = conflictRoots.filter((r) => r.layer === 'edge').length
  const methodNotes =
    conflictRoots.length > 0
      ? [
          ...METHOD_NOTES,
          `本次 conflict ${conflictRoots.length} 条（其中 edge 层 ${edgeConflicts} 条）：语义为「抽样词在数据集中被记录的词源链全为日耳曼语族、无任何古典/罗曼成分」——注意本数据中间形态词条稀疏（如 eng:arm → enm:arm 后无词条），古典分支可能只是未被本数据收录而非不存在：对 know/raid/land 等 edge 层日耳曼本源基础词应解读为「该词根本非古典语源」，对 core/middle 层（如 arm 武器、ang）则提示数据缺口或同形词可能，需人工复核`,
        ]
      : METHOD_NOTES

  const report = {
    source: 'wiktionary' as const,
    sourceInfo: SOURCE_INFO,
    runStatus,
    roots: rootsOut,
    words: wordsOut,
    methodNotes,
  }
  writeFileSync(OUT_FILE, JSON.stringify(report, null, 2) + '\n', 'utf-8')

  // 运行统计（stdout，供人工核对；不写入产物，保证产物确定性）
  const counts = { confirmed: 0, not_found: 0, conflict: 0 } as Record<string, number>
  for (const r of rootsOut) counts[r.status]++
  const wordCounts = { confirmed: 0, not_found: 0, conflict: 0 } as Record<string, number>
  for (const w of wordsOut) wordCounts[w.status]++
  const mem = process.memoryUsage()
  console.log(`[xcheck-wiktionary] roots=${rootsOut.length} confirmed=${counts.confirmed} not_found=${counts.not_found} conflict=${counts.conflict}`)
  console.log(`[xcheck-wiktionary] words=${wordsOut.length} confirmed=${wordCounts.confirmed} not_found=${wordCounts.not_found} conflict=${wordCounts.conflict}`)
  console.log(`[xcheck-wiktionary] startWords=${startWords.length} absentSamples=${absentSamples} frontierSizes=${frontierSizes.join('/')} indexEntries=${indexEntries}`)
  console.log(`[xcheck-wiktionary] heapUsed=${(mem.heapUsed / 1048576).toFixed(0)}MB rss=${(mem.rss / 1048576).toFixed(0)}MB elapsed=${((Date.now() - t0) / 1000).toFixed(1)}s`)
  console.log(`[xcheck-wiktionary] written: ${OUT_FILE} (ok=${runStatus.ok})`)
}

main().catch((err) => {
  console.error('[xcheck-wiktionary] failed:', err)
  process.exit(1)
})
