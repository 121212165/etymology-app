// src/components/mindmap/MindMap.tsx
'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import type { MindMapData, EnhancedRootNode } from '@/lib/mindmap-types'
import type { VocabEntry } from '@/lib/types'
import { useProgressStore } from '@/store/progress-store'

interface MindMapProps {
  data: MindMapData
  vocab: VocabEntry[]
  centerRoot: EnhancedRootNode
}

/** 词叶圆环半径（面板宽高的百分比） */
const LEAF_RADIUS = 34

interface PanelProps {
  rootText: string
  words: VocabEntry[]
  relatedRoots: EnhancedRootNode[]
}

/** 单个导图面板：中心词根 + 一圈词叶；关联词根 pinned 在底部，避免窄面板外环裁切 */
function MindMapPanel({ rootText, words, relatedRoots }: PanelProps) {
  const { isWordViewed } = useProgressStore()
  const count = Math.max(words.length, 1)

  return (
    <div className="relative w-full h-[420px] bg-bg-surface/30 rounded-2xl border border-border overflow-hidden">
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
        {words.map((_, i) => {
          const angle = (i / count) * Math.PI * 2 - Math.PI / 2
          const x = 50 + LEAF_RADIUS * Math.cos(angle)
          const y = 50 + LEAF_RADIUS * Math.sin(angle)
          return (
            <line
              key={`line-${i}`}
              x1="50%" y1="50%"
              x2={`${x}%`} y2={`${y}%`}
              stroke="var(--root-color)"
              strokeWidth="1"
              strokeOpacity="0.3"
            />
          )
        })}
      </svg>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="px-3 py-1.5 rounded-full bg-root/20 border-2 border-root text-root font-mono font-bold text-sm">
          {rootText}
        </div>
      </div>

      {words.map((word, i) => {
        const angle = (i / count) * Math.PI * 2 - Math.PI / 2
        const x = 50 + LEAF_RADIUS * Math.cos(angle)
        const y = 50 + LEAF_RADIUS * Math.sin(angle)
        const viewed = isWordViewed(word.word)
        return (
          <div
            key={word.word}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <Link
              href={`/word/${encodeURIComponent(word.word)}`}
              className={`block px-2.5 py-1 rounded-full text-xs border transition-all whitespace-nowrap ${
                viewed
                  ? 'bg-accent/10 border-accent/30 text-accent'
                  : 'bg-bg-surface border-border text-text-secondary hover:border-accent/30 hover:text-text-primary'
              }`}
            >
              {word.word}
            </Link>
          </div>
        )
      })}

      {relatedRoots.length > 0 && (
        <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1 justify-center">
          {relatedRoots.map((root) => (
            <Link
              key={root.primaryText}
              href={`/root/${encodeURIComponent(root.primaryText)}`}
              className="px-2 py-0.5 rounded-full bg-bg-elevated border border-border text-[11px] text-text-muted hover:text-root hover:border-root/30 transition-all"
            >
              {root.primaryText}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function MindMap({ data, vocab, centerRoot }: MindMapProps) {
  const centerWords = useMemo(() => {
    return centerRoot.wordIndices
      .filter(idx => idx < vocab.length)
      .map(idx => vocab[idx])
  }, [centerRoot, vocab])

  const relatedRoots = useMemo(() => {
    const centerWordIndices = new Set(centerRoot.wordIndices)
    const relatedLinks = data.links.filter(l =>
      centerWordIndices.has(l.fromWordIndex) || centerWordIndices.has(l.toWordIndex)
    )

    const otherWordIndices = new Set<number>()
    for (const link of relatedLinks) {
      if (centerWordIndices.has(link.fromWordIndex)) {
        otherWordIndices.add(link.toWordIndex)
      } else {
        otherWordIndices.add(link.fromWordIndex)
      }
    }

    const rootSet = new Set<string>()
    for (const idx of otherWordIndices) {
      const word = vocab[idx]
      if (!word) continue
      for (const part of word.parts) {
        if (part.type === 'root') rootSet.add(part.text)
      }
    }

    return data.roots.filter(r =>
      r.primaryText !== centerRoot.primaryText &&
      !r.aliases.includes(centerRoot.primaryText) &&
      (rootSet.has(r.primaryText) || r.aliases.some(a => rootSet.has(a)))
    ).slice(0, 6)
  }, [data, centerRoot, vocab])

  // 词数对半分到左右两个面板，避免大词根全部挤进一个圆环互相重叠
  const mid = Math.ceil(centerWords.length / 2)
  const leftWords = centerWords.slice(0, mid)
  const rightWords = centerWords.slice(mid)
  const relatedMid = Math.ceil(relatedRoots.length / 2)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <MindMapPanel
        rootText={centerRoot.primaryText}
        words={leftWords}
        relatedRoots={relatedRoots.slice(0, relatedMid)}
      />
      <MindMapPanel
        rootText={centerRoot.primaryText}
        words={rightWords}
        relatedRoots={relatedRoots.slice(relatedMid)}
      />
    </div>
  )
}
