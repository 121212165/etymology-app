// src/app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { FocusCard } from '@/components/home/FocusCard'
import { useSearch } from '@/hooks/useSearch'
import { useAppStore } from '@/store/app-store'
import { useProgressStore } from '@/store/progress-store'
import { loadMindMapData, getCoreRoots } from '@/lib/mindmap-loader'
import type { EnhancedRootNode } from '@/lib/mindmap-types'

export default function HomePage() {
  const { loading, error, retry } = useSearch()
  const { searchIndex } = useAppStore()
  const { currentRoot, setCurrentRoot, completedRoots, getViewedCountForRoot } = useProgressStore()
  const [coreRoots, setCoreRoots] = useState<EnhancedRootNode[]>([])
  const [focusRoot, setFocusRoot] = useState<EnhancedRootNode | null>(null)

  useEffect(() => {
    loadMindMapData().then(data => {
      const cores = getCoreRoots(data)
      setCoreRoots(cores)

      if (currentRoot) {
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
  }, [])

  if (loading || !searchIndex || !focusRoot) {
    return (
      <div className="min-h-screen bg-bg-deep flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary text-sm">加载中...</p>
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

  const viewedCount = getViewedCountForRoot(
    focusRoot.primaryText,
    focusRoot.wordIndices,
    searchIndex.data
  )

  return (
    <div className="min-h-screen bg-bg-deep">
      <TopBar />

      <main className="max-w-5xl mx-auto p-6 pt-16">
        <FocusCard root={focusRoot} viewedCount={viewedCount} />
      </main>
    </div>
  )
}
