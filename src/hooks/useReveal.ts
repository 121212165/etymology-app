// src/hooks/useReveal.ts
'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'

export interface UseRevealOptions {
  /** 触发可见比例阈值，默认 0.15 */
  threshold?: number
  /** 观察器 rootMargin，默认底部略收窄，滚过视口下缘一小段才触发 */
  rootMargin?: string
  /**
   * 是否启用观察。默认 true。
   * 内容是异步加载后才挂载的页面（如首页的 loading 门）应传加载完成状态：
   * 内容挂载与 enabled 翻真发生在同一次渲染，effect 届时才挂观察器。
   */
  enabled?: boolean
}

// SSR 环境没有布局效果可跑，退回 useEffect 避免 React 警告
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

/**
 * 滚动入场动效（ReactBits fade/blur reveal 手法的零依赖手写版）：
 *
 * - 挂载后给元素加 `reveal` 基类（隐藏态），进入视口时改加 `reveal--visible`
 *   （一次性，之后停止观察）；入场动画由 globals.css「ui-polish」小节驱动；
 * - `reveal` 只在客户端 JS 可用时才存在，因此 SSR HTML 与无 JS 环境下
 *   内容始终可见（不要把 reveal 类写进 JSX 的 className）；
 * - 环境无 IntersectionObserver（旧浏览器 / jsdom 未 mock）时直接跳过，
 *   内容保持可见，等价于「不播放入场动画」；
 * - prefers-reduced-motion 的降级完全由 CSS 媒体查询处理，JS 不感知。
 *
 * 用法：
 *   const ref = useReveal<HTMLDivElement>()
 *   <div ref={ref}>…</div>                       // 单元素入场
 *   <div ref={ref} className="reveal-stagger">   // stagger 容器，子项加 reveal-item
 *     <div className="reveal-item" style={{ '--stagger-i': i }}>…</div>
 *   </div>
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  options?: UseRevealOptions
) {
  const ref = useRef<T | null>(null)
  const { threshold = 0.15, rootMargin = '0px 0px -8% 0px', enabled = true } =
    options ?? {}

  useIsomorphicLayoutEffect(() => {
    const el = ref.current
    if (!enabled || !el || typeof IntersectionObserver === 'undefined') return

    el.classList.add('reveal')
    let revealed = false
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // 一次性：点亮后不再响应后续交叉事件，也停止观察
          if (entry.isIntersecting && !revealed) {
            revealed = true
            el.classList.add('reveal--visible')
            observer.unobserve(el)
          }
        }
      },
      { threshold, rootMargin }
    )
    observer.observe(el)

    return () => observer.disconnect()
  }, [enabled, threshold, rootMargin])

  return ref
}
