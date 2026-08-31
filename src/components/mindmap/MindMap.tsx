// src/components/mindmap/MindMap.tsx
'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import type { MindMapData, EnhancedRootNode } from '@/lib/mindmap-types'
import type { VocabEntry } from '@/lib/types'
import { useProgressStore } from '@/store/progress-store'

interface MindMapProps {
  data: MindMapData
  vocab: VocabEntry[]
  centerRoot: EnhancedRootNode
  /** 当前学习的单词：命中的叶子高亮，不含它的面板整体弱化；不传时保持原有展示 */
  currentWord?: string
}

/** 词叶圆环半径（面板宽高的百分比） */
const LEAF_RADIUS = 34

/** 变体标识色数量（对应 globals.css 的 --variant-1..4） */
const VARIANT_COLOR_COUNT = 4

interface PanelProps {
  rootText: string
  words: VocabEntry[]
  relatedRoots: EnhancedRootNode[]
  /** 变体表（primaryText 在首位），用于叶子上的变体圆点取色 */
  variants: string[]
  /** 同词根拼写变体，显示在中心 chip 下方 */
  aliases: string[]
  /** 当前高亮的单词（仅当它确实在导图中时才传入） */
  currentWord?: string
  /** 面板整体弱化（当前词在另一个面板时） */
  dimmed?: boolean
}

/**
 * 词的变体序号：parts 中 type 为 root 且命中 variants（primaryText + aliases）的 text，
 * 命中多个取顺序最靠前的；无命中返回 -1（聚簇排序时排面板末尾）。
 */
function getVariantIndex(word: VocabEntry, variants: string[]): number {
  let best = -1
  for (const part of word.parts) {
    if (part.type !== 'root') continue
    const idx = variants.findIndex(v => v.toLowerCase() === part.text.toLowerCase())
    if (idx !== -1 && (best === -1 || idx < best)) best = idx
  }
  return best
}

/** 面板内叶子按变体聚簇排序：变体序优先，簇内字母序，无命中的排末尾 */
function sortWordsByVariant(words: VocabEntry[], variants: string[]): VocabEntry[] {
  return [...words].sort((a, b) => {
    const va = getVariantIndex(a, variants)
    const vb = getVariantIndex(b, variants)
    if (va !== vb) {
      if (va === -1) return 1
      if (vb === -1) return -1
      return va - vb
    }
    return a.word.localeCompare(b.word)
  })
}

