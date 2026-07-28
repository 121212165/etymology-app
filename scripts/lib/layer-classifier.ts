/**
 * 词根分层算法 - 程序化判断，0 AI 介入
 *
 * 核心层: >= 10 词 → 思维导图主节点（约 31 个）
 * 中间层: 4-9 词   → 默认折叠（约 100 个）
 * 边缘层: < 4 词   → 不进入导图（约 480 个）
 *
 * 设计理由：613 个词根全展示会产生"母组块压迫感"
 * 分层后用户只看到 31 个核心节点，能力门槛大幅降低
 */

export const LAYER_CORE = 'core' as const
export const LAYER_MIDDLE = 'middle' as const
export const LAYER_EDGE = 'edge' as const

export type RootLayer = typeof LAYER_CORE | typeof LAYER_MIDDLE | typeof LAYER_EDGE

export const CORE_THRESHOLD = 10
export const MIDDLE_THRESHOLD = 4

export function classifyLayer(wordCount: number): RootLayer {
  if (wordCount >= CORE_THRESHOLD) return LAYER_CORE
  if (wordCount >= MIDDLE_THRESHOLD) return LAYER_MIDDLE
  return LAYER_EDGE
}
