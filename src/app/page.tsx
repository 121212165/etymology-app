'use client'

import { useState, useMemo, useCallback } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { CardGrid } from '@/components/word/CardGrid'
import { RootCloud } from '@/components/search/RootCloud'
import { useSearch } from '@/hooks/useSearch'
import { useSpeak } from '@/hooks/useSpeak'
import { useAppStore } from '@/store/app-store'

const PAGE_SIZE = 50

export default function HomePage() {
  const { loading, error, retry } = useSearch()
  const { searchIndex, query, activeRoot, filteredIndices } = useAppStore()
  const speak = useSpeak()
  const [showCount, setShowCount] = useState(PAGE_SIZE)

  const hasQuery = query.trim().length > 0 || activeRoot !== null

  const pageEntries = useMemo(() => {
    if (!searchIndex) return []
    return filteredIndices.slice(0, showCount).map((idx) => ({
      entry: searchIndex.data[idx],
    }))
  }, [searchIndex, filteredIndices, showCount])

  const handleLoadMore = useCallback(() => {
    setShowCount((c) => c + PAGE_SIZE)
  }, [])

  if (loading || !searchIndex) {
    return (
      <div className="min-h-screen bg-bg-deep flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary text-sm">加载数据中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg-deep flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-text-secondary">{error}</p>
          <button
            onClick={retry}
            className="px-6 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-deep">
      <TopBar />

      <main className="max-w-5xl mx-auto p-6">
        {!hasQuery && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">掌握词根拆解，读懂英语世界</h1>
            <p className="text-text-secondary mb-6">点击词根浏览相关单词，或在上方搜索</p>
            <RootCloud rootIndex={searchIndex.rootIndex} />
          </div>
        )}

        {hasQuery && (
          <div className="mb-4 flex items-center gap-3">
            <span className="text-sm text-text-muted">
              {filteredIndices.length.toLocaleString()} 个结果
            </span>
          </div>
        )}

        <CardGrid
          entries={pageEntries}
          onSpeak={speak}
          emptyHint="试试输入词根，如 port-, duct-, spect-"
        />

        {hasQuery && showCount < filteredIndices.length && (
          <div className="flex justify-center mt-8">
            <button
              onClick={handleLoadMore}
              className="px-6 py-2 rounded-lg bg-bg-surface border border-border text-sm text-text-secondary hover:text-text-primary hover:border-accent/30 transition-all"
            >
              加载更多 ({filteredIndices.length - showCount} 剩余)
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
