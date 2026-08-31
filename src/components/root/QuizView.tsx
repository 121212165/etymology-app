// src/components/root/QuizView.tsx
'use client'

import { useState } from 'react'
import { Check, Lightbulb, RotateCcw } from 'lucide-react'
import { SpeakButton } from '@/components/word/SpeakButton'
import { useProgressStore } from '@/store/progress-store'
import type { VocabEntry } from '@/lib/types'

export type QuizMode = 'hard' | 'hint'

interface QuizViewProps {
  /** 本组全部词（组件内部打乱） */
  words: VocabEntry[]
  mode: QuizMode
  /** 「回到学习」时调用 */
  onExit: () => void
}

function shuffle<T>(input: T[]): T[] {
  const arr = [...input]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * 自测视图：占用学习模式的词卡区域（导图保持可见）。
 * - 打乱词队列；卡面揭示前只显示单词 + 发音按钮；
 * - 提示模式揭示前显示词根拆解（text+meaning，不显示释义）；
 * - 点卡揭示释义 + 「会了」「再看」判定；
 * - 全部判完后进入小结页（会了 X · 再看 Y），可再测一遍或回到学习。
 */
export function QuizView({ words, mode, onExit }: QuizViewProps) {
  const [queue, setQueue] = useState<VocabEntry[]>(() => shuffle(words))
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [knownCount, setKnownCount] = useState(0)
  const [againCount, setAgainCount] = useState(0)
  const [roundDone, setRoundDone] = useState(false)
  const { markQuizResult } = useProgressStore()

  const current = queue[idx]

  const judge = (result: 'known' | 'again') => {
    if (!current) return
    markQuizResult(current.word, result)
    if (result === 'known') setKnownCount(c => c + 1)
    else setAgainCount(c => c + 1)
    if (idx + 1 >= queue.length) {
      setRoundDone(true)
    } else {
      setIdx(i => i + 1)
      setRevealed(false)
    }
  }

  const restart = () => {
    setQueue(shuffle(words))
    setIdx(0)
    setRevealed(false)
    setKnownCount(0)
    setAgainCount(0)
    setRoundDone(false)
  }

  const reveal = () => {
    if (!revealed) setRevealed(true)
  }

  if (roundDone) {
    return (
      <div className="editorial-card p-6 lg:p-8 text-center" data-testid="quiz-summary">
        <p className="editorial-label mb-3">自测小结</p>
        <h2 className="text-2xl text-text-primary mb-4">本轮完成</h2>
        <p className="text-text-secondary mb-8">
          会了 {knownCount} · 再看 {againCount}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={restart}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover transition-colors"
          >
            <RotateCcw size={16} />
            再测一遍
          </button>
          <button
            type="button"
            onClick={onExit}
            className="px-5 py-2 rounded-lg border border-border text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            回到学习
          </button>
        </div>
      </div>
    )
  }

  if (!current) return null

  return (
    <div data-testid="quiz-view">
      {/* 进度：3 / 19 */}
      <div className="flex items-baseline justify-between mb-3">
        <p className="editorial-label">
          自测 · {mode === 'hint' ? '提示模式' : '硬核模式'}
        </p>
        <div className="flex items-baseline gap-3">
          <p className="font-mono text-sm text-text-muted">
            {Math.min(idx + 1, queue.length)} / {queue.length}
          </p>
          <button
            type="button"
            onClick={onExit}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            退出自测
          </button>
        </div>
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label={revealed ? undefined : '点击卡片揭示释义'}
        onClick={reveal}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            reveal()
          }
        }}
        className="editorial-card p-6 lg:p-8 cursor-pointer select-none focus:outline-none focus:border-accent/50"
      >
        {/* 揭示前：只显示单词 + 发音（提示模式加词根拆解，不给释义） */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <h2 className="text-3xl lg:text-4xl text-text-primary">
            {current.word}
          </h2>
          <SpeakButton word={current.word} />
        </div>

        {mode === 'hint' && (
          <div className="mt-4">
            <p className="editorial-label mb-2 inline-flex items-center gap-1.5">
              <Lightbulb size={12} />
              词根拆解
            </p>
            <p className="text-sm leading-relaxed">
              {current.parts.map((part, i) => (
                <span key={i}>
                  {i > 0 && ' + '}
                  <span className="font-mono text-root">{part.text}</span>
                  <span className="text-text-muted">（{part.meaning}）</span>
                </span>
              ))}
            </p>
          </div>
        )}

        {revealed ? (
          <>
            <p className="text-text-secondary leading-relaxed mt-4">
              {current.definition}
            </p>
            {mode === 'hard' && (
              <p className="text-sm leading-relaxed mt-4">
                {current.parts.map((part, i) => (
                  <span key={i}>
                    {i > 0 && ' + '}
                    <span className="font-mono text-root">{part.text}</span>
                    <span className="text-text-muted">（{part.meaning}）</span>
                  </span>
                ))}
              </p>
            )}

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  judge('known')
                }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover transition-colors"
              >
                <Check size={16} />
                会了
              </button>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  judge('again')
                }}
                className="px-5 py-2 rounded-lg border border-border text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                再看
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-text-muted mt-6">点击卡片揭示释义</p>
        )}
      </div>
    </div>
  )
}
