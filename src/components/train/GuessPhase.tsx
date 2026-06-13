'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { GuessQuestion } from '@/lib/types'
import { PartTags } from '@/components/word/PartTags'
import { PART_COLORS } from '@/lib/constants'

interface GuessPhaseProps {
  questions: GuessQuestion[]
  onComplete: (correct: number, total: number) => void
}

export default function GuessPhase({ questions, onComplete }: GuessPhaseProps) {
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const correctCountRef = useRef(0)

  useEffect(() => {
    if (questions.length === 0) onComplete(0, 0)
  }, [questions.length, onComplete])

  if (questions.length === 0) return null

  const current = questions[index]
  const isAnswered = selected !== null
  const isCorrect = selected === current.correctIndex

  const advance = useCallback(() => {
    const nextIndex = index + 1
    if (nextIndex >= questions.length) {
      onComplete(correctCountRef.current, questions.length)
    } else {
      setIndex(nextIndex)
      setSelected(null)
    }
  }, [index, questions.length, onComplete])

  useEffect(() => {
    if (!isAnswered) return
    if (isCorrect) {
      correctCountRef.current += 1
      setCorrectCount(correctCountRef.current)
    }
    const timer = setTimeout(advance, 1500)
    return () => clearTimeout(timer)
  }, [isAnswered, isCorrect, advance])

  useEffect(() => {
    if (isAnswered) return
    const handler = (e: KeyboardEvent) => {
      const num = parseInt(e.key)
      if (num >= 1 && num <= current.options.length) {
        setSelected(num - 1)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isAnswered, current.options.length])

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <p className="text-sm text-text-secondary">
        第 {index + 1} / {questions.length} 题
      </p>

      <div className="scale-125">
        <PartTags parts={current.entry.parts} />
      </div>

      <p className="text-lg font-medium">这个词的意思是？</p>

      <div className="flex flex-col gap-3 w-full max-w-md">
        {current.options.map((option, i) => {
          let style = 'bg-bg-elevated border border-border rounded-xl p-4 text-left'
          if (isAnswered) {
            if (i === selected && isCorrect) {
              style = 'bg-green-500/10 border-green-500 rounded-xl p-4 text-left'
            } else if (i === selected && !isCorrect) {
              style = 'bg-red-500/10 border-red-500 rounded-xl p-4 text-left'
            } else if (i === current.correctIndex) {
              style = 'bg-green-500/10 border-green-500 rounded-xl p-4 text-left'
            } else {
              style = 'bg-bg-elevated border border-border rounded-xl p-4 text-left opacity-50'
            }
          } else {
            style += ' hover:border-accent/50 cursor-pointer'
          }

          return (
            <button
              key={i}
              className={style}
              onClick={() => !isAnswered && setSelected(i)}
              disabled={isAnswered}
            >
              <span className="mr-2 text-text-secondary">{i + 1}.</span>
              {option}
            </button>
          )
        })}
      </div>

      {isAnswered && (
        <p className="text-sm text-text-secondary">
          正确释义：{current.entry.definition}
        </p>
      )}
    </div>
  )
}
