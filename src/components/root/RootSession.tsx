// src/components/root/RootSession.tsx
'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, GraduationCap } from 'lucide-react'
import { PartTags } from '@/components/word/PartTags'
import { SegmentedWord } from '@/components/word/SegmentedWord'
import { SpeakButton } from '@/components/word/SpeakButton'
import { MaskedText } from '@/components/mask/MaskedText'
import { MaskToggle } from '@/components/mask/MaskToggle'
import { useMaskStore } from '@/store/mask-store'
import { MindMap } from '@/components/mindmap/MindMap'
import { useProgressStore } from '@/store/progress-store'
import { loadMindMapData, getCoreRoots, getMiddleRoots } from '@/lib/mindmap-loader'
import { loadSearchIndex } from '@/lib/data-loader'
import { useAppStore } from '@/store/app-store'
import { CONFUSABLE_ROOTS } from '@/lib/confusables'
import type { VocabEntry } from '@/lib/types'
import type { MindMapData, EnhancedRootNode } from '@/lib/mindmap-types'
import { MicroCelebrate } from '@/components/feedback/MicroCelebrate'
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation'
import { useVariantGroups } from '@/hooks/useVariantGroups'
import { VariantChips } from '@/components/root/VariantChips'
import { SessionCelebrate } from '@/components/root/SessionCelebrate'
import { QuizView } from '@/components/root/QuizView'
import type { QuizMode } from '@/components/root/QuizView'

interface RootSessionProps {
  rootText: string
  rootMeaning: string
  words: VocabEntry[]
  /** 合并后的词根节点，用于思维导图与变体聚组；若未传则不渲染导图/变体条 */
  enhancedRoot?: EnhancedRootNode
}

/** 完成庆祝停留时长，与 SessionCelebrate 倒计时环动画（2s）同步 */
const CELEBRATE_COUNTDOWN_MS = 2000

/**
 * 挑「下一个未完成词根」的跳转目标：
 * 优先从 core 词根里找——从当前组往后找第一个未完成的，找不到再回头（wrap）扫当前组之前的；
 * core 全部完成后回落到 middle 层（按数据顺序，跳过当前组），避免核心学完后无处可去。
 * 都没有 → null（回首页）。
 */
function pickNextRootHref(
  data: MindMapData | null | undefined,
  currentRootText: string,
  completedRoots: string[]
): string | null {
  if (!data) return null
  const coreRoots = getCoreRoots(data)
  const middleRoots = getMiddleRoots(data)
  if (coreRoots.length === 0 && middleRoots.length === 0) return null

  const isCurrent = (r: EnhancedRootNode) =>
    r.primaryText === currentRootText || r.aliases.includes(currentRootText)
  const coreIdx = coreRoots.findIndex(isCurrent)
  const after: EnhancedRootNode[] = []
  for (let i = coreIdx + 1; i < coreRoots.length; i++) after.push(coreRoots[i])
  const before: EnhancedRootNode[] = []
  for (let i = 0; i < coreIdx; i++) before.push(coreRoots[i])

  const coreCandidates = coreIdx === -1 ? coreRoots : [...after, ...before]
  const next =
    coreCandidates.find(r => !completedRoots.includes(r.primaryText)) ??
    middleRoots.find(
      r => !isCurrent(r) && !completedRoots.includes(r.primaryText)
    )
  return next ? `/root/${next.primaryText}` : null
}

