// 词根交叉校验共享类型定义
// 数据全部来自开源词源数据源（.cache/ 下三个文件），产物需逐条可溯源。

/** 校验状态：confirmed=有词源证据；not_found=无任何达标证据；conflict=证据与拉丁/希腊词根体系相悖 */
export type XStatus = 'confirmed' | 'not_found' | 'conflict'

/** 词根义 vs 开源语素义的机判结论（unverified = 无 gloss 或桥表无条目，机判不了） */
export type MeaningVerdict = 'match' | 'mismatch' | 'unverified'

/** 数据源标识（source 字段取值） */
export type SourceId = 'etymwn' | 'wiktionary' | 'etymonline'

/** enhanced-roots.json 的 roots[] 条目 */
export interface RootEntry {
  primaryText: string
  aliases: string[]
  meaning: string
  layer: 'core' | 'middle' | 'edge'
  wordIndices: number[]
  wordCount: number
}

/** vocab.json 词条（仅声明本模块用到的字段） */
export interface VocabPartLike {
  type: 'prefix' | 'root' | 'suffix' | 'linker'
  text: string
  meaning: string
  surface?: string
}

export interface VocabEntryLike {
  word: string
  definition: string
  parts: VocabPartLike[]
}

/** 词根级校验结果（roots[] 条目；report 只要求 text/status/evidence/source，其余供报告表格与溯源） */
export interface RootCheckResult {
  text: string
  layer: string
  meaning: string
  status: XStatus
  /** 证据摘要：来源 + 词源形态 + gloss/语言 + 经由词，最多 3 条 */
  evidence: string
  /** 提供证据的来源（逗号分隔）：etymwn / wiktionary / etymonline；not_found 时为空串 */
  source: string
  /** 拉丁/希腊家族（含 PIE）形态命中数（强度≥2） */
  classicalHits: number
  /** 非古典/非罗曼语命中（conflict 的解释性明细，最多 3 条） */
  nonClassicalEvidence: string[]
  /** 罗曼语（古法语等传播路径）命中数（强度≥2），作拉丁词源的间接证据 */
  romanceHits: number
  /** 进入校验二抽样的词数（每词根≤2） */
  sampledWords: number
}

/** 词级校验结果（words[] 条目；report 只要求 word/root/status/detail，其余供溯源） */
export interface WordCheckResult {
  word: string
  root: string
  status: XStatus
  /** 判定细节：命中的词源形态、gloss 原文、语义机判结论 */
  detail: string
  /** 词根义 vs 开源 gloss 的机判结论 */
  meaningVerdict: MeaningVerdict
  /** 参与比对的 gloss 原文（etymonline 引号释义，可溯源；无则缺省） */
  gloss?: string
}

/** 汇总统计（report.summary；字段名与报告要求一致） */
export interface XCheckSummary {
  rootTotal: number
  confirmed: number
  notFound: number
  conflict: number
  /** 完成语义机判的抽样词数（match+mismatch；无 gloss 或桥表无条目不计入） */
  wordsChecked: number
  /** 其中机判语义不符（mismatch）的词数 */
  wordMismatch: number
}

/** 数据源元信息（报告中声明出处与许可） */
export interface SourceInfo {
  id: SourceId
  description: string
  version: string
  license: string
  origin: string
}

/** 数据源运行状态（解析失败被跳过时在此注明，不隐瞒） */
export interface SourceRunStatus {
  id: SourceId
  ok: boolean
  note: string
}

/** 交叉校验报告（public/data/xcheck-report.json） */
export interface XCheckReport {
  summary: XCheckSummary
  roots: RootCheckResult[]
  words: WordCheckResult[]
  sources: SourceInfo[]
  sourceStatus: SourceRunStatus[]
  methodNotes: string[]
}
