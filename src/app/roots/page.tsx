// src/app/roots/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { loadMindMapData } from '@/lib/mindmap-loader'
import { useProgressStore } from '@/store/progress-store'
import type { EnhancedRootNode } from '@/lib/mindmap-types'

/** 层级展示顺序与中文标签：核心（≥10 词）→ 进阶（4–9 词）→ 补充（2–3 词） */
const LAYERS: { key: EnhancedRootNode['layer']; label: string; desc: string }[] = [
  { key: 'core', label: '核心', desc: '每组 10 词以上' },
  { key: 'middle', label: '进阶', desc: '每组 4–9 词' },
  { key: 'edge', label: '补充', desc: '每组 2–3 词' },
]

export default function AllRootsPage() {
  const [roots, setRoots] = useState<EnhancedRootNode[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  // 整店订阅（与首页一致）：persist 从 localStorage 恢复 completedRoots 时触发重渲染，
  // 否则只订阅 isRootCompleted 函数引用不会感知 rehydrate
  const { isRootCompleted } = useProgressStore()

  const load = () => {
    setError(null)
    loadMindMapData()
      .then(data => setRoots(data.roots))
      .catch(() => setError('词根数据加载失败，请重试'))
  }

  useEffect(() => {
    load()
  }, [])

  if (error) {
    return (
      <div className="min-h-screen bg-bg-deep flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-text-secondary">{error}</p>
          <button
            onClick={load}
            className="px-6 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  if (!roots) {
    return (
      <div className="min-h-screen bg-bg-deep flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary text-sm">加载中...</p>
        </div>
      </div>
    )
  }

  const completedCount = roots.filter(r => isRootCompleted(r.primaryText)).length

  return (
    <div className="min-h-screen bg-bg-deep">
      <TopBar />

      <main className="max-w-3xl mx-auto px-6 pt-20 pb-24">
        {/* ── 标题区 ── */}
        <section className="text-center mb-10">
          <p className="editorial-label mb-4">全部词根</p>
          <h1 className="text-4xl lg:text-5xl text-text-primary mb-4">
            {roots.length} 组
          </h1>
          <p className="text-text-secondary text-sm">
            已完成 {completedCount} / {roots.length} 组 · 按包含词量分层
          </p>
        </section>

        <hr className="editorial-divider mb-12" />

        {/* ── 按层分组的词根云 ── */}
        {LAYERS.map(({ key, label, desc }) => {
          const layerRoots = roots.filter(r => r.layer === key)
          if (layerRoots.length === 0) return null
          return (
            <section key={key} className="mb-12">
              <div className="flex items-baseline justify-between mb-5">
                <p className="editorial-label">
                  {label}词根 · {layerRoots.length}
                </p>
                <p className="text-xs text-text-muted">{desc}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {layerRoots.map((root) => {
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
          )
        })}

        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={16} />
            回首页
          </Link>
        </div>
      </main>
    </div>
  )
}
