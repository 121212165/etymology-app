'use client'

import Link from 'next/link'
import { CheckCircle, ArrowLeft } from 'lucide-react'

interface TrainCompleteProps {
  groupLabel: string
  stats: {
    observeCount: number
    guessCorrect: number
    guessTotal: number
    decomposeCorrect: number
    decomposeTotal: number
  }
  onRestart: () => void
}

export function TrainComplete({ groupLabel, stats, onRestart }: TrainCompleteProps) {
  const guessPercent = stats.guessTotal > 0 ? Math.round((stats.guessCorrect / stats.guessTotal) * 100) : 0
  const decomposePercent = stats.decomposeTotal > 0 ? Math.round((stats.decomposeCorrect / stats.decomposeTotal) * 100) : 0

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-8 gap-6">
      <CheckCircle size={64} className="text-accent" />

      <h1 className="text-2xl font-bold text-text-primary text-center">
        你已掌握词根拆解的方法
      </h1>

      <p className="text-text-secondary text-sm">
        {groupLabel} · {stats.observeCount}个词根
      </p>

      <div className="flex flex-col gap-2 text-sm text-text-secondary">
        <div>
          猜词义正确率{' '}
          <span className="font-medium text-text-primary">
            {stats.guessCorrect}/{stats.guessTotal} ({guessPercent}%)
          </span>
        </div>
        <div>
          自主拆解正确率{' '}
          <span className="font-medium text-text-primary">
            {stats.decomposeCorrect}/{stats.decomposeTotal} ({decomposePercent}%)
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-text-secondary hover:bg-bg-hover transition-colors"
        >
          <ArrowLeft size={16} />
          返回首页
        </Link>
        <button
          onClick={onRestart}
          className="px-5 py-2.5 rounded-lg bg-accent text-white font-medium hover:opacity-90 transition-opacity"
        >
          再来一次
        </button>
      </div>
    </div>
  )
}
