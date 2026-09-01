// 大 JSON 顶层 section 流式扫描（纯状态机，不整读进内存）
//
// .cache/ 下的 etymwn / ety-wiktionary 转码 JSON 都是「单行、顶层对象」：
//   { "<key>": <value>, ... }
// value 几乎全为嵌套对象，最大单个 section 约 22MB（lat）。整文件 JSON.parse
// 峰值内存会超过 1GB，因此用字符级状态机按顶层 key 流式提取原始片段，
// 只对关心的 key 收集文本（wanted=false 的 section 直接跳过、不占内存）。
//
// 使用方式：new TopLevelJsonScanner(key => ...)，逐 chunk 调 push()（可跨 chunk
// 切断 key/字符串/嵌套结构），结束时调 finish() 校验完整性。

export interface JsonSection {
  key: string
  /** value 的原始 JSON 文本；未收集（wanted=false）时为空串 */
  raw: string
}

export type ScannerState = 'expectOpen' | 'scanning' | 'done' | 'error'

type Phase =
  | 'expectOpen' // 等顶层 {
  | 'keyStart' // 对象内等 key 的引号
  | 'inKey' // 读 key 字符串（含转义解码）
  | 'afterKey' // 等冒号
  | 'valueStart' // 等 value 首字符
  | 'inValue' // 对象/数组 value（跟踪深度与字符串）
  | 'scalarStr' // 字符串标量 value
  | 'scalar' // 数字/字面量标量 value
  | 'afterSection' // 等 , 或 }
  | 'done' // 顶层闭合
  | 'error'

/** 数字/字面量标量的起始字符 */
const SCALAR_START = /^[0-9tfn-]$/

export class TopLevelJsonScanner {
  private phase: Phase = 'expectOpen'
  private depth = 0
  private inStr = false
  private esc = false
  private key = ''
  /** 当前 value 是否收集原文 */
  private capture = false
  /** 收集中的原文片段（按 chunk 切片 push，避免逐字符拼接） */
  private capParts: string[] = []
  /** 当前 chunk 内收集切片的起点；-1 = 本 chunk 尚未开始收集 */
  private capStart = -1
  private sections: JsonSection[] = []

  constructor(private wanted?: (key: string) => boolean) {}

  get state(): ScannerState {
    if (this.phase === 'error') return 'error'
    if (this.phase === 'done') return 'done'
    return 'scanning'
  }

  /** 喂入一个 chunk，返回其间完成的顶层 section */
  push(chunk: string): JsonSection[] {
    this.sections = []
    const n = chunk.length
    let i = 0
    while (i < n) {
      const ch = chunk[i]
      switch (this.phase) {
        case 'expectOpen':
          if (ch === '{') this.phase = 'keyStart'
          else if (!/\s/.test(ch)) this.fail()
          i++
          break
        case 'keyStart':
          if (ch === '"') {
            this.key = ''
            this.esc = false
            this.phase = 'inKey'
            i++
          } else if (ch === '}') {
            this.phase = 'done'
            i++
          } else if (/\s/.test(ch)) i++
          else this.fail()
          break
        case 'inKey': {
          // 只累积原文，闭合引号时一次性解码（跨 chunk 切断转义序列也安全）
          if (this.esc) {
            this.key += ch
            this.esc = false
            i++
            break
          }
          if (ch === '\\') {
            this.key += ch
            this.esc = true
            i++
            break
          }
          if (ch === '"') {
            this.key = decodeJsonString(this.key)
            this.phase = 'afterKey'
            i++
            break
          }
          this.key += ch
          i++
          break
        }
        case 'afterKey':
          if (ch === ':') this.phase = 'valueStart'
          else if (!/\s/.test(ch)) this.fail()
          i++
          break
        case 'valueStart':
          if (ch === '{' || ch === '[') {
            this.depth = 1
            this.inStr = false
            this.esc = false
            this.capture = this.wanted ? this.wanted(this.key) : true
            this.capParts = []
            this.capStart = this.capture ? i : -1
            this.phase = 'inValue'
            i++
          } else if (ch === '"') {
            this.capture = this.wanted ? this.wanted(this.key) : true
            this.capParts = []
            this.capStart = this.capture ? i : -1
            this.inStr = true
            this.esc = false
            this.phase = 'scalarStr'
            i++
          } else if (SCALAR_START.test(ch)) {
            this.capture = false
            this.phase = 'scalar'
            i++
          } else if (/\s/.test(ch)) i++
          else this.fail()
          break
        case 'inValue': {
          if (this.inStr) {
            if (this.esc) {
              this.esc = false
              i++
              break
            }
            if (ch === '\\') {
              this.esc = true
              i++
              break
            }
            if (ch === '"') this.inStr = false
            i++
            break
          }
          if (ch === '"') {
            this.inStr = true
            i++
            break
          }
          if (ch === '{' || ch === '[') {
            this.depth++
            i++
            break
          }
          if (ch === '}' || ch === ']') {
            this.depth--
            i++
            if (this.depth === 0) {
              this.emit(chunk, i)
              this.phase = 'afterSection'
            }
            break
          }
          i++
          break
        }
        case 'scalarStr': {
          if (this.esc) {
            this.esc = false
            i++
            break
          }
          if (ch === '\\') {
            this.esc = true
            i++
            break
          }
          if (ch === '"') {
            this.inStr = false
            i++
            this.emit(chunk, i)
            this.phase = 'afterSection'
            break
          }
          i++
          break
        }
        case 'scalar': {
          if (ch === ',') {
            this.emit(chunk, i)
            this.phase = 'keyStart'
            i++
          } else if (ch === '}') {
            this.emit(chunk, i)
            this.phase = 'done'
            i++
          } else i++
          break
        }
        case 'afterSection':
          if (ch === ',') {
            this.phase = 'keyStart'
            i++
          } else if (ch === '}') {
            this.phase = 'done'
            i++
          } else if (/\s/.test(ch)) i++
          else this.fail()
          break
        case 'done':
          i = n // 顶层已闭合，忽略剩余（尾随空白/换行）
          break
        case 'error':
          i = n
          break
      }
    }
    // chunk 结束：把未完结的收集片段落袋
    if (this.capStart >= 0 && this.capStart < n) {
      this.capParts.push(chunk.slice(this.capStart))
      this.capStart = 0
    }
    return this.sections
  }

  /** EOF 时调用：校验整体是否闭合完整 */
  finish(): ScannerState {
    if (this.phase !== 'done' && this.phase !== 'expectOpen') this.phase = 'error'
    return this.state
  }

  private fail() {
    this.phase = 'error'
  }

  /** section 闭合于 chunk 的 endIdx（不含），结算收集片段并发射 */
  private emit(chunk: string, endIdx: number) {
    let raw = ''
    if (this.capture) {
      const parts = this.capParts
      if (this.capStart >= 0 && this.capStart < endIdx) parts.push(chunk.slice(this.capStart, endIdx))
      raw = parts.join('')
    }
    this.capParts = []
    this.capStart = -1
    this.sections.push({ key: this.key, raw })
  }
}

/** 解码 JSON 字符串字面量的内容部分（无转义时零开销，转义时交给 JSON.parse 兜底） */
export function decodeJsonString(raw: string): string {
  if (!raw.includes('\\')) return raw
  try {
    return JSON.parse('"' + raw + '"') as string
  } catch {
    return raw
  }
}
