import type { VocabEntry, VocabPart } from '../../src/lib/types'

export interface Derivation {
  /** 去掉尾部后缀后的词库词（如 fertility → fertile） */
  stemWord: string
  /** 剥掉的后缀（如 ity） */
  suffix: string
}

/**
 * 派生链：若一个词剥掉最外层后缀后（经形态修补）命中词库中的另一个词，
 * 则记录 derivation 字段。词页/学习卡据此展示「构词路径」两级拆解，
 * 解决 fer+ity 这类对记忆没有帮助的机械切分（fertility 实际由 fertile 派生）。
 */

/** 尾部后缀形态修补候选（按优先级）：fertil→fertile、accessibil→accessible、happi→happy 等 */
function stemCandidates(stem: string): string[] {
  const candidates = [stem]
  // fertil → fertile（补 e）
  candidates.push(stem + 'e')
  // accessibil → accessible（-able/-ible 接 -ity 时拼写为 -abil-/-ibil-）
  if (stem.endsWith('bil')) candidates.push(stem.slice(0, -3) + 'ble')
  // happi → happy（-ness/-ity 等后缀会把词尾 y 写成 i）
  if (stem.endsWith('i')) candidates.push(stem.slice(0, -1) + 'y')
  // running → runn（去重末尾双辅音）
  if (
    stem.length >= 3 &&
    stem[stem.length - 1] === stem[stem.length - 2] &&
    !/[aeiou]/.test(stem[stem.length - 1])
  ) {
    candidates.push(stem.slice(0, -1))
  }
  return candidates
}

/** 取 parts 尾部最后一个后缀部件（最外层后缀） */
export function outerSuffix(parts: VocabPart[]): VocabPart | null {
  const last = parts[parts.length - 1]
  return last && last.type === 'suffix' ? last : null
}

/**
 * 为整张词表构建派生关系。只做一层（stem 的派生在展示时递归读取）。
 * 返回 word → Derivation 映射；不修改输入。
 */
export function buildDerivations(vocab: VocabEntry[]): Map<string, Derivation> {
  const wordSet = new Set(vocab.map(e => e.word))
  const result = new Map<string, Derivation>()

  for (const entry of vocab) {
    const suffixPart = outerSuffix(entry.parts)
    if (!suffixPart) continue

    const suffixText = suffixPart.surface ?? suffixPart.text
    if (!entry.word.toLowerCase().endsWith(suffixText.toLowerCase())) continue

    const stem = entry.word.slice(0, entry.word.length - suffixText.length)
    if (stem.length < 2) continue

    const hit = stemCandidates(stem).find(c => wordSet.has(c) && c !== entry.word)
    if (hit) {
      result.set(entry.word, { stemWord: hit, suffix: suffixText })
    }
  }
  return result
}