/** 单个导图面板：中心词根 + 一圈词叶；关联词根 pinned 在底部，避免窄面板外环裁切 */
function MindMapPanel({ rootText, words, relatedRoots, variants, aliases, currentWord, dimmed }: PanelProps) {
  const { isWordViewed } = useProgressStore()
  const count = Math.max(words.length, 1)

  return (
    <div
      className={`mindmap-panel relative w-full h-[420px] bg-bg-surface/30 rounded-2xl border border-border overflow-hidden${
        dimmed ? ' mindmap-panel--dimmed' : ''
      }`}
    >
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
        {words.map((_, i) => {
          const angle = (i / count) * Math.PI * 2 - Math.PI / 2
          const x = 50 + LEAF_RADIUS * Math.cos(angle)
          const y = 50 + LEAF_RADIUS * Math.sin(angle)
          return (
            <line
              key={`line-${i}`}
              x1="50%" y1="50%"
              x2={`${x}%`} y2={`${y}%`}
              stroke="var(--root-color)"
              strokeWidth="1"
              strokeOpacity="0.3"
            />
          )
        })}
      </svg>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="px-3 py-1.5 rounded-full bg-root/20 border-2 border-root text-root font-mono font-bold text-sm">
          {rootText}
        </div>
        {aliases.length > 0 && (
          <div className="mindmap-root-variants">
            {aliases.join(' · ')}
          </div>
        )}
      </div>

      {words.map((word, i) => {
        const angle = (i / count) * Math.PI * 2 - Math.PI / 2
        const x = 50 + LEAF_RADIUS * Math.cos(angle)
        const y = 50 + LEAF_RADIUS * Math.sin(angle)
        const viewed = isWordViewed(word.word)
        const isCurrent = currentWord != null && word.word === currentWord
        const vIdx = getVariantIndex(word, variants)
        const dotClass =
          vIdx === -1
            ? 'mindmap-variant-dot-none'
            : `mindmap-variant-dot-${(vIdx % VARIANT_COLOR_COUNT) + 1}`
        return (
          <div
            key={word.word}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <Link
              href={`/word/${encodeURIComponent(word.word)}`}
              aria-current={isCurrent ? 'true' : undefined}
              className={`mindmap-leaf block px-2.5 py-1 rounded-full text-xs border transition-all whitespace-nowrap ${
                isCurrent
                  ? 'mindmap-leaf--current bg-accent/15 border-accent text-accent'
                  : viewed
                    ? 'bg-accent/10 border-accent/30 text-accent'
                    : 'bg-bg-surface border-border text-text-secondary hover:border-accent/30 hover:text-text-primary'
              }${currentWord != null && !isCurrent ? ' mindmap-leaf--muted' : ''}`}
            >
              <span className={`mindmap-variant-dot ${dotClass}`} aria-hidden="true" />
              {word.word}
            </Link>
          </div>
        )
      })}

      {relatedRoots.length > 0 && (
        <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1 justify-center">
          {relatedRoots.map((root) => (
            <Link
              key={root.primaryText}
              href={`/root/${encodeURIComponent(root.primaryText)}`}
              className="px-2 py-0.5 rounded-full bg-bg-elevated border border-border text-[11px] text-text-muted hover:text-root hover:border-root/30 transition-all"
            >
              {root.primaryText}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function MindMap({ data, vocab, centerRoot, currentWord }: MindMapProps) {
  const centerWords = useMemo(() => {
    return centerRoot.wordIndices
      .filter(idx => idx < vocab.length)
      .map(idx => vocab[idx])
  }, [centerRoot, vocab])

  const relatedRoots = useMemo(() => {
    const centerWordIndices = new Set(centerRoot.wordIndices)
    const relatedLinks = data.links.filter(l =>
      centerWordIndices.has(l.fromWordIndex) || centerWordIndices.has(l.toWordIndex)
    )

    const otherWordIndices = new Set<number>()
    for (const link of relatedLinks) {
      if (centerWordIndices.has(link.fromWordIndex)) {
        otherWordIndices.add(link.toWordIndex)
      } else {
        otherWordIndices.add(link.fromWordIndex)
      }
    }

    const rootSet = new Set<string>()
    for (const idx of otherWordIndices) {
      const word = vocab[idx]
      if (!word) continue
      for (const part of word.parts) {
        if (part.type === 'root') rootSet.add(part.text)
      }
    }

    return data.roots.filter(r =>
      r.primaryText !== centerRoot.primaryText &&
      !r.aliases.includes(centerRoot.primaryText) &&
      (rootSet.has(r.primaryText) || r.aliases.some(a => rootSet.has(a)))
    ).slice(0, 6)
  }, [data, centerRoot, vocab])

  // 变体表：primaryText 在首位，aliases 去重兜底（大小写不敏感）
  const variants = useMemo(() => {
    const list = [centerRoot.primaryText]
    for (const alias of centerRoot.aliases) {
      if (!list.some(v => v.toLowerCase() === alias.toLowerCase())) list.push(alias)
    }
    return list
  }, [centerRoot])

  // 变体聚簇：簇间按 primaryText → aliases 顺序，簇内字母序，无命中排末尾
  const sortedCenterWords = useMemo(
    () => sortWordsByVariant(centerWords, variants),
    [centerWords, variants]
  )

  // 词数对半分到左右两个面板，避免大词根全部挤进一个圆环互相重叠
  const mid = Math.ceil(sortedCenterWords.length / 2)
  const leftWords = sortedCenterWords.slice(0, mid)
  const rightWords = sortedCenterWords.slice(mid)

  // 聚焦：当前词确实落在某个面板里才启用高亮/弱化（数据不一致时整图降级为常态展示）
  const leftHasCurrent = currentWord != null
    ? leftWords.some(w => w.word === currentWord)
    : false
  const rightHasCurrent = currentWord != null
    ? rightWords.some(w => w.word === currentWord)
    : false
  const focusActive = leftHasCurrent || rightHasCurrent

  const relatedMid = Math.ceil(relatedRoots.length / 2)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <MindMapPanel
        rootText={centerRoot.primaryText}
        words={leftWords}
        relatedRoots={relatedRoots.slice(0, relatedMid)}
        variants={variants}
        aliases={centerRoot.aliases}
        currentWord={focusActive ? currentWord : undefined}
        dimmed={focusActive && !leftHasCurrent}
      />
      <MindMapPanel
        rootText={centerRoot.primaryText}
        words={rightWords}
        relatedRoots={relatedRoots.slice(relatedMid)}
        variants={variants}
        aliases={centerRoot.aliases}
        currentWord={focusActive ? currentWord : undefined}
        dimmed={focusActive && !rightHasCurrent}
      />
    </div>
  )
}
