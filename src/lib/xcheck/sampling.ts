// 抽样策略（纯函数，确定性）

import { rootForms } from './normalize'
import type { RootEntry, VocabEntryLike } from './types'

export interface SampledWord {
  /** vocab.json 中的下标（溯源用） */
  index: number
  word: string
  /** 与该词根对应的 part（可能是 primaryText 或别名命中的 part） */
  partText: string
  partMeaning: string
}

/**
 * 每个词根最多抽 maxPerRoot 个词：
 * 按 wordIndices 顺序取「词存在且 parts 中确实含该词根（primaryText 或别名，type=root）」的词。
 * 结果顺序由数据本身决定，重跑一致。
 */
export function pickSampleWords(
  root: RootEntry,
  vocab: VocabEntryLike[],
  maxPerRoot: number,
): SampledWord[] {
  const forms = new Set(rootForms(root.primaryText, root.aliases))
  const out: SampledWord[] = []
  for (const idx of root.wordIndices) {
    if (out.length >= maxPerRoot) break
    const entry = vocab[idx]
    if (!entry || !Array.isArray(entry.parts)) continue
    const part = entry.parts.find((p) => p.type === 'root' && forms.has(p.text))
    if (!part) continue
    out.push({ index: idx, word: entry.word, partText: part.text, partMeaning: part.meaning })
  }
  return out
}

export interface WiktionarySampleItem {
  root: string
  /** 优先查询的 Wiktionary 页面标题（词根本身），若词根无页面则回退到代表词 */
  title: string
  /** 回退代表词（该词根词数最多的首个抽样词） */
  fallbackTitle: string
}

/**
 * Wiktionary 抽样：core 层全部 + middle 层按 wordCount 降序取前 24
 * （并列时按 primaryText 升序，保证确定性）。
 * fallbackTitle 为该词根的首个抽样词（词根作为截断词干通常没有独立词条）。
 */
export function pickWiktionaryRoots(
  roots: RootEntry[],
  vocab: VocabEntryLike[],
  coreTop = 36,
  middleTop = 24,
): WiktionarySampleItem[] {
  const core = roots
    .filter((r) => r.layer === 'core')
    .slice()
    .sort((a, b) => a.primaryText.localeCompare(b.primaryText))
  const middle = roots
    .filter((r) => r.layer === 'middle')
    .slice()
    .sort((a, b) => b.wordCount - a.wordCount || a.primaryText.localeCompare(b.primaryText))
    .slice(0, middleTop)
  const picked = [...core.slice(0, coreTop), ...middle]
  return picked.map((r) => {
    const sample = pickSampleWords(r, vocab, 1)
    return {
      root: r.primaryText,
      title: r.primaryText,
      fallbackTitle: sample.length > 0 ? sample[0].word : r.primaryText,
    }
  })
}
