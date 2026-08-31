// src/components/root/SessionCelebrate.tsx
'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { loadMindMapData, getCoreRoots } from '@/lib/mindmap-loader'

interface SessionCelebrateProps {
  rootText: string
  /** 本组词数 */
  wordCount: number
  /** 已完成词根组数（含当前组） */
  completedCount: number
  /** 点跳过 / 点遮罩 / 按 Esc 时调用；2 秒自动进入由父组件的倒计时负责 */
  onContinue: () => void
}

/**
 * 完成庆祝全屏覆盖层：金色圆圈大对勾 scale-in + 2 秒倒计时环。
 * 纯 CSS 动画（globals.css Session UX 分区），prefers-reduced-motion 下
 * 动画被全局规则压缩，视觉静止但停顿节奏（父组件 2 秒计时）保持。
 */
export function SessionCelebrate({
  rootText,
  wordCount,
  completedCount,
  onContinue,
}: SessionCelebrateProps) {
  // core 词根总数：加载失败时保持 null，进度文案只显示本组词数
  const [coreCount, setCoreCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    loadMindMapData()
      .then(data => {
        if (!cancelled) setCoreCount(getCoreRoots(data).length)
      })
      .catch(() => {
        // 加载失败不阻塞庆祝层
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Esc 立即进入下一组
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onContinue()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onContinue])

  return (
    <div
      className="fixed inset-0 z-[60] session-overlay-in bg-bg-deep/95 backdrop-blur-sm flex items-center justify-center px-6 cursor-pointer"
      role="dialog"
      aria-modal="true"
      aria-label={`看完 ${rootText} 组`}
      data-testid="session-celebrate"
      onClick={onContinue}
    >
      <div
        className="text-center max-w-md cursor-default"
        onClick={e => e.stopPropagation()}
      >
        {/* 倒计时环 + 金色圆圈大对勾 */}
        <div className="relative w-28 h-28 mx-auto mb-6">
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 w-full h-full -rotate-90"
            aria-hidden="true"
          >
            {/* 底环：静态轨道 */}
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="var(--bg-elevated)"
              strokeWidth="3"
            />
            {/* 倒计时环：stroke-dashoffset 从满环退到空环 */}
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="3"
              strokeLinecap="round"
              className="session-ring-countdown"
            />
          </svg>
          <div className="absolute inset-2 rounded-full bg-accent/15 flex items-center justify-center session-check-in">
            <Check size={40} strokeWidth={2.5} className="text-accent" />
          </div>
        </div>

        <h1 className="text-2xl text-text-primary mb-3 session-rise-in">
          看完 <span className="font-mono text-root">{rootText}</span> 组
        </h1>
        <p className="text-text-secondary mb-8 session-rise-in">
          本组 {wordCount} 词
          {coreCount !== null && (
            <>
              {' · 已完成 '}
              {completedCount} / {coreCount} 组
            </>
          )}
        </p>
        <button
          type="button"
          onClick={onContinue}
          className="px-5 py-2.5 rounded-lg border border-border text-sm text-text-secondary hover:text-accent hover:border-accent/40 transition-colors"
        >
          跳过
        </button>
      </div>
    </div>
  )
}