export function RootSession({ rootText, rootMeaning, words, enhancedRoot }: RootSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionFinished, setSessionFinished] = useState(false)
  // 完成庆祝：下一组跳转目标；null = 未就绪/加载失败，倒计时结束回首页
  const [celebrateHref, setCelebrateHref] = useState<string | null>(null)
  const [mindmapData, setMindmapData] = useState<MindMapData | null>(null)
  // 仅在用户主动点击"下一个"时才触发微庆祝，避免首次挂载即弹出
  const [celebrationTick, setCelebrationTick] = useState(0)
  // 自测模式：null = 学习模式；quizSelecting = 展示模式选择；quizMode = 自测进行中
  const [quizMode, setQuizMode] = useState<QuizMode | null>(null)
  const [quizSelecting, setQuizSelecting] = useState(false)
  // 释义遮罩：当前词卡的揭示状态；换词时重置回遮挡（难度档位见 mask-store）
  const [revealed, setRevealed] = useState(false)
  const maskLevel = useMaskStore((s) => s.maskLevel)
  const definitionMasked = maskLevel !== 'off'
  const morphemesMasked = maskLevel === 'hard'

  const firstRenderRef = useRef(true)
  const continueHandledRef = useRef(false)
  const router = useRouter()
  const { markWordViewed, markRootCompleted, setCurrentRoot, completedRoots } = useProgressStore()
  const { searchIndex, setSearchIndex } = useAppStore()

  // ── 变体聚组：aliases 非空时按变体排序展示，否则维持原顺序 ──
  const variantGroups = useVariantGroups(words, enhancedRoot)
  const displayWords = useMemo(
    () => (variantGroups.length > 0 ? variantGroups.flatMap(g => g.words) : words),
    [variantGroups, words]
  )

  // 边界保护：currentIndex 可能因词根切换（上层未加 key 时）或词数变短而越界，
  // 此时回退到首词，避免 render 阶段读取 undefined.word 崩溃。
  // 注：词根切换的正确重置依赖 page 层的 key={displayRootText} 强制重挂载，
  //    此处仅作兜底防御，不替代 key。
  const safeIndex = currentIndex < displayWords.length ? currentIndex : 0
  const current = displayWords[safeIndex]
  const isLast = safeIndex === displayWords.length - 1
  const quizActive = quizMode !== null || quizSelecting

  // 当前词所属变体（chip 高亮用）；「其他」组为 null
  const activeVariant = useMemo(() => {
    if (variantGroups.length === 0 || !current) return null
    const group = variantGroups.find(g => g.words.some(w => w.word === current.word))
    return group ? group.text : null
  }, [variantGroups, current])

  // 派生提示里的词义词（fertility → fertile 的释义）
  const stemEntry = useMemo(() => {
    const der = current?.derivation
    if (!der || !searchIndex) return null
    return searchIndex.data.find(e => e.word === der.stemWord) ?? null
  }, [current, searchIndex])

  // 易混词根（静态 curated 数据，按展示词根查）
  const confusables = CONFUSABLE_ROOTS[rootText] ?? []

  useEffect(() => {
    setCurrentRoot(rootText)
  }, [rootText, setCurrentRoot])

  useEffect(() => {
    if (current) markWordViewed(current.word)
  }, [current, markWordViewed])

  // 换词后新卡重新遮挡，保持「见词回想」节奏
  useEffect(() => {
    setRevealed(false)
  }, [safeIndex])

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
    // 钳制到末词：index 越界后（safeIndex 兜底显示首词）若无此钳制，
    // 递增永远追不回长度，「完成」将不可达
    setCurrentIndex(i => Math.min(i + 1, displayWords.length - 1))
    setCelebrationTick(t => t + 1)
  }, [isLast, markRootCompleted, rootText, displayWords.length])

  const handlePrev = useCallback(() => {
    setCurrentIndex(i => Math.max(i - 1, 0))
  }, [])

  // ── 完成庆祝：计算下一组目标 + 2 秒倒计时自动进入 ──
  useEffect(() => {
    if (!sessionFinished) return
    let cancelled = false
    loadMindMapData()
      .then(data => {
        if (!cancelled) {
          setCelebrateHref(pickNextRootHref(data, rootText, completedRoots))
        }
      })
      .catch(() => {
        // 加载失败：celebrateHref 保持 null，倒计时结束回首页
      })
    return () => {
      cancelled = true
    }
  }, [sessionFinished, rootText, completedRoots])

  const handleContinue = useCallback(() => {
    // 遮罩点击 / 跳过按钮 / Esc / 倒计时可能并发触发，只进入一次
    if (continueHandledRef.current) return
    continueHandledRef.current = true
    router.push(celebrateHref ?? '/')
  }, [router, celebrateHref])

  useEffect(() => {
    if (!sessionFinished) return
    // celebrateHref 就绪会重建计时器（加载通常在数十毫秒内），保证跳对目标
    const timer = setTimeout(handleContinue, CELEBRATE_COUNTDOWN_MS)
    return () => clearTimeout(timer)
  }, [sessionFinished, handleContinue])

  // ── 键盘导航：←/→ 换词，空格揭示遮罩（学习模式专用） ──
  // 输入类元素聚焦或带修饰键时忽略；完成态/自测态不再换词。
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (sessionFinished || quizActive) return
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
      } else if (e.key === ' ') {
        // 空格揭示当前词卡（遮挡关闭时 reveal 无副作用，仍拦下默认滚动）
        e.preventDefault()
        setRevealed(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [sessionFinished, quizActive, handleNext, handlePrev])

  // ── 触摸导航：词卡上水平滑动换词（学习模式专用） ──
  const swipeHandlers = useSwipeNavigation({
    onSwipeLeft: handleNext,
    onSwipeRight: handlePrev,
    enabled: !sessionFinished && !quizActive,
  })

  // ── 变体 chip：跳到该组第一词 ──
  const handleSelectVariant = useCallback(
    (variant: string | null) => {
      const group = variantGroups.find(g => g.text === variant)
      if (!group || group.words.length === 0) return
      const idx = displayWords.findIndex(w => w.word === group.words[0].word)
      if (idx >= 0) setCurrentIndex(idx)
    },
    [variantGroups, displayWords]
  )

  const startQuiz = (mode: QuizMode) => {
    setQuizSelecting(false)
    setQuizMode(mode)
  }

  const exitQuiz = () => {
    setQuizMode(null)
    setQuizSelecting(false)
  }

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

  // ── 完成庆祝：全屏覆盖层替换会话内容 ──
  if (sessionFinished) {
    return (
      <SessionCelebrate
        rootText={rootText}
        wordCount={words.length}
        completedCount={completedRoots.length}
        onContinue={handleContinue}
      />
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 lg:py-14">
      {/* ── 词根标题 / 进度区 ── */}
      <div className="mb-8">
        <p className="editorial-label mb-3">词根</p>
        <div className="flex items-baseline gap-3 mb-4">
          <h1 className="text-3xl lg:text-4xl font-mono text-root">
            {rootText}
          </h1>
          <span className="text-lg text-text-secondary">{rootMeaning}</span>
          {/* 遮罩难度切换（个人中心上线前的全局入口） */}
          <MaskToggle className="ml-auto self-center" />
        </div>
        {/* 进度条：只显示比例，不显示 X/Y 数字，避免暴露总数造成压迫感 */}
        <div className="h-0.5 bg-bg-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${((safeIndex + 1) / displayWords.length) * 100}%` }}
          />
        </div>
      </div>

      <hr className="editorial-divider mb-8" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-start">
        {/* ── 左列：变体条 + 词卡/自测视图 + 导航（lg+ 固定在视口内） ── */}
        <div className="lg:sticky lg:top-20">
          {quizMode ? (
            <QuizView words={displayWords} mode={quizMode} onExit={exitQuiz} />
          ) : quizSelecting ? (
            <div className="editorial-card p-6 lg:p-8" data-testid="quiz-mode-select">
              <p className="editorial-label mb-4">选择自测模式</p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => startQuiz('hard')}
                  className="text-left px-5 py-3.5 rounded-lg border border-border text-sm text-text-primary hover:border-accent/50 hover:bg-bg-elevated transition-colors"
                >
                  硬核模式 · 无提示
                </button>
                <button
                  type="button"
                  onClick={() => startQuiz('hint')}
                  className="text-left px-5 py-3.5 rounded-lg border border-border text-sm text-text-primary hover:border-accent/50 hover:bg-bg-elevated transition-colors"
                >
                  提示模式 · 显示词根拆解
                </button>
              </div>
              <button
                type="button"
                onClick={() => setQuizSelecting(false)}
                className="mt-4 text-sm text-text-muted hover:text-text-secondary transition-colors"
              >
                取消
              </button>
            </div>
          ) : (
            <>
              {/* 变体条：aliases 非空才有组 */}
              <VariantChips
                groups={variantGroups}
                activeVariant={activeVariant}
                onSelect={handleSelectVariant}
              />

              {/* 易混词根对比条：形近/义近词根并列，帮助区分 */}
              {confusables.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mb-4">
                  <span className="editorial-label mr-1">易混</span>
                  {confusables.map(c => (
                    <Link
                      key={c.text}
                      href={`/root/${encodeURIComponent(c.text)}`}
                      title={`${c.text} ${c.meaning}，如 ${c.sample.join('、')}`}
                      className="root-cloud-item"
                    >
                      <span className="root-cloud-text">{c.text}</span>
                      <span className="text-xs text-text-muted">{c.meaning}</span>
                    </Link>
                  ))}
                </div>
              )}

              {/* ── 当前单词卡片（支持水平滑动换词） ── */}
              <div className="editorial-card p-6 lg:p-8 mb-6" {...swipeHandlers}>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    {/* 词素中心点拆分标题：spec · ial · ize；sr-only 保留原词供读屏/测试 */}
                    <h2 className="text-3xl lg:text-4xl text-text-primary mb-2">
                      <span className="sr-only">{current.word}</span>
                      <span aria-hidden="true">
                        <SegmentedWord parts={current.parts} word={current.word} />
                      </span>
                    </h2>
                    <MaskedText
                      active={definitionMasked}
                      revealed={revealed}
                      onReveal={() => setRevealed(true)}
                      className="text-text-secondary leading-relaxed"
                    >
                      {current.definition}
                    </MaskedText>
                  </div>
                  <SpeakButton word={current.word} />
                </div>

                {/* 构词拆解区：仅「全遮」档位遮挡，遮释义档位下作为提示可见 */}
                <MaskedText
                  as="div"
                  active={morphemesMasked}
                  revealed={revealed}
                  onReveal={() => setRevealed(true)}
                >
                  <div className="mt-5">
                    <PartTags parts={current.parts} />
                  </div>

                  <hr className="editorial-divider my-6" />

                  <p className="text-sm text-text-secondary leading-relaxed">
                    <span className="text-text-primary font-medium">{current.word}</span>
                    {' 由 '}
                    {current.parts.map((part, i) =>
                      part.type === 'linker' ? (
                        // 衔接字母：中性裸字母，无括号意义（如 verbal 的 b）
                        <span key={i}>
                          {i > 0 && ' · '}
                          <span className="font-mono text-text-muted">{part.text}</span>
                        </span>
                      ) : (
                        <span key={i}>
                          {i > 0 && ' · '}
                          <span className="font-mono text-root">{part.surface || part.text}</span>
                          <span className="text-text-muted">
                            {part.surface
                              ? `（${part.text}，${part.meaning}）`
                              : `（${part.meaning}）`}
                          </span>
                        </span>
                      )
                    )}
                    {' 组成'}
                  </p>

                  {/* 构词路径提示：机械切分没有记忆价值时，给出派生词（fertility ← fertile + -ity） */}
                  {current.derivation && (
                    <p className="text-sm text-text-secondary mt-2">
                      <span className="editorial-label mr-2">记法</span>
                      {'先记 '}
                      <Link
                        href={`/word/${encodeURIComponent(current.derivation.stemWord)}`}
                        className="font-mono text-accent hover:underline"
                      >
                        {current.derivation.stemWord}
                      </Link>
                      {stemEntry && (
                        <span className="text-text-muted">（{stemEntry.definition}）</span>
                      )}
                      <span className="text-text-muted">
                        {'，再加 -'}
                        {current.derivation.suffix}
                      </span>
                    </p>
                  )}
                </MaskedText>
              </div>

              {/* ── 导航（含自测入口） ── */}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={safeIndex === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowLeft size={16} />
                  上一个
                </button>

                <button
                  type="button"
                  onClick={() => setQuizSelecting(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-accent transition-colors"
                >
                  <GraduationCap size={16} />
                  自测
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover transition-colors"
                >
                  {isLast ? '完成' : '下一个'}
                  <ArrowRight size={16} />
                </button>
              </div>
              <MicroCelebrate trigger={celebrationTick} message="已看" />
            </>
          )}
        </div>

        {/* ── 右列：思维导图（辅助可视化当前词根的关联网络，高亮当前词） ── */}
        {enhancedRoot && mindmapData && searchIndex?.data && (
          <div>
            <p className="editorial-label mb-3">关联网络</p>
            <MindMap
              data={mindmapData}
              vocab={searchIndex.data}
              centerRoot={enhancedRoot}
              currentWord={current?.word}
            />
          </div>
        )}
      </div>
    </div>
  )
}
