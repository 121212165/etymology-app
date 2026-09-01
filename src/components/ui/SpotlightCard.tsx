// src/components/ui/SpotlightCard.tsx
'use client'

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'

interface SpotlightCardProps {
  children: ReactNode
  /** 追加到 spotlight-card 之后的类名（如 editorial-card） */
  className?: string
  style?: CSSProperties
}

/**
 * 聚光卡片（21st.dev 社区组件的 hover spotlight 手法，零依赖手写版）：
 *
 * - 鼠标划过时把指针相对卡片的位置写入 CSS 变量 --spot-x / --spot-y，
 *   光晕本体由 globals.css 的 .spotlight-card::before radial-gradient 绘制；
 * - 监听全部为原生被动监听（{ passive: true }，从不 preventDefault）；
 * - 卡片矩形在 mouseenter 时缓存一次，mousemove 只读写变量、不触发布局；
 * - 触屏 / 键盘用户不触发 mousemove，光晕永不出现（CSS 默认 opacity 0）。
 */
export function SpotlightCard({ children, className, style }: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let rect: DOMRect | null = null

    const onEnter = () => {
      rect = el.getBoundingClientRect()
    }
    const onMove = (e: MouseEvent) => {
      // 兜底：个别浏览器/自动化不派发 mouseenter
      rect ??= el.getBoundingClientRect()
      el.style.setProperty('--spot-x', `${e.clientX - rect.left}px`)
      el.style.setProperty('--spot-y', `${e.clientY - rect.top}px`)
    }
    const onLeave = () => {
      rect = null
    }

    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mousemove', onMove, { passive: true })
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mouseenter', onEnter)
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <div ref={ref} className={`spotlight-card${className ? ` ${className}` : ''}`} style={style}>
      {children}
    </div>
  )
}
