// scripts/build-kaoyan.ts
//
// 接入开源考研词库（GitHub kajweb/dict，有道/新东方考研三本书）：
// 读 .cache/raw/KaoYan_*.json（NDJSON，需先下载并解压）→ 归一化去重 →
// 产出 public/data/kaoyan-vocab.json，并与现有 vocab.json 做交集统计。
//
// 数据约定：
// - 源文件为 NDJSON（每行一个对象，非 JSON 数组），字段见 scripts/lib/kaoyan.ts
// - word 保留源大小写（专有名词 March/X-ray 等不强转小写，保证可溯源）
// - 交集按 word 精确匹配（区分大小写）
//
// 源文件获取（缺失时脚本会报错并打印本段指引）：
//   mkdir -p .cache/raw
//   curl -L -C - -o .cache/book/1521164669833_KaoYan_1.zip https://raw.githubusercontent.com/kajweb/dict/master/book/1521164669833_KaoYan_1.zip
//   curl -L -C - -o .cache/book/1521164654696_KaoYan_2.zip https://raw.githubusercontent.com/kajweb/dict/master/book/1521164654696_KaoYan_2.zip
//   curl -L -C - -o .cache/book/1521164658897_KaoYan_3.zip https://raw.githubusercontent.com/kajweb/dict/master/book/1521164658897_KaoYan_3.zip
//   unzip -o .cache/book/*.zip -d .cache/raw
//
// 用法：npm run build:kaoyan（可重复运行，幂等）
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import {
  computeIntersection,
  dedupeWords,
  normalizeWord,
  parseNdjson,
  sortEntries,
  type KaoYanEntry,
  type KaoYanBookStats,
} from './lib/kaoyan'

/** 参与并集的书目（权威书序；KaoYanluan_1 为 KaoYan_1 乱序版，词集相同，不参与） */
const SOURCES = [
  { file: 'KaoYan_1.json', title: '考研必考词汇（正序版）', zip: '1521164669833_KaoYan_1.zip', words: 1341 },
  { file: 'KaoYan_2.json', title: '考研英语词汇', zip: '1521164654696_KaoYan_2.zip', words: 4533 },
  { file: 'KaoYan_3.json', title: '新东方考研词汇', zip: '1521164658897_KaoYan_3.zip', words: 3728 },
] as const

const DICT_RAW_URL = 'https://raw.githubusercontent.com/kajweb/dict/master/book'

function main() {
  const cacheDir = join(process.cwd(), '.cache')
  const rawDir = join(cacheDir, 'raw')

  // ── 源文件检查：缺失时给出下载指引而不是崩溃 ──
  const missing = SOURCES.filter(s => !existsSync(join(rawDir, s.file)))
  if (missing.length > 0) {
    console.error('[build-kaoyan] 缺少源文件，请先下载并解压到 .cache/raw/：')
    for (const s of missing) {
      console.error(`  mkdir -p .cache/book && curl -L -C - -o .cache/book/${s.zip} ${DICT_RAW_URL}/${s.zip}`)
    }
    console.error('  unzip -o .cache/book/*.zip -d .cache/raw')
    console.error('（详见 docs/kaoyan-vocab.md「数据来源」一节）')
    process.exit(1)
  }

  // ── 解析 + 归一化 ──
  console.log('[build-kaoyan] Parsing source files...')
  const perBook: { bookFile: string; entries: KaoYanEntry[] }[] = []
  const bookStats: KaoYanBookStats[] = []
  for (const s of SOURCES) {
    const raws = parseNdjson(readFileSync(join(rawDir, s.file), 'utf-8'))
    const entries: KaoYanEntry[] = []
    let skipped = 0
    for (const raw of raws) {
      const entry = normalizeWord(raw)
      if (entry) entries.push(entry)
      else skipped++
    }
    perBook.push({ bookFile: s.file, entries })
    bookStats.push({ bookFile: s.file, lines: raws.length, skipped })
    console.log(`  ${s.file}（${s.title}）: ${raws.length} 行 -> ${entries.length} 条${skipped ? `，跳过 ${skipped} 条无释义` : ''}`)
  }

  // ── 跨书去重 + 确定性排序 ──
  console.log('[build-kaoyan] Deduping across books...')
  const { entries, duplicatesMerged } = dedupeWords(perBook)
  console.log(`  cross-book duplicates merged: ${duplicatesMerged}`)
  const sorted = sortEntries(entries)
  console.log(`  kaoyan-vocab: ${sorted.length} words`)

  // ── 与现有 vocab.json 的交集统计 ──
  const vocabPath = join(process.cwd(), 'public', 'data', 'vocab.json')
  const vocab: { word: string }[] = JSON.parse(readFileSync(vocabPath, 'utf-8'))
  const stats = computeIntersection(sorted.map(e => e.word), vocab.map(v => v.word))
  console.log('[build-kaoyan] Intersection with vocab.json:')
  console.log(`  考研词库总词数: ${stats.total}`)
  console.log(`  与 vocab.json（${vocab.length} 词）重合: ${stats.overlap}`)
  console.log(`  重合率（重合/考研词库）: ${(stats.overlapRate * 100).toFixed(1)}%`)
  console.log(`  vocab.json 覆盖率（重合/5011）: ${(stats.vocabCoverage * 100).toFixed(1)}%`)
  console.log(`  新增词数: ${stats.added}`)

  // ── 写出（compact JSON，与 vocab.json 一致；排序确定性保证幂等） ──
  const outPath = join(process.cwd(), 'public', 'data', 'kaoyan-vocab.json')
  mkdirSync(join(process.cwd(), 'public', 'data'), { recursive: true })
  writeFileSync(outPath, JSON.stringify(sorted), 'utf-8')
  console.log(`[build-kaoyan] Output: ${outPath} (${sorted.length} entries)`)

  // 新增词抽样（人工核对用）
  const vocabWords = new Set(vocab.map(v => v.word))
  const added = sorted.filter(e => !vocabWords.has(e.word)).map(e => e.word)
  console.log('  新增词样例 10 个:', added.slice(0, 10).join(', '))
}

main()
