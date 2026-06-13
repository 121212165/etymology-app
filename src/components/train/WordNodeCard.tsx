'use client'

import { useState } from 'react'
import type { VocabEntry } from '@/lib/types'
import { PartTags } from '@/components/word/PartTags'
import { PART_COLORS } from '@/lib/constants'

interface WordNodeCardProps {
  entry: VocabEntry
  onRootClick: (rootText: string) => void
}

export function WordNodeCard({ entry, onRootClick }: WordNodeCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="bg-bg-surface border border-border rounded-xl p-3 hover:border-accent/30 transition-all cursor-pointer"
      onClick={() => setExpanded((v) => !v)}
    >
      {!expanded ? (
        <>
          <div className="text-lg font-semibold">{entry.word}</div>
          <div className="truncate text-sm opacity-70">{entry.definition}</div>
        </>
      ) : (
        <>
          <div className="text-lg font-semibold">{entry.word}</div>
          <div className="text-sm opacity-70 mb-2">{entry.definition}</div>
          <div className="flex flex-wrap gap-1.5">
            {entry.parts.map((part, i) => {
              const isClickable = part.type === 'root'
              return (
                <span
                  key={i}
                  className={`part-tag part-tag-${part.type} ${isClickable ? 'cursor-pointer hover:opacity-80' : ''}`}
                  title={`${part.type}: ${part.meaning}`}
                  onClick={
                    isClickable
                      ? (e) => {
                          e.stopPropagation()
                          onRootClick(part.text)
                        }
                      : undefined
                  }
                >
                  <span className="font-mono text-[0.7rem]">{part.text}</span>
                  <span className="opacity-70">{part.meaning}</span>
                </span>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
