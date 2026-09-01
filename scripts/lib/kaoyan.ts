// scripts/lib/kaoyan.ts
//
// 开源考研词库（kajweb/dict）的纯函数处理层：NDJSON 解析 → 归一化 →
// 跨书去重 → 确定性排序 → 与 vocab.json 的交集统计。
// 不做任何 IO，便于单测（scripts/lib/__tests__/kaoyan.test.ts）。

/** 归一化后的考研词条（public/data/kaoyan-vocab.json 的元素） */
export interface KaoYanEntry {
  word: string
  /** 词性，多词性按源顺序用 "/" 连接（如 "n/v"）；源缺失时省略 */
  pos?: string
  /** 中文释义，多条按源顺序用 "；" 连接 */
  tran: string
  book: 'kaoyan'
}

/** kajweb/dict 源 JSON 单行（NDJSON）中与本管线相关的字段 */
export interface KaoYanRawEntry {
  wordRank: number
  headWord: string
  content: {
    word: {
      wordHead: string
      content: {
        trans?: { tranCn?: string; pos?: string }[]
      }
    }
  }
}

/** 单书解析统计 */
export interface KaoYanBookStats {
  bookFile: string
  lines: number
  /** 无可用释义而被跳过的行数 */
  skipped: number
}

/** 交集统计结果 */
export interface KaoYanIntersectionStats {
  /** 归一化去重后的考研词库总词数 */
  total: number
  /** 与现有词库重合的词数 */
  overlap: number
  /** 重合词数 / 考研词库总词数 */
  overlapRate: number
  /** 重合词数 / 现有词库总词数（覆盖率） */
  vocabCoverage: number
  /** 考研词库中现有词库没有的词数 */
  added: number
}

// ────────────────────────── 解析 ──────────────────────────

/**
 * 解析 kajweb/dict 的 NDJSON 源文件（每行一个 JSON 对象，非 JSON 数组）。
 * 跳过空行；某一行非法时抛出带行号的错误——源数据必须逐条可溯源，
 * 静默丢弃不可接受。
 */
export function parseNdjson(raw: string): KaoYanRawEntry[] {
  const entries: KaoYanRawEntry[] = []
  const lines = raw.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    try {
      entries.push(JSON.parse(line) as KaoYanRawEntry)
    } catch {
      throw new Error(`第 ${i + 1} 行不是合法 JSON（源文件可能不完整，请重新下载）: ${line.slice(0, 80)}`)
    }
  }
  return entries
}

// ────────────────────────── 归一化 ──────────────────────────

/** 词条的"释义丰富度"：trans 条数多者优先（用于跨书去重） */
function tranFullness(e: KaoYanEntry): number {
  return e.tran.length
}

/**
 * 单条源记录 → 归一化词条。headWord 与 word.wordHead 已核对一致，
 * 取 headWord；无可用中文释义时返回 null（调用方计入 skipped）。
 * 词性保留源拼写（n/adj/vt...），多条不合并大小写；word 保留源大小写
 * （专有名词如 March/X-ray 不强转小写，保证可溯源）。
 */
export function normalizeWord(raw: KaoYanRawEntry): KaoYanEntry | null {
  const word = raw.headWord?.trim()
  const trans = raw.content?.word?.content?.trans ?? []
  const tran = trans
    .map(t => (t.tranCn ?? '').trim())
    .filter(Boolean)
    .join('；')
  if (!word || !tran) return null
  const pos = [...new Set(trans.map(t => (t.pos ?? '').trim()).filter(Boolean))].join('/')
  const entry: KaoYanEntry = { word, tran, book: 'kaoyan' }
  if (pos) entry.pos = pos
  return entry
}

// ────────────────────────── 去重与排序 ──────────────────────────

/**
 * 按 word 去重（同一词出现在多本书时取并集，保留释义最全的一条）。
 * 平局规则（保证确定性）：trans 条数多者优先 → 先出现的书优先
 * （books 数组顺序即权威书序）→ tran 字典序小者。
 */
export function dedupeWords(
  perBook: { bookFile: string; entries: KaoYanEntry[] }[],
): { entries: KaoYanEntry[]; duplicatesMerged: number } {
  const best = new Map<string, { entry: KaoYanEntry; bookIdx: number }>()
  let duplicatesMerged = 0
  for (let bookIdx = 0; bookIdx < perBook.length; bookIdx++) {
    for (const entry of perBook[bookIdx].entries) {
      const prev = best.get(entry.word)
      if (!prev) {
        best.set(entry.word, { entry, bookIdx })
        continue
      }
      duplicatesMerged++
      if (pickFullest(prev.entry, entry, prev.bookIdx, bookIdx) === 1) {
        best.set(entry.word, { entry, bookIdx })
      }
    }
  }
  return { entries: [...best.values()].map(v => v.entry), duplicatesMerged }
}

/** 去重保留规则的比较器：返回应保留的候选下标（0/1），严格弱序、无歧义 */
function pickFullest(a: KaoYanEntry, b: KaoYanEntry, bookIdxA: number, bookIdxB: number): 0 | 1 {
  const fa = tranFullness(a)
  const fb = tranFullness(b)
  if (fa !== fb) return fa > fb ? 0 : 1
  if (bookIdxA !== bookIdxB) return bookIdxA < bookIdxB ? 0 : 1
  return a.tran <= b.tran ? 0 : 1
}

/** 按 word 的码元序排序（不用 localeCompare，避免 ICU 差异破坏确定性） */
export function sortEntries(entries: KaoYanEntry[]): KaoYanEntry[] {
  return [...entries].sort((a, b) => (a.word < b.word ? -1 : a.word > b.word ? 1 : 0))
}

// ────────────────────────── 交集统计 ──────────────────────────

/** 考研词库 ∩ 现有词库：重合数、重合率、新增词数 */
export function computeIntersection(
  kaoyanWords: string[],
  vocabWords: string[],
): KaoYanIntersectionStats {
  const vocab = new Set(vocabWords)
  const kaoyan = new Set(kaoyanWords)
  let overlap = 0
  for (const w of kaoyan) if (vocab.has(w)) overlap++
  const total = kaoyan.size
  return {
    total,
    overlap,
    overlapRate: total > 0 ? overlap / total : 0,
    vocabCoverage: vocabWords.length > 0 ? overlap / vocab.size : 0,
    added: total - overlap,
  }
}
