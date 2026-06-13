'use client'

import { useState } from 'react'
import type { VocabEntry, RootIndex } from '@/lib/types'
import { WordNodeCard } from '@/components/train/WordNodeCard'
import { getCachedIndex } from '@/lib/data-loader'

interface BreadcrumbNode {
  rootText: string
  meaning: string
}

interface RootNetworkProps {
  rootText: string
  onClose: () => void
}

export function RootNetwork({ rootText, onClose }: RootNetworkProps) {
  const [history, setHistory] = useState<BreadcrumbNode[]>(() => {
    const idx = getCachedIndex()
    const entry = idx?.rootIndex[rootText]
    return entry ? [{ rootText, meaning: entry.m }] : [{ rootText, meaning: '' }]
  })

  const current = history[history.length - 1]
  const idx = getCachedIndex()

  if (!idx) return null

  const rootEntry = idx.rootIndex[current.rootText]
  if (!rootEntry) return null

  const words: VocabEntry[] = rootEntry.w
    .map((i) => idx.data[i])
    .filter((e): e is VocabEntry => !!e)

  function navigateTo(nextRoot: string) {
    const entry = idx!.rootIndex[nextRoot]
    const meaning = entry?.m ?? ''
    setHistory((prev) => [...prev, { rootText: nextRoot, meaning }])
  }

  function navigateToIndex(targetIndex: number) {
    const node = history[targetIndex]
    if (node) setHistory(history.slice(0, targetIndex + 1))
  }

  return (
    <div className="border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-mono font-bold text-root text-lg">{current.rootText}</span>
          {current.meaning && (
            <span className="ml-2 text-sm text-text-secondary">{current.meaning}</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
          aria-label="关闭"
        >
          ✕
        </button>
      </div>

      {history.length > 1 && (
        <div className="flex flex-wrap items-center gap-1 mb-3 text-sm">
          {history.map((node, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-text-muted">→</span>}
              <button
                onClick={() => navigateToIndex(i)}
                className={`font-mono px-1.5 py-0.5 rounded transition-colors ${
                  i === history.length - 1
                    ? 'text-root font-semibold'
                    : 'text-text-secondary hover:text-root hover:bg-bg-elevated'
                }`}
              >
                {node.rootText}
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {words.map((entry) => (
          <WordNodeCard
            key={entry.word}
            entry={entry}
            onRootClick={navigateTo}
          />
        ))}
      </div>
    </div>
  )
}
