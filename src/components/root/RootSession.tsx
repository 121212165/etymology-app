// src/components/root/RootSession.tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { PartTags } from '@/components/word/PartTags'
import { SpeakButton } from '@/components/word/SpeakButton'
import { MindMap } from '@/components/mindmap/MindMap'
import { useProgressStore } from '@/store/progress-store'
import { loadMindMapData } from '@/lib/mindmap-loader'
import { loadSearchIndex } from '@/lib/data-loader'
import { useAppStore } from '@/store/app-store'
import type { VocabEntry } from '@/lib/types'
import type { MindMapData, EnhancedRootNode } from '@/lib/mindmap-types'
import { MicroCelebrate } from '@/components/feedback/MicroCelebrate'
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation'

interface RootSessionProps {
  rootText: string
  rootMeaning: string
  words: VocabEntry[]
  /** 合并后的词根节点，用于思维导图；若未传则不渲染导图 */
  enhancedRoot?: EnhancedRootNode
}

export function RootSession({ rootText, rootMeaning, words, enhancedRoot }: RootSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionFinished, setSessionFinished] = useState(false)
  const [mindmapData, setMindmapData] = useState<MindMapData | null>(null)
  // 仅在用户主动点击"下一个"时才触发微庆祝，避免首次挂载即弹出
  const [celebrationTick, setCelebrationTick] = useState(0)
  const firstRenderRef = useRef(true)
  const { markWordViewed, markRootCompleted, setCurrentRoot } = useProgressStore()
  const { searchIndex, setSearchIndex } = useAppStore()

  // 边界保护：currentIndex 可能因词根切换（上层未加 key 时）或 words 变短而越界，
  // 此时回退到首词，避免 render 阶段读取 undefined.word 崩溃。
  // 注：词根切换的正确重置依赖 page 层的 key={displayRootText} 强制重挂载，
  //    此处仅作兜底防御，不替代 key。
  const safeIndex = currentIndex < words.length ? currentIndex : 0
  const current = words[safeIndex]
  const isLast = safeIndex === words.length - 1

  useEffect(() => {
    setCurrentRoot(rootText)
  }, [rootText, setCurrentRoot])

  useEffect(() => {
    if (current) markWordViewed(current.word)
  }, [current, markWordViewed])

  // 懒加载思维导图数据（仅一次）；辅助可视化，加载失败不阻塞主流程，但记录上下文便于排查
  useEffect(() => {
    if (!enhancedRoot || mindmapData) return
    loadMindMapData().then(setMindmapData).catch(err => {
      console.warn('[RootSession] mindmap load failed for', rootText, err)
    })
  }, [enhancedRoot, mindmapData, rootText])

  // 思维导图需要 vocab 数据；首页路径由 useSearch 预载，直达/刷新本页时 store 为空，
  // 这里自行触发一次加载（loadSearchIndex 有模块级缓存，重复调用无额外成本）
  useEffect(() => {
    if (!enhancedRoot || searchIndex) return
    loadSearchIndex().then(setSearchIndex).catch(err => {
      console.warn('[RootSession] search index load failed for', rootText, err)
    })
  }, [enhancedRoot, searchIndex, setSearchIndex, rootText])

  const handleNext = useCallback(() => {
    if (isLast) {
      markRootCompleted(rootText)
      setSessionFinished(true)
      return
    }
    setCurrentIndex(i => i + 1)
    setCelebrationTick(t => t + 1)
  }, [isLast, markRootCompleted, rootText])

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1)
  }, [currentIndex])

  // ── 键盘导航：←/→ 换词 ──
  // 输入类元素聚焦或带修饰键时忽略；完成态下不再换词。
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (sessionFinished) return
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
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrev()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [sessionFinished, handleNext, handlePrev])

  // ── 触摸导航：词卡上水平滑动换词 ──
  const swipeHandlers = useSwipeNavigation({
    onSwipeLeft: handleNext,
    onSwipeRight: handlePrev,
    enabled: !sessionFinished,
  })

  // 首次渲染跳过庆祝触发
  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false
    }
  }, [])

  if (words.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10 lg:py-14 text-center">
        <h1 className="text-2xl text-text-primary mb-2 font-mono text-root">
          {rootText}
        </h1>
        <p className="text-text-secondary mb-8">这组词还没有内容</p>
        <Link
          href="/"
          className="text-accent hover:underline text-sm"
        >
          回首页
        </Link>
      </div>
    )
  }

  if (sessionFinished) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10 lg:py-14 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-accent/20 flex items-center justify-center">
          <Check size={32} className="text-accent" />
        </div>
        <h1 className="text-2xl text-text-primary mb-2">
          看完 <span className="font-mono text-root">{rootText}</span>
        </h1>
        <p className="text-text-secondary mb-8">
          这组词你都看过了
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover transition-colors"
        >
          回首页看下一个
          <ArrowRight size={16} />
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 lg:py-14">
      {/* ── 词根标题 ── */}
      <div className="mb-8">
        <p className="editorial-label mb-3">词根</p>
        <div className="flex items-baseline gap-3 mb-4">
          <h1 className="text-3xl lg:text-4xl font-mono text-root">
            {rootText}
          </h1>
          <span className="text-lg text-text-secondary">{rootMeaning}</span>
        </div>
        {/* 进度条：只显示比例，不显示 X/Y 数字，避免暴露总数造成压迫感 */}
        <div className="h-0.5 bg-bg-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
          />
        </div>
      </div>

      <hr className="editorial-divider mb-8" />

      {/* ── 当前单词卡片（支持水平滑动换词） ── */}
      <div className="editorial-card p-6 lg:p-8 mb-6" {...swipeHandlers}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-3xl lg:text-4xl text-text-primary mb-2">
              {current.word}
            </h2>
            <p className="text-text-secondary leading-relaxed">
              {current.definition}
            </p>
          </div>
          <SpeakButton word={current.word} />
        </div>

        <div className="mt-5">
          <PartTags parts={current.parts} />
        </div>

        <hr className="editorial-divider my-6" />

        <p className="text-sm text-text-secondary leading-relaxed">
          <span className="text-text-primary font-medium">{current.word}</span>
          {' 由 '}
          {current.parts.map((part, i) => (
            <span key={i}>
              {i > 0 && ' + '}
              <span className="font-mono text-root">{part.text}</span>
              <span className="text-text-muted">（{part.meaning}）</span>
            </span>
          ))}
          {' 组成'}
        </p>
      </div>

      {/* 思维导图：辅助可视化当前词根的关联网络 */}
      {enhancedRoot && mindmapData && searchIndex?.data && (
        <div className="mb-6">
          <p className="editorial-label mb-3">关联网络</p>
          <MindMap
            data={mindmapData}
            vocab={searchIndex.data}
            centerRoot={enhancedRoot}
          />
        </div>
      )}

      {/* ── 导航 ── */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeft size={16} />
          上一个
        </button>

        <button
          onClick={handleNext}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover transition-colors"
        >
          {isLast ? '完成' : '下一个'}
          <ArrowRight size={16} />
        </button>
      </div>
      <MicroCelebrate trigger={celebrationTick} message="已看" />
    </div>
  )
}
