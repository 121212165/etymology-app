'use client'

import { useState, useEffect, useCallback } from 'react'
import type { VocabEntry, VocabPart } from '@/lib/types'
import { PART_COLORS } from '@/lib/constants'
import { SpeakButton } from '@/components/ui/SpeakButton'
import { PartTags } from '@/components/word/PartTags'
import { RootNetwork } from '@/components/train/RootNetwork'

interface ObservePhaseProps {
  words: VocabEntry[]
  currentIndex: number
  onNext: () => void
  onPhaseEnd: () => void
}

export function ObservePhase({
  words,
  currentIndex,
  onNext,
  onPhaseEnd,
}: ObservePhaseProps) {
  const [expandedRoot, setExpandedRoot] = useState<string | null>(null)

  const word = words[currentIndex]
  const isLast = currentIndex === words.length - 1

  const handleNext = useCallback(() => {
    if (isLast) {
      onPhaseEnd()
    } else {
      onNext()
    }
  }, [isLast, onNext, onPhaseEnd])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        handleNext()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleNext])

  if (!word) return null

  const toggleRoot = (text: string) => {
    setExpandedRoot(prev => (prev === text ? null : text))
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8 gap-6">
      <div className="text-sm text-text-secondary">
        第 {currentIndex + 1} / {words.length} 个
      </div>

      <div className="text-4xl font-bold font-mono">{word.word}</div>

      <div className="flex flex-col gap-2 w-full max-w-md">
        {word.parts.map((part: VocabPart, i: number) => (
          <div
            key={i}
            className="flex items-center gap-3 pl-3 py-1.5 rounded-r-lg bg-bg-elevated"
            style={{ borderLeft: `4px solid ${PART_COLORS[part.type]}` }}
          >
            <button
              onClick={() => toggleRoot(part.text)}
              className="font-mono font-bold hover:underline cursor-pointer"
            >
              {part.text}
            </button>
            <span className="text-text-secondary">—</span>
            <span>{part.meaning}</span>
          </div>
        ))}
      </div>

      {expandedRoot && (
        <div className="w-full max-w-md">
          <RootNetwork rootText={expandedRoot} onClose={() => setExpandedRoot(null)} />
        </div>
      )}

      <p className="text-text-secondary text-center max-w-lg">{word.definition}</p>

      <SpeakButton word={word.word} />

      <button
        onClick={handleNext}
        className="px-6 py-2.5 rounded-lg bg-accent text-white font-medium hover:opacity-90 transition-opacity"
      >
        {isLast ? '进入猜词义 →' : '下一个 →'}
      </button>
    </div>
  )
}
