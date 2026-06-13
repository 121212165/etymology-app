'use client'

import { useState, useCallback, useEffect } from 'react'
import type { DecomposeQuestion } from '@/lib/types'
import { PART_COLORS } from '@/lib/constants'

interface DecomposePhaseProps {
  questions: DecomposeQuestion[]
  onComplete: (correct: number, total: number) => void
}

export function DecomposePhase({ questions, onComplete }: DecomposePhaseProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedRoots, setSelectedRoots] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)

  useEffect(() => {
    if (questions.length === 0) onComplete(0, 0)
  }, [questions.length, onComplete])

  if (questions.length === 0) return null

  const question = questions[currentIndex]
  const isCorrect =
    submitted &&
    selectedRoots.length === question.correctRoots.length &&
    selectedRoots.every((r) => question.correctRoots.includes(r))

  const toggleRoot = useCallback(
    (root: string) => {
      if (submitted) return
      setSelectedRoots((prev) =>
        prev.includes(root) ? prev.filter((r) => r !== root) : [...prev, root]
      )
    },
    [submitted]
  )

  const handleSubmit = useCallback(() => {
    if (selectedRoots.length === 0 || submitted) return
    setSubmitted(true)

    const correct =
      selectedRoots.length === question.correctRoots.length &&
      selectedRoots.every((r) => question.correctRoots.includes(r))

    const newCorrect = correctCount + (correct ? 1 : 0)
    if (correct) setCorrectCount(newCorrect)

    setTimeout(() => {
      if (currentIndex === questions.length - 1) {
        onComplete(newCorrect, questions.length)
      } else {
        setCurrentIndex((i) => i + 1)
        setSelectedRoots([])
        setSubmitted(false)
      }
    }, 2000)
  }, [selectedRoots, submitted, question, correctCount, currentIndex, questions.length, onComplete])

  useEffect(() => {
    if (selectedRoots.length === 0 || submitted) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedRoots.length, submitted, handleSubmit])

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-sm text-text-muted">
        第 {currentIndex + 1} / {questions.length} 题
      </div>

      <div className="text-4xl font-bold font-mono text-text-primary">
        {question.entry.word}
      </div>

      <div
        className={`w-full max-w-md min-h-[48px] border-2 border-dashed rounded-lg p-3 flex flex-wrap gap-2 ${
          submitted
            ? isCorrect
              ? 'border-green-500'
              : 'border-red-400'
            : 'border-border'
        }`}
      >
        {selectedRoots.length === 0 ? (
          <span className="text-text-muted text-sm m-auto">
            点击下方词根来拆解这个词
          </span>
        ) : (
          selectedRoots.map((root) => {
            const isRootCorrect = question.correctRoots.includes(root)
            return (
              <span
                key={root}
                className={`part-tag part-tag-root ${
                  submitted
                    ? isRootCorrect
                      ? 'ring-2 ring-green-500'
                      : 'ring-2 ring-red-400'
                    : ''
                }`}
                onClick={() => toggleRoot(root)}
                style={{ cursor: submitted ? 'default' : 'pointer' }}
              >
                {root}
              </span>
            )
          })
        )}
      </div>

      {submitted && (
        <div className="text-sm text-text-secondary">
          {isCorrect ? (
            <span>{question.entry.definition}</span>
          ) : (
            <span>
              正确拆解：{question.correctRoots.join(' + ')}{' '}
              {question.entry.definition}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 justify-center max-w-md">
        {question.rootPool.map((root) => {
          const isSelected = selectedRoots.includes(root)
          return (
            <span
              key={root}
              className={`part-tag part-tag-root transition-opacity ${
                isSelected ? 'opacity-30' : ''
              }`}
              onClick={() => toggleRoot(root)}
              style={{ cursor: submitted ? 'default' : 'pointer' }}
            >
              {root}
            </span>
          )
        })}
      </div>

      <button
        disabled={selectedRoots.length === 0 || submitted}
        onClick={handleSubmit}
        className="px-6 py-2 rounded-lg bg-accent text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all"
      >
        提交
      </button>
    </div>
  )
}
