// src/app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { useSearch } from '@/hooks/useSearch'
import { useAppStore } from '@/store/app-store'
import { useProgressStore } from '@/store/progress-store'
import { loadMindMapData, getCoreRoots } from '@/lib/mindmap-loader'
import type { EnhancedRootNode } from '@/lib/mindmap-types'

const WORD_GRID_LIMIT = 12

export default function HomePage() {
  const { loading, error, retry } = useSearch()
  const { searchIndex } = useAppStore()
  const { getViewedCountForRoot, isRootCompleted } = useProgressStore()
  const [focusRoot, setFocusRoot] = useState<EnhancedRootNode | null>(null)
  const [coreRoots, setCoreRoots] = useState<EnhancedRootNode[]>([])
  // 思维导图数据加载失败时给出独立错误与重试入口，避免首页永久转圈
  const [mindmapError, setMindmapError] = useState<string | null>(null)
  const [mindmapLoading, setMindmapLoading] = useState(true)

  const loadMindmap = () => {
    setMindmapLoading(true)
    setMindmapError(null)
    loadMindMapData()
      .then(data => {
        const cores = getCoreRoots(data)
        setCoreRoots(cores)
        const { currentRoot, completedRoots, setCurrentRoot } = useProgressStore.getState()

        if (currentRoot && !completedRoots.includes(currentRoot)) {
          const found = cores.find(r => r.primaryText === currentRoot)
          if (found) {
            setFocusRoot(found)
            return
          }
        }

        const next = cores.find(r => !completedRoots.includes(r.primaryText)) || cores[0]
        setFocusRoot(next)
        setCurrentRoot(next?.primaryText || null)
      })
      .catch(err => {
        console.error('[home] Failed to load mindmap data:', err)
        setMindmapError('词根数据加载失败，请重试')
      })
      .finally(() => setMindmapLoading(false))
  }

  useEffect(() => {
    loadMindmap()
  }, [])

  // 错误优先于 loading 判定，否则失败时 searchIndex/focusRoot 恒为空会一直走转圈分支
  const anyError = error || mindmapError
  if (anyError) {
    return (
      <div className="min-h-screen bg-bg-deep flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-text-secondary">{anyError}</p>
          <button
            onClick={() => {
              if (error) retry()
              if (mindmapError) loadMindmap()
            }}
            className="px-6 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  if (loading || mindmapLoading || !searchIndex || !focusRoot) {
    return (
      <div className="min-h-screen bg-bg-deep flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary text-sm">加载中...</p>
        </div>
      </div>
    )
  }

  const viewedCount = getViewedCountForRoot(
    focusRoot.wordIndices,
    searchIndex.data
  )
  const isFirstTime = viewedCount === 0
  const completedCount = coreRoots.filter(r => isRootCompleted(r.primaryText)).length

  // 焦点词根下的词汇预览
  const focusWords = focusRoot.wordIndices
    .filter(idx => idx < searchIndex.data.length)
    .slice(0, WORD_GRID_LIMIT)
    .map(idx => searchIndex.data[idx])
    .filter(Boolean)

  return (
    <div className="min-h-screen bg-bg-deep">
      <TopBar />

      <main className="max-w-3xl mx-auto px-6 pt-20 pb-24 text-center">
        {/* ── Hero ── */}
        <section className="mb-14">
          <p className="editorial-label mb-4">英语词根词缀拆解</p>
          <h1 className="text-5xl lg:text-6xl text-text-primary mb-4">
            林序
          </h1>
          <p className="text-text-secondary text-base lg:text-lg max-w-lg mx-auto leading-relaxed">
            5011 个单词，按词根分组。从核心词根出发，三分钟看懂一组关联词。
          </p>
        </section>

        <hr className="editorial-divider mb-12" />

        {/* ── 焦点词根 ── */}
        <section className="mb-12">
          <div className="flex items-baseline justify-between mb-4 max-w-xl mx-auto">
            <p className="editorial-label">
              {isFirstTime ? '从这里开始' : '继续'}
            </p>
            <p className="text-xs text-text-muted">
              {completedCount} / {coreRoots.length} 组已完成
            </p>
          </div>

          <div className="editorial-card p-8 lg:p-10 max-w-xl mx-auto text-left">
            <div className="flex items-baseline gap-4 mb-3 justify-center">
              <h2 className="text-4xl lg:text-5xl font-mono text-root">
                {focusRoot.primaryText}
              </h2>
              <span className="text-xl text-text-secondary">
                {focusRoot.meaning}
              </span>
            </div>

            <p className="text-sm text-text-muted mb-6 text-center">
              {isFirstTime
                ? `${focusRoot.wordCount} 个关联词 · 3 分钟看完`
                : `已看 ${viewedCount} / ${focusRoot.wordCount} 个词`}
            </p>

            {/* 进度条 */}
            {!isFirstTime && (
              <div className="h-0.5 bg-bg-elevated rounded-full overflow-hidden mb-6">
                <div
                  className="h-full bg-accent transition-all duration-300"
                  style={{
                    width: `${focusRoot.wordCount > 0
                      ? (viewedCount / focusRoot.wordCount) * 100
                      : 0}%`,
                  }}
                />
              </div>
            )}

            <div className="text-center">
              <Link
                href={`/root/${encodeURIComponent(focusRoot.primaryText)}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover transition-colors"
              >
                {isFirstTime ? '开始看' : '继续看'}
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* ── 焦点词根下的词汇预览 ── */}
        {focusWords.length > 0 && (
          <section className="mb-14">
            <p className="editorial-label mb-5">这组词</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-w-2xl mx-auto">
              {focusWords.map((word) => (
                <Link
                  key={word.word}
                  href={`/word/${encodeURIComponent(word.word)}`}
                  className="word-grid-item text-left"
                >
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-text-primary truncate">
                      {word.word}
                    </span>
                    {word.parts
                      .filter(p => p.type === 'root')
                      .slice(0, 1)
                      .map((p, i) => (
                        <span
                          key={i}
                          className="text-xs font-mono text-root shrink-0"
                        >
                          {p.text}
                        </span>
                      ))}
                  </div>
                  <p className="text-xs text-text-secondary truncate">
                    {word.definition}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <hr className="editorial-divider mb-12" />

        {/* ── 词根云（全部核心词根） ── */}
        <section>
          <p className="editorial-label mb-5">核心词根 · {coreRoots.length}</p>
          <div className="flex flex-wrap gap-1.5 justify-center max-w-2xl mx-auto">
            {coreRoots.map((root) => {
              const completed = isRootCompleted(root.primaryText)
              return (
                <Link
                  key={root.primaryText}
                  href={`/root/${encodeURIComponent(root.primaryText)}`}
                  className="root-cloud-item"
                >
                  <span className="root-cloud-text">{root.primaryText}</span>
                  <span className="text-xs text-text-muted">
                    {root.wordCount}
                    {completed && ' ·'}
                    {completed && (
                      <span className="text-accent ml-0.5">✓</span>
                    )}
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
