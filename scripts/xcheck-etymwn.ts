// scripts/xcheck-etymwn.ts
//
// 运行器：etymwn（Etymological Wordnet）数据源交叉校验
//   569 词根全量 × 每根 ≤2 抽样词，eng:word 起点 BFS（深度 4）
//   → public/data/xcheck-etymwn.json（与另两路数据源同构，供合并器直接拼接）
//
// 用法：npx tsx scripts/xcheck-etymwn.ts
// 内存要点：98MB 数据文件不整读。每轮 BFS 只流式提取「当前前沿语言」的顶层
// section（单 section 最大约 22MB 的 lat），提取后立即解析出待查词条并释放原文。
// 确定性：无随机/时间戳，同输入重跑输出逐字节一致。

import { createReadStream, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { TopLevelJsonScanner } from '../src/lib/xcheck/stream-json'
import { collectAncestors, parseIndexWords, type EtymwnIndex } from '../src/lib/xcheck/etymwn'
import {
  checkRootEtymwn,
  expandFrontier,
  ETYMW_MAX_DEPTH,
  type FrontierNode,
} from '../src/lib/xcheck/check-etymwn'
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
const CACHE_FILE = join(process.cwd(), '.cache', 'etymwn-etymologies.json')
const OUT_FILE = join(DATA_DIR, 'xcheck-etymwn.json')
const MAX_PER_ROOT = 2

const SOURCE_INFO: SourceInfo = {
  id: 'etymwn',
  description:
    'Etymological Wordnet 词源关系三元组（多 mined 自英文 Wiktionary 并含人工补充；本仓库 .cache 为去关系列的开源转码 JSON）',
  version: '2013-02-08',
  license: 'CC-BY-SA 3.0',
  origin: 'Gerard de Melo, http://icsi.berkeley.edu/~demelo/etymwn/（转码：github.com/parker57/making-sense-of-etymwn）',
}

const METHOD_NOTES = [
  'etymwn 2013-02-08 转码为无向词源关联边：原 TSV 的 8 种关系名与方向均已丢弃，collectAncestors 的多跳「祖先」是关联邻居而非严格谱系',
  '该转码无 p_ie（原始印欧语）与 p_lat/p_grc 顶层键，PIE 层证据在本数据源结构性缺失',
  '希腊语形态多为希腊字母原文（如 βίος），按 a-z 归一后为空串无法参与匹配，故希腊词根证据天然偏少',
  'confirmed 判定：古典语（拉丁/希腊）强度≥2 命中≥1，或罗曼语（古法语等传播路径，间接证据）强度≥2 命中≥2；计数按「语言+归一形态」去重',
  'conflict 仅在抽样词祖先全为日耳曼语族（含 p_gem/p_gmw）且无任何古典/罗曼命中时判定，其余无命中一律 not_found（从保守）',
  'etymwn 无英文 gloss：meaningVerdict 一律 unverified，gloss 字段缺省',
  '词根全量校验；每根抽 ≤2 代表词（sampling.pickSampleWords，与其他数据源一致）；BFS 深度 4，每轮只流式提取当前前沿语言的顶层 section（不整读 98MB 文件）',
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

/** 流式扫描 98MB 文件，仅提取 wantedLangs 的顶层 section，逐个交给 onSection（原文即取即放） */
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
    throw new Error(`etymwn JSON 流式解析未完整闭合（state=${scanner.state}）`)
  }
}

/**
 * 逐轮 BFS 构建部分索引：
 * 轮 1 提取 eng（起点词条）；轮 d 提取「深度 d-1 前沿语言」的 section 并展开。
 * 这样任何从起点出发深度 ≤ ETYMW_MAX_DEPTH 的节点都能保证有其词条可供 collectAncestors 展开。
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
  for (let depth = 2; depth <= ETYMW_MAX_DEPTH && frontier.length > 0; depth++) {
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

  try {
    const { index, frontierSizes: sizes } = await buildIndex(CACHE_FILE, startWords)
    frontierSizes = sizes
    indexEntries = Object.values(index).reduce((n, bucket) => n + Object.keys(bucket).length, 0)

    for (let i = 0; i < roots.length; i++) {
      const ancestorsByWord = new Map<string, EtymonHit[]>()
      for (const s of samplesByRoot[i]) {
        ancestorsByWord.set(s.word, collectAncestors(index, 'eng', s.word, ETYMW_MAX_DEPTH))
      }
      const out = checkRootEtymwn(roots[i], vocab, ancestorsByWord)
      rootsOut.push(out.root)
      wordsOut.push(...out.words)
    }
    runStatus = {
      id: 'etymwn',
      ok: true,
      note: `流式解析与 BFS 完成：起点词 ${startWords.length} 个，BFS 深度 ${ETYMW_MAX_DEPTH}，各轮前沿 ${frontierSizes.join('/')}，索引词条 ${indexEntries} 个`,
    }
  } catch (err) {
    runStatus = {
      id: 'etymwn',
      ok: false,
      note: `etymwn 解析失败，本源结果为空：${err instanceof Error ? err.message : String(err)}`,
    }
  }

  // conflict 构成说明（随输入确定性计算）：多数 conflict 为 edge 层日耳曼本源基础词
  const conflictRoots = rootsOut.filter((r) => r.status === 'conflict')
  const edgeConflicts = conflictRoots.filter((r) => r.layer === 'edge').length
  const methodNotes =
    conflictRoots.length > 0
      ? [
          ...METHOD_NOTES,
          `本次 conflict ${conflictRoots.length} 条（其中 edge 层 ${edgeConflicts} 条）：语义为「抽样词的 etymwn 祖先路径全为日耳曼语族、无任何古典/罗曼成分」，对 know/king/land 等 edge 层日耳曼本源基础词应解读为「该词根本非古典语源」，对 middle/core 层（如 arm 武器）则提示抽样词可能为同形词或证据链过短，需人工复核`,
        ]
      : METHOD_NOTES

  const report = {
    source: 'etymwn' as const,
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
  console.log(`[xcheck-etymwn] roots=${rootsOut.length} confirmed=${counts.confirmed} not_found=${counts.not_found} conflict=${counts.conflict}`)
  console.log(`[xcheck-etymwn] words=${wordsOut.length} confirmed=${wordCounts.confirmed} not_found=${wordCounts.not_found} conflict=${wordCounts.conflict}`)
  console.log(`[xcheck-etymwn] startWords=${startWords.length} frontierSizes=${frontierSizes.join('/')} indexEntries=${indexEntries}`)
  console.log(`[xcheck-etymwn] heapUsed=${(mem.heapUsed / 1048576).toFixed(0)}MB rss=${(mem.rss / 1048576).toFixed(0)}MB elapsed=${((Date.now() - t0) / 1000).toFixed(1)}s`)
  console.log(`[xcheck-etymwn] written: ${OUT_FILE} (ok=${runStatus.ok})`)
}

main().catch((err) => {
  console.error('[xcheck-etymwn] failed:', err)
  process.exit(1)
})
