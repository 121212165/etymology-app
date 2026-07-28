// src/components/root/RootSession.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { PartTags } from '@/components/word/PartTags'
import { SpeakButton } from '@/components/word/SpeakButton'
import { useProgressStore } from '@/store/progress-store'
import type { VocabEntry } from '@/lib/types'

interface RootSessionProps {
  rootText: string
  rootMeaning: string
  words: VocabEntry[]
}

export function RootSession({ rootText, rootMeaning, words }: RootSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionFinished, setSessionFinished] = useState(false)
  const { markWordViewed, markRootCompleted, setCurrentRoot } = useProgressStore()

  const current = words[currentIndex]
  const isLast = currentIndex === words.length - 1

  useEffect(() => {
    setCurrentRoot(rootText)
  }, [rootText, setCurrentRoot])

  useEffect(() => {
    if (current) markWordViewed(current.word)
  }, [current, markWordViewed])

  const handleNext = () => {
    if (isLast) {
      markRootCompleted(rootText)
      setSessionFinished(true)
      return
    }
    setCurrentIndex(i => i + 1)
  }

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1)
  }

  if (words.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6 lg:p-10 text-center">
        <h1 className="text-2xl font-semibold text-text-primary mb-2">
          {rootText}
        </h1>
        <p className="text-text-secondary mb-8">这组词还没有内容</p>
        <Link
          href="/"
          className="text-accent hover:underline text-sm"
        >
          回首页
        </Link>
      </div>
    )
  }

  if (sessionFinished) {
    return (
      <div className="max-w-2xl mx-auto p-6 lg:p-10 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-accent/20 flex items-center justify-center">
          <Check size={32} className="text-accent" />
        </div>
        <h1 className="text-2xl font-semibold text-text-primary mb-2">
          看完 {rootText}
        </h1>
        <p className="text-text-secondary mb-8">
          这组词你都看过了
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover transition-colors"
        >
          回首页看下一个
          <ArrowRight size={16} />
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 lg:p-10">
      <div className="mb-8">
        <div className="flex items-baseline gap-3 mb-2">
          <h1 className="text-3xl font-bold font-mono text-root">{rootText}</h1>
          <span className="text-text-secondary">{rootMeaning}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1 bg-bg-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-text-muted font-mono">
            {currentIndex + 1}/{words.length}
          </span>
        </div>
      </div>

      <div className="bg-bg-surface border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-3xl font-bold text-text-primary mb-2">{current.word}</h2>
            <p className="text-text-secondary">{current.definition}</p>
          </div>
          <SpeakButton word={current.word} />
        </div>
        <PartTags parts={current.parts} />

        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-sm text-text-secondary leading-relaxed">
            <span className="text-text-primary font-medium">{current.word}</span>
            {' '}由{' '}
            {current.parts.map((part, i) => (
              <span key={i}>
                {i > 0 && ' + '}
                <span className="font-mono text-root">{part.text}</span>
                <span className="text-text-muted">({part.meaning})</span>
              </span>
            ))}
            {' '}组成
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeft size={16} />
          上一个
        </button>

        <button
          onClick={handleNext}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover transition-colors"
        >
          {isLast ? '完成' : '下一个'}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}
