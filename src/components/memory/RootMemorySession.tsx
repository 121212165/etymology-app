// src/components/memory/RootMemorySession.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { RefreshCw } from 'lucide-react'
import { MaskedText } from '@/components/mask/MaskedText'
import { SpeakButton } from '@/components/word/SpeakButton'
import { loadMindMapData } from '@/lib/mindmap-loader'
import { useMemoryStore } from '@/store/memory-store'
import type { Rating } from '@/lib/fsrs'
import type { EnhancedRootNode } from '@/lib/mindmap-types'

/** 单次会话上限，防止疲劳刷卡 */
const SESSION_LIMIT = 30

const RATING_BUTTONS: { rating: Rating; label: string; primary?: boolean }[] = [
  { rating: 1, label: '忘了' },
  { rating: 2, label: '困难' },
  { rating: 3, label: '良好', primary: true },
  { rating: 4, label: '轻松' },
]

interface QueueItem {
  root: EnhancedRootNode
  /** 组队时该词根尚无记忆卡（本次会话中的新词） */
  isNew: boolean
}

interface SessionBuild {
  queue: QueueItem[]
  /** 组队时的到期卡总数（今日待复习） */
  dueCount: number
  /** 组队时的新词产出总数（今日新词额度内的） */
  freshCount: number
}

/** 组一次会话队列：到期卡在前、新词在后，总量钳制到 SESSION_LIMIT */
function buildSession(roots: EnhancedRootNode[], now: number): SessionBuild {
  const { sessionQueue } = useMemoryStore.getState()
  const { due, fresh } = sessionQueue({ roots }, now)
  const byText = new Map(roots.map(r => [r.primaryText, r]))
  const queue: QueueItem[] = []
  for (const card of due) {
    // 词库更新后可能残留孤儿卡（词根已不存在），跳过
    const root = byText.get(card.id)
    if (root) queue.push({ root, isNew: false })
  }
  for (const root of fresh) queue.push({ root, isNew: true })
  return {
    queue: queue.slice(0, SESSION_LIMIT),
    dueCount: due.length,
    freshCount: fresh.length,
  }
}

export function RootMemorySession() {
  const [roots, setRoots] = useState<EnhancedRootNode[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<SessionBuild | null>(null)
  const [index, setIndex] = useState(0)
  // 释义揭示状态：换卡 / 重组队列时重置回遮挡
  const [revealed, setRevealed] = useState(false)
  // 会话小结计数：复习 = 已有卡的评分，新学 = 新卡首次评分
  const [reviewed, setReviewed] = useState(0)
  const [freshLearned, setFreshLearned] = useState(0)

  const load = useCallback(() => {
    setError(null)
    setRoots(null)
    setSession(null)
    loadMindMapData()
      .then(data => setRoots(data.roots))
      .catch(() => setError('词根数据加载失败，请重试'))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // 数据就绪后组一次当日队列；会话内评分只推进指针，不重算队列
  useEffect(() => {
    if (!roots) return
    setSession(buildSession(roots, Date.now()))
    setIndex(0)
    setReviewed(0)
    setFreshLearned(0)
    setRevealed(false)
  }, [roots])

  // 换卡后新卡重新遮挡（index 不变的重置路径由 load / handleRestart 内的 setRevealed 兜底）
  useEffect(() => {
    setRevealed(false)
  }, [index])

  const items = session?.queue ?? []
  const finished = session !== null && index >= items.length
  const current = items[index]

  const handleRate = useCallback(
    (rating: Rating) => {
      if (!current) return
      useMemoryStore
        .getState()
        .rate(current.root.primaryText, rating, Date.now())
      if (current.isNew) setFreshLearned(n => n + 1)
      else setReviewed(n => n + 1)
      setIndex(i => i + 1)
    },
    [current]
  )

  const handleRestart = useCallback(() => {
    if (!roots) return
    setSession(buildSession(roots, Date.now()))
    setIndex(0)
    setReviewed(0)
    setFreshLearned(0)
    setRevealed(false)
  }, [roots])

  // ── 键盘：空格揭示，1-4 评分（仅揭示后生效）；输入类元素聚焦时忽略 ──
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }
      if (e.key === ' ') {
        e.preventDefault()
        setRevealed(true)
      } else if (
        revealed &&
        current &&
        (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4')
      ) {
        e.preventDefault()
        handleRate(Number(e.key) as Rating)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [revealed, current, handleRate])

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-40 text-center">
        <p className="text-text-secondary">{error}</p>
        <button
          type="button"
          onClick={load}
          className="px-6 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover transition-colors"
        >
          重试
        </button>
      </div>
    )
  }

  if (!roots || !session) {
    return (
      <div className="flex flex-col items-center gap-4 py-40">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-text-secondary text-sm">加载中...</p>
      </div>
    )
  }

  return (
    <main className="max-w-2xl mx-auto px-6 pt-16 pb-24">
      {/* ── 顶部统计 ── */}
      <div className="flex items-baseline justify-between mb-6">
        <p className="editorial-label">词根记忆</p>
        <p className="text-xs text-text-muted">
          今日待复习 {session.dueCount} · 新词 {session.freshCount}
        </p>
      </div>

      <hr className="editorial-divider mb-8" />

      {finished ? (
        /* ── 队列空了：小结卡 ── */
        <div className="editorial-card p-10 text-center">
          <p className="editorial-label mb-4">本组小结</p>
          <p className="text-2xl text-text-primary mb-2">
            复习 {reviewed} · 新学 {freshLearned}
          </p>
          {reviewed + freshLearned === 0 && (
            <p className="text-sm text-text-secondary">
              今日队列已空，休息一下吧
            </p>
          )}
          <div className="flex justify-center gap-3 mt-8">
            <button
              type="button"
              onClick={handleRestart}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover transition-colors"
            >
              <RefreshCw size={16} />
              再来一组
            </button>
            <Link
              href="/roots"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-text-secondary hover:text-text-primary hover:border-accent/50 transition-colors"
            >
              回全部词根
            </Link>
          </div>
        </div>
      ) : (
        /* ── 当前记忆卡 ── */
        <>
          <div className="editorial-card p-8 lg:p-10 text-center">
            <div className="flex items-start justify-center gap-3 mb-1">
              <h2 className="font-mono text-root text-5xl">
                {current.root.primaryText}
              </h2>
              <SpeakButton word={current.root.primaryText} />
            </div>
            {current.root.aliases.length > 0 && (
              <p className="font-mono text-xs text-text-muted mb-4">
                变体：{current.root.aliases.join(' · ')}
              </p>
            )}

            <div className="my-8">
              <MaskedText
                active
                revealed={revealed}
                onReveal={() => setRevealed(true)}
                className="text-text-secondary text-lg leading-relaxed"
              >
                {current.root.meaning}
              </MaskedText>
            </div>

            {!revealed ? (
              <p className="text-xs text-text-muted">空格或点击释义揭示</p>
            ) : (
              <>
                <p className="text-sm text-text-muted mb-6">
                  关联 {current.root.wordCount} 个词
                </p>
                <div className="flex justify-center gap-2 flex-wrap">
                  {RATING_BUTTONS.map(({ rating, label, primary }) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => handleRate(rating)}
                      className={
                        primary
                          ? 'inline-flex items-center px-5 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover transition-colors'
                          : 'inline-flex items-center px-4 py-2 rounded-lg border border-border text-sm text-text-secondary hover:text-text-primary hover:border-accent/50 transition-colors'
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <p className="text-center text-xs text-text-muted mt-4">
            第 {Math.min(index + 1, items.length)} / {items.length} 张
          </p>
        </>
      )}
    </main>
  )
}
