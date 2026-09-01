// scripts/xcheck-etymonline.ts
//
// 运行器：etymonline 词源镜像交叉校验
//   569 词根全量 × 每根 ≤2 抽样词，在 46000+ 词条的词源叙述文本中
//   抽取 (形态, gloss, 语言) 证据 → public/data/xcheck-etymonline.json
//   （与另两路数据源同构，供合并器直接拼接）
//
// 用法：npx tsx scripts/xcheck-etymonline.ts
// 数据：.cache/etymonline-index.json（19MB，[{word, etymology, years[]}] 数组）。
// 内存要点：顶层是数组而非对象，TopLevelJsonScanner（对象 section 扫描）不适用；
// 46k 条小对象整读 JSON.parse 峰值约 200MB，可接受且最简单，换取确定性。
// 本源特有：唯一带英文 gloss 的源，meaning-bridge 机判 match/mismatch 在此发生。
// 确定性：无随机/时间戳，同输入重跑输出逐字节一致。

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { EtymonlineEntry } from '../src/lib/xcheck/etymonline'
import { mapEntries, checkRootEtymonline } from '../src/lib/xcheck/check-etymonline'
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
const CACHE_FILE = join(process.cwd(), '.cache', 'etymonline-index.json')
const OUT_FILE = join(DATA_DIR, 'xcheck-etymonline.json')
const MAX_PER_ROOT = 2

const SOURCE_INFO: SourceInfo = {
  id: 'etymonline',
  description:
    'etymonline.com（Online Etymology Dictionary）词条词源叙述文本的开源抓取镜像（仓库 .cache 快照）：[{word, etymology, years[]}]，46000+ 词条；证据为从叙述文本抽取的 (形态, 英文gloss, 语言) 三元组',
  version: '未标注（仓库 .cache 抓取快照）',
  license: '词源文本内容版权归 Online Etymology Dictionary（etymonline.com），本仓库仅作研究性交叉核验，不再分发原文',
  origin: 'yosevu/etymonline（GitHub 抓取镜像）→ .cache/etymonline-index.json',
}

const METHOD_NOTES = [
  '结构实测：顶层 JSON 数组 [{word, etymology, years[]}]，etymology 为英文词源叙述文本（如 from Latin visionem "act of seeing"）；证据由共享层 extractGlossSegments 以正则从文本抽取 (形态, 引号内gloss, 就近语言) 三元组，语言归属按就近出现的关键词（Latin/Old French/PIE 等）',
  'confirmed 判定与另两路一致：古典语（拉丁/希腊）强度≥2 命中≥1，或罗曼语强度≥2 命中≥2（计数按「语言+归一形态」去重）',
  'conflict 为启发式（本源是文本不是结构化谱系）：无任何强度≥2 命中、且叙述只提及日耳曼语源（Old English/Old Norse 等）而完全不提古典/罗曼语言时判定；叙述文本无匹配片段但提及古典语言的如实 not_found',
  '本源是三路中唯一带英文 gloss 的：meaningVerdict 由 meaning-bridge 机判（桥表覆盖 core 36 + middle 24 词根，形态类词根无桥表条目如实 unverified）；每条 match/mismatch 均附 gloss 原文供人工复核',
  '词根全量校验；每根抽 ≤2 代表词（sampling.pickSampleWords，与其他数据源一致）；词条未收录的抽样词如实 not_found（detail 注明），不构成反证',
]

// ────────────────────────── 主流程 ──────────────────────────

async function main(): Promise<void> {
  const t0 = Date.now()
  const rootsData = JSON.parse(readFileSync(join(DATA_DIR, 'enhanced-roots.json'), 'utf-8')) as {
    roots: RootEntry[]
  }
  const roots: RootEntry[] = rootsData.roots
  const vocab = JSON.parse(readFileSync(join(DATA_DIR, 'vocab.json'), 'utf-8')) as VocabEntryLike[]

  // 抽样统计（与其他数据源一致：每根 ≤2 词）
  const sampleCount = roots.reduce((n, r) => n + pickSampleWords(r, vocab, MAX_PER_ROOT).length, 0)

  let runStatus: SourceRunStatus
  const rootsOut: RootCheckResult[] = []
  const wordsOut: WordCheckResult[] = []
  let entryCount = 0

  try {
    const raw = readFileSync(CACHE_FILE, 'utf-8')
    const entries = JSON.parse(raw) as EtymonlineEntry[]
    if (!Array.isArray(entries)) throw new Error('etymonline-index.json 顶层不是数组，结构与预期不符')
    entryCount = entries.length
    const entryMap = mapEntries(entries)

    for (const root of roots) {
      const out = checkRootEtymonline(root, vocab, entryMap)
      rootsOut.push(out.root)
      wordsOut.push(...out.words)
    }
    runStatus = {
      id: 'etymonline',
      ok: true,
      note: `词条 ${entryCount} 个，抽样词 ${sampleCount} 个（每根 ≤${MAX_PER_ROOT}），词源文本证据抽取完成`,
    }
  } catch (err) {
    runStatus = {
      id: 'etymonline',
      ok: false,
      note: `etymonline 解析失败，本源结果为空：${err instanceof Error ? err.message : String(err)}`,
    }
  }

  const report = {
    source: 'etymonline' as const,
    sourceInfo: SOURCE_INFO,
    runStatus,
    roots: rootsOut,
    words: wordsOut,
    methodNotes: METHOD_NOTES,
  }
  writeFileSync(OUT_FILE, JSON.stringify(report, null, 2) + '\n', 'utf-8')

  // 运行统计（stdout 供人工核对；不写入产物，保证产物确定性）
  const counts = { confirmed: 0, not_found: 0, conflict: 0 } as Record<string, number>
  for (const r of rootsOut) counts[r.status]++
  const verdicts = { match: 0, mismatch: 0, unverified: 0 } as Record<string, number>
  for (const w of wordsOut) verdicts[w.meaningVerdict]++
  const mem = process.memoryUsage()
  console.log(`[xcheck-etymonline] roots=${rootsOut.length} confirmed=${counts.confirmed} not_found=${counts.not_found} conflict=${counts.conflict}`)
  console.log(`[xcheck-etymonline] words=${wordsOut.length} verdicts=${JSON.stringify(verdicts)}`)
  console.log(`[xcheck-etymonline] entries=${entryCount} heapUsed=${(mem.heapUsed / 1048576).toFixed(0)}MB rss=${(mem.rss / 1048576).toFixed(0)}MB elapsed=${((Date.now() - t0) / 1000).toFixed(1)}s`)
  console.log(`[xcheck-etymonline] written: ${OUT_FILE} (ok=${runStatus.ok})`)
}

main().catch((err) => {
  console.error('[xcheck-etymonline] failed:', err)
  process.exit(1)
})
