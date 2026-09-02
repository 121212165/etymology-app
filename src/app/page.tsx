// src/app/page.tsx
'use client'

import { useState, useEffect, useMemo, type CSSProperties } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { SpotlightCard } from '@/components/ui/SpotlightCard'
import { useReveal } from '@/hooks/useReveal'
import { useSearch } from '@/hooks/useSearch'
import { useAppStore } from '@/store/app-store'
import { useProgressStore } from '@/store/progress-store'
import { useMaskStore } from '@/store/mask-store'
import { MaskedText } from '@/components/mask/MaskedText'
import { loadMindMapData, getCoreRoots, getMiddleRoots } from '@/lib/mindmap-loader'
import type { EnhancedRootNode } from '@/lib/mindmap-types'

const WORD_GRID_LIMIT = 12

/** stagger 入场序号（--stagger-i 无单位，delay = 序号 × 45ms，见 globals.css ui-polish） */
const staggerStyle = (i: number): CSSProperties =>
  ({ '--stagger-i': Math.min(i, 16) }) as CSSProperties

/** 卡片级入场错开（--reveal-delay，见 globals.css ui-polish） */
const revealDelayStyle = (delay: string): CSSProperties =>
  ({ '--reveal-delay': delay }) as CSSProperties

export default function HomePage() {
  const { loading, error, retry } = useSearch()
  const { searchIndex } = useAppStore()
  const { getViewedCountForRoot, isRootCompleted, viewedWords } = useProgressStore()

  const [focusRoot, setFocusRoot] = useState<EnhancedRootNode | null>(null)
  const [coreRoots, setCoreRoots] = useState<EnhancedRootNode[]>([])
  const [totalRoots, setTotalRoots] = useState(0)
  // 思维导图数据加载失败时给出独立错误与重试入口，避免首页永久转圈
  const [mindmapError, setMindmapError] = useState<string | null>(null)
  const [mindmapLoading, setMindmapLoading] = useState(true)

  // ── 这组词释义遮罩：空格整页揭示，点击单点揭示（难度档位见 mask-store） ──
  const maskLevel = useMaskStore((s) => s.maskLevel)
  const maskOn = maskLevel !== 'off'
  const [revealedWords, setRevealedWords] = useState<Record<string, boolean>>({})
  const [allRevealed, setAllRevealed] = useState(false)

  // ── 滚动入场动效（ReactBits reveal 手法，见 hooks/useReveal）：
  // 内容在数据加载后才挂载，用 enabled 保证 effect 在元素存在时才挂观察器。
  // reveal 类由 hook 在客户端添加，勿写进 JSX className（否则 SSR 隐藏内容）。
  const contentReady =
    !loading && !mindmapLoading && !error && !mindmapError && !!searchIndex && !!focusRoot
  const focusReveal = useReveal<HTMLDivElement>({ enabled: contentReady })
  const statsReveal = useReveal<HTMLDivElement>({ enabled: contentReady })
  const affixReveal = useReveal<HTMLDivElement>({ enabled: contentReady })
  const wordsReveal = useReveal<HTMLDivElement>({ enabled: contentReady })
  const cloudReveal = useReveal<HTMLDivElement>({ enabled: contentReady })

  // ── 词缀速览：统计焦点词根全部单词中最常出现的前缀/后缀（数据来自既有 vocab parts） ──
  const affixChips = useMemo(() => {
    if (!focusRoot || !searchIndex) return []
    const counts = new Map<string, { type: 'prefix' | 'suffix'; n: number }>()
    for (const idx of focusRoot.wordIndices) {
      const w = searchIndex.data[idx]
      if (!w) continue
      for (const p of w.parts) {
        if (p.type !== 'prefix' && p.type !== 'suffix') continue
        const cur = counts.get(p.text)
        if (cur) cur.n += 1
        else counts.set(p.text, { type: p.type, n: 1 })
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]))
      .slice(0, 6)
  }, [focusRoot, searchIndex])

  useEffect(() => {
    if (!maskOn) return
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
        setAllRevealed(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [maskOn])

  const loadMindmap = () => {
    setMindmapLoading(true)
    setMindmapError(null)
    loadMindMapData()
      .then(data => {
        const cores = getCoreRoots(data)
        const middles = getMiddleRoots(data)
        setCoreRoots(cores)
        setTotalRoots(data.roots.length)
        const { currentRoot, completedRoots, setCurrentRoot } = useProgressStore.getState()

        if (currentRoot && !completedRoots.includes(currentRoot)) {
          const found = [...cores, ...middles].find(r => r.primaryText === currentRoot)
          if (found) {
            setFocusRoot(found)
            return
          }
        }

        // 焦点优先级：未完成核心 → 未完成进阶 → 首个核心。
        // 核心层学完后若仍只看核心会「断头」，故回落到进阶层。
        const next = cores.find(r => !completedRoots.includes(r.primaryText))
          || middles.find(r => !completedRoots.includes(r.primaryText))
          || cores[0]
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
            className="btn-accent px-6 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover"
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
        {/* ── Hero：首屏 blur+rise 渐入，元素间错开 delay（ReactBits 手法） ── */}
        <section className="mb-14">
          <p className="editorial-label mb-4 hero-in hero-d-1">英语词根词缀拆解</p>
          <h1 className="text-5xl lg:text-6xl text-text-primary mb-4 hero-in hero-d-2">
            林序
          </h1>
          <p className="text-text-secondary text-base lg:text-lg max-w-lg mx-auto leading-relaxed hero-in hero-d-3">
            {searchIndex.data.length} 个单词，按词根分组。从核心词根出发，三分钟看懂一组关联词。
          </p>
        </section>

        <hr className="editorial-divider mb-12" />

        {/* ── Bento：焦点词根大卡 + 进度/词缀小卡 + 「这组词」宽卡 ──
            布局参考 bentogrids：桌面 3 列网格（大卡占 2×2），移动端单列退化为普通堆叠；
            入场为滚动 reveal，卡片间以 --reveal-delay 错开 */}
        <section className="mb-14">
          <div className="flex items-baseline justify-between mb-4">
            <p className="editorial-label">
              {isFirstTime ? '从这里开始' : '继续'}
            </p>
            <p className="text-xs text-text-muted">
              {completedCount} / {coreRoots.length} 组已完成
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
            {/* 大卡：焦点词根（聚光 hover） */}
            <div
              ref={focusReveal}
              className="md:col-span-2 md:row-span-2"
              style={revealDelayStyle('0ms')}
            >
              <SpotlightCard className="editorial-card h-full p-8 lg:p-10 flex flex-col justify-center">
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
                    className="btn-accent inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover"
                  >
                    {isFirstTime ? '开始看' : '继续看'}
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </SpotlightCard>
            </div>

            {/* 小卡：进度统计（既有数据重排：核心词根完成 / 全部词根 / 已看单词） */}
            <div ref={statsReveal} style={revealDelayStyle('90ms')}>
              <div className="editorial-card h-full p-5 flex flex-col justify-center">
                <p className="editorial-label mb-2">核心词根</p>
                <p className="font-mono text-2xl text-accent leading-none mb-2">
                  {completedCount}
                  <span className="text-sm text-text-muted"> / {coreRoots.length}</span>
                </p>
                <div className="h-0.5 bg-bg-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-300"
                    style={{
                      width: `${coreRoots.length > 0
                        ? (completedCount / coreRoots.length) * 100
                        : 0}%`,
                    }}
                  />
                </div>
                <hr className="editorial-divider my-4" />
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-text-muted">全部词根</span>
                  <span className="font-mono text-text-secondary">{totalRoots}</span>
                </div>
                <div className="flex items-baseline justify-between text-sm mt-1">
                  <span className="text-text-muted">已看单词</span>
                  <span className="font-mono text-text-secondary">{viewedWords.length}</span>
                </div>
              </div>
            </div>

            {/* 小卡：词缀速览（焦点词根单词的高频词缀；无词缀数据时回落到拼写变体/全部词根入口） */}
            <div ref={affixReveal} style={revealDelayStyle('180ms')}>
              <div className="editorial-card h-full p-5 flex flex-col justify-center">
                {affixChips.length > 0 ? (
                  <>
                    <p className="editorial-label mb-3">词缀速览</p>
                    <div className="flex flex-wrap gap-1.5">
                      {affixChips.map(([text, { type, n }]) => (
                        <span key={text} className={`part-tag part-tag-${type}`}>
                          {text}
                          <span className="opacity-60">×{n}</span>
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-text-muted mt-3">
                      这组词里最常搭配的词缀
                    </p>
                  </>
                ) : focusRoot.aliases.length > 0 ? (
                  <>
                    <p className="editorial-label mb-3">常见变体</p>
                    <div className="flex flex-wrap gap-1.5">
                      {focusRoot.aliases.map((alias) => (
                        <span key={alias} className="part-tag part-tag-root font-mono">
                          {alias}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-text-muted mt-3">
                      {focusRoot.primaryText} 的同源拼写变体
                    </p>
                  </>
                ) : (
                  <>
                    <p className="editorial-label mb-3">全部词根</p>
                    <Link
                      href="/roots"
                      className="text-sm text-accent hover:text-accent-hover transition-colors"
                    >
                      浏览 {totalRoots} 组 →
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* 宽卡：这组词（stagger 容器，卡片逐个入场） */}
            <div ref={wordsReveal} className="md:col-span-3 reveal-stagger">
              {focusWords.length > 0 && (
                <>
                  <div
                    className="flex items-baseline justify-between mb-4 reveal-item"
                    style={staggerStyle(0)}
                  >
                    <p className="editorial-label">这组词</p>
                    {maskOn && !allRevealed && (
                      <p className="text-xs text-text-muted">已遮释义 · 空格揭示全部</p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {focusWords.map((word, i) => (
                      <Link
                        key={word.word}
                        href={`/word/${encodeURIComponent(word.word)}`}
                        className="word-grid-item reveal-item text-left"
                        style={staggerStyle(i + 1)}
                      >
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <span className="text-sm font-medium text-text-primary truncate">
                            {word.word}
                          </span>
                          {word.parts
                            .filter(p => p.type === 'root')
                            .slice(0, 1)
                            .map((p, i) => (
                              <MaskedText
                                key={i}
                                // 全遮档位下词根标记一并遮挡；点击在卡片内揭示而非跳转
                                active={maskLevel === 'hard'}
                                revealed={allRevealed || !!revealedWords[word.word]}
                                onReveal={() => setRevealedWords(prev => ({ ...prev, [word.word]: true }))}
                                className="text-xs font-mono text-root shrink-0"
                              >
                                {p.text}
                              </MaskedText>
                            ))}
                        </div>
                        <MaskedText
                          active={maskOn}
                          revealed={allRevealed || !!revealedWords[word.word]}
                          onReveal={() => setRevealedWords(prev => ({ ...prev, [word.word]: true }))}
                          className="text-xs text-text-secondary truncate"
                        >
                          {word.definition}
                        </MaskedText>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <hr className="editorial-divider mb-12" />

        {/* ── 词根云（核心词根；全部词根入口见右上）：stagger 入场 ── */}
        <section>
          <div ref={cloudReveal} className="reveal-stagger">
            <div
              className="flex items-baseline justify-between mb-5 reveal-item"
              style={staggerStyle(0)}
            >
              <p className="editorial-label">核心词根 · {coreRoots.length}</p>
              {totalRoots > coreRoots.length && (
                <Link
                  href="/roots"
                  className="text-xs text-text-muted hover:text-accent transition-colors"
                >
                  全部 {totalRoots} 组 →
                </Link>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {coreRoots.map((root, i) => {
                const completed = isRootCompleted(root.primaryText)
                return (
                  <Link
                    key={root.primaryText}
                    href={`/root/${encodeURIComponent(root.primaryText)}`}
                    className="root-cloud-item reveal-item"
                    style={staggerStyle(i + 1)}
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
          </div>
        </section>
      </main>
    </div>
  )
}
