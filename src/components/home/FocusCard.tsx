// src/components/home/FocusCard.tsx
'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { EnhancedRootNode } from '@/lib/mindmap-types'

interface FocusCardProps {
  root: EnhancedRootNode
  viewedCount: number
}

export function FocusCard({ root, viewedCount }: FocusCardProps) {
  const isFirstTime = viewedCount === 0

  return (
    <div className="max-w-xl mx-auto px-4">
      <div className="bg-bg-surface border border-border rounded-2xl p-8 hover:border-accent/30 transition-all duration-300">
        <p className="text-xs text-text-muted uppercase tracking-wider mb-3">
          {isFirstTime ? '今日词根' : '继续这个词根'}
        </p>

        <div className="flex items-baseline gap-3 mb-4">
          <h2 className="text-4xl font-bold font-mono text-root">
            {root.primaryText}
          </h2>
          <span className="text-lg text-text-secondary">{root.meaning}</span>
        </div>

        <p className="text-text-secondary text-sm mb-6">
          {isFirstTime ? '一组关联词，3 分钟看完' : `已看 ${viewedCount} 个词`}
        </p>

        <Link
          href={`/root/${encodeURIComponent(root.primaryText)}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover transition-colors"
        >
          {isFirstTime ? '开始看' : '继续看'}
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  )
}
