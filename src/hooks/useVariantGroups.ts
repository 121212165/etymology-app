// src/hooks/useVariantGroups.ts
'use client'

import { useMemo } from 'react'
import type { VocabEntry } from '@/lib/types'
import type { EnhancedRootNode } from '@/lib/mindmap-types'

export interface VariantGroup {
  /** 变体文本（chip 显示用）；null 表示不属于任何已知变体的「其他」组 */
  text: string | null
  words: VocabEntry[]
}

/**
 * 按变体把词聚组排序（仅学习模式使用）：
 * - 变体 = 词的 parts 中 type="root" 且 text ∈ [primaryText, ...aliases] 的部件；
 *   一词命中多个变体部件时取 parts 中最先出现的那个；
 * - 组序：primaryText 在前，其余按 aliases 存储顺序，「其他」最后；
 * - 组内按字母序（localeCompare）排列；
 * - 空组不保留（没有词的变体不出 chip）；
 * - enhancedRoot 缺失或 aliases 为空时返回 []，调用方据此不渲染变体条。
 */
export function useVariantGroups(
  words: VocabEntry[],
  enhancedRoot?: EnhancedRootNode
): VariantGroup[] {
  return useMemo(() => {
    if (!enhancedRoot || enhancedRoot.aliases.length === 0) return []

    const variants = [enhancedRoot.primaryText, ...enhancedRoot.aliases]
    const buckets = new Map<string, VocabEntry[]>()
    for (const v of variants) buckets.set(v, [])
    const other: VocabEntry[] = []

    for (const word of words) {
      const variantPart = word.parts.find(
        p => p.type === 'root' && buckets.has(p.text)
      )
      if (variantPart) {
        buckets.get(variantPart.text)!.push(word)
      } else {
        other.push(word)
      }
    }

    const groups: VariantGroup[] = variants
      .map(text => ({
        text,
        words: (buckets.get(text) ?? []).sort((a, b) =>
          a.word.localeCompare(b.word)
        ),
      }))
      .filter(g => g.words.length > 0)

    if (other.length > 0) {
      groups.push({
        text: null,
        words: other.sort((a, b) => a.word.localeCompare(b.word)),
      })
    }
    return groups
  }, [words, enhancedRoot])
}
