// src/hooks/useSwipeNavigation.ts
'use client'

import { useCallback, useRef } from 'react'
import type { TouchEvent } from 'react'

interface SwipeNavigationOptions {
  /** 手指向左滑（查看下一个）时调用 */
  onSwipeLeft: () => void
  /** 手指向右滑（查看上一个）时调用 */
  onSwipeRight: () => void
  /** 判定换词的最小水平位移（px），默认 48 */
  threshold?: number
  /** 为 false 时忽略所有触摸（如自测/庆祝态），默认 true */
  enabled?: boolean
}

export interface SwipeHandlers {
  onTouchStart: (e: TouchEvent<HTMLElement>) => void
  onTouchEnd: (e: TouchEvent<HTMLElement>) => void
}

/**
 * 水平滑动换词 hook：
 * - 水平位移 > threshold 且 |dx| > |dy| * 1.5 才判定为滑动，纵向/斜向触摸不误触；
 * - 不调用 preventDefault，阈值内的轻触仍会正常触发子元素点击。
 *
 * 用法：把返回的两个 handler 展开到需要响应滑动的容器上。
 */
export function useSwipeNavigation({
  onSwipeLeft,
  onSwipeRight,
  threshold = 48,
  enabled = true,
}: SwipeNavigationOptions): SwipeHandlers {
  const startRef = useRef<{ x: number; y: number } | null>(null)

  const onTouchStart = useCallback(
    (e: TouchEvent<HTMLElement>) => {
      if (!enabled) return
      const touch = e.touches[0]
      if (!touch) return
      startRef.current = { x: touch.clientX, y: touch.clientY }
    },
    [enabled]
  )

  const onTouchEnd = useCallback(
    (e: TouchEvent<HTMLElement>) => {
      const start = startRef.current
      startRef.current = null
      if (!enabled || !start) return
      const touch = e.changedTouches[0]
      if (!touch) return
      const dx = touch.clientX - start.x
      const dy = touch.clientY - start.y
      // 阈值内视为轻点，交给子元素的点击逻辑
      if (Math.abs(dx) <= threshold) return
      // 斜向滑动（垂直分量占比过高）不换词，避免干扰纵向滚动
      if (Math.abs(dx) <= Math.abs(dy) * 1.5) return
      if (dx < 0) onSwipeLeft()
      else onSwipeRight()
    },
    [enabled, threshold, onSwipeLeft, onSwipeRight]
  )

  return { onTouchStart, onTouchEnd }
}
