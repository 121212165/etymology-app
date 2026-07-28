// src/lib/mindmap-types.ts
import type { VocabPart } from './types'

export type RootLayer = 'core' | 'middle' | 'edge'

export interface EnhancedRootNode {
  primaryText: string
  aliases: string[]
  meaning: string
  layer: RootLayer
  wordIndices: number[]
  wordCount: number
}

export interface WordLink {
  fromWordIndex: number
  toWordIndex: number
  partText: string
  partType: VocabPart['type']
  weight: number
}

export interface MindMapData {
  roots: EnhancedRootNode[]
  links: WordLink[]
  stats: {
    totalRoots: number
    coreRoots: number
    middleRoots: number
    edgeRoots: number
    mergedGroups: number
    totalLinks: number
  }
}
