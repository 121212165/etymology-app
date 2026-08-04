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

export function MindMap({ data, vocab, centerRoot }: MindMapProps) {
  const { isWordViewed } = useProgressStore()

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

  return (
    <div className="relative w-full h-[600px] bg-bg-surface/30 rounded-2xl border border-border overflow-hidden">
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
        {centerWords.map((_, i) => {
          const angle = (i / centerWords.length) * Math.PI * 2 - Math.PI / 2
          const x = 50 + 25 * Math.cos(angle)
          const y = 50 + 25 * Math.sin(angle)
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
        <div className="px-4 py-2 rounded-full bg-root/20 border-2 border-root text-root font-mono font-bold">
          {centerRoot.primaryText}
        </div>
      </div>

      {centerWords.map((word, i) => {
        const angle = (i / centerWords.length) * Math.PI * 2 - Math.PI / 2
        const x = 50 + 25 * Math.cos(angle)
        const y = 50 + 25 * Math.sin(angle)
        const viewed = isWordViewed(word.word)
        return (
          <div
            key={word.word}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <Link
              href={`/word/${encodeURIComponent(word.word)}`}
              className={`block px-3 py-1.5 rounded-full text-xs border transition-all ${
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

      {relatedRoots.map((root, i) => {
        const angle = (i / Math.max(relatedRoots.length, 1)) * Math.PI * 2 - Math.PI / 2
        const x = 50 + 42 * Math.cos(angle)
        const y = 50 + 42 * Math.sin(angle)
        return (
          <div
            key={root.primaryText}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <Link
              href={`/root/${encodeURIComponent(root.primaryText)}`}
              className="block px-3 py-1 rounded-full bg-bg-elevated border border-border text-xs text-text-muted hover:text-root hover:border-root/30 transition-all"
            >
              {root.primaryText}
            </Link>
          </div>
        )
      })}
    </div>
  )
}
