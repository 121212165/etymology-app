'use client'

import { useState, useMemo } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { RootGroupPicker } from '@/components/train/RootGroupPicker'
import { CardGrid } from '@/components/word/CardGrid'
import { FilterChips } from '@/components/search/FilterChips'
import { useSearch } from '@/hooks/useSearch'
import { useAppStore } from '@/store/app-store'
import Link from 'next/link'
import { Swords, Zap, Search } from 'lucide-react'

export default function HomePage() {
  const { loading } = useSearch()
  const { searchIndex, query, filteredIndices } = useAppStore()

  const pageEntries = useMemo(() => {
    if (!searchIndex) return []
    return filteredIndices.slice(0, 24).map((idx) => ({
      entry: searchIndex.data[idx],
      index: idx,
    }))
  }, [searchIndex, filteredIndices])

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

  const showSearch = query.trim().length > 0

  return (
    <div className="min-h-screen bg-bg-deep">
      <TopBar />

      {showSearch && (
        <div className="max-w-5xl mx-auto p-6">
          <div className="mb-4">
            <FilterChips />
          </div>
          <CardGrid
            entries={pageEntries}
            emptyHint="试试输入词根，如 port-, duct-, spect-"
          />
        </div>
      )}

      {!showSearch && (
        <main className="max-w-5xl mx-auto p-6">
          <h1 className="text-3xl font-bold mb-2">掌握词根拆解，读懂英语世界</h1>
          <p className="text-text-secondary mb-8">选择一个词根组开始学习</p>

          <RootGroupPicker rootIndex={searchIndex.rootIndex} />

          <hr className="my-8 border-border" />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/challenge"
              className="bg-bg-surface border border-border rounded-xl p-4 hover:border-accent/30 transition-all"
            >
              <div className="flex items-center gap-2 mb-1">
                <Swords className="w-4 h-4 text-accent" />
                <span className="font-medium">挑战模式</span>
              </div>
              <p className="text-sm text-text-secondary">测试你的词根掌握程度</p>
            </Link>

            <Link
              href="/speed"
              className="bg-bg-surface border border-border rounded-xl p-4 hover:border-accent/30 transition-all"
            >
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-accent" />
                <span className="font-medium">Speed 速览</span>
              </div>
              <p className="text-sm text-text-secondary">快速浏览词根与单词</p>
            </Link>

            <Link
              href="/"
              className="bg-bg-surface border border-border rounded-xl p-4 hover:border-accent/30 transition-all"
            >
              <div className="flex items-center gap-2 mb-1">
                <Search className="w-4 h-4 text-accent" />
                <span className="font-medium">搜索</span>
              </div>
              <p className="text-sm text-text-secondary">在顶部搜索栏查找单词</p>
            </Link>
          </div>
        </main>
      )}
    </div>
  )
}
