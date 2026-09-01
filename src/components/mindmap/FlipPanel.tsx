// src/components/mindmap/FlipPanel.tsx
import type { ReactNode } from 'react'

interface FlipPanelProps {
  /** 正面内容（默认展示，如词卡） */
  front: ReactNode
  /** 背面内容（翻折后展示，如关联网络导图） */
  back: ReactNode
  /** true = 翻到背面；false = 显示正面（受控） */
  flipped: boolean
  className?: string
}

/**
 * 单列 3D 翻折容器（纯 CSS transform，无布局库依赖）：
 * - 内层 grid 叠放正反两面（两面都占同一格），容器高度取两面的最大值，
 *   避免绝对定位方案在两面高度不同时塌陷或溢出；
 * - 背面预旋转 180°，外层翻转时配合 backface-visibility:hidden 呈现翻面效果；
 * - 隐藏面加 aria-hidden + inert，读屏与焦点/点击都不会落到不可见面；
 * - prefers-reduced-motion 下由 globals.css 显式关闭过渡，直接切换。
 */
export function FlipPanel({ front, back, flipped, className }: FlipPanelProps) {
  return (
    <div
      data-testid="flip-panel"
      data-flipped={flipped ? 'true' : 'false'}
      className={`mindmap-flip-scene${className ? ` ${className}` : ''}`}
    >
      <div className={`mindmap-flip-inner${flipped ? ' mindmap-flip-inner--flipped' : ''}`}>
        <div
          className="mindmap-flip-face mindmap-flip-face--front"
          aria-hidden={flipped}
          inert={flipped}
        >
          {front}
        </div>
        <div
          className="mindmap-flip-face mindmap-flip-face--back"
          aria-hidden={!flipped}
          inert={!flipped}
        >
          {back}
        </div>
      </div>
    </div>
  )
}
