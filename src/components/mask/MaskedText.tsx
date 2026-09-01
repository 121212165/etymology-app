// src/components/mask/MaskedText.tsx
'use client'

import type { ReactNode, KeyboardEvent } from 'react'

/**
 * 释义遮罩（第二版需求：大页面默认遮挡，点击/空格揭示）。
 * 纯展示组件：是否遮挡由 active（难度档位）决定，揭示状态由父级持有——
 * 因为揭示可能是单点点击，也可能是整页空格批量揭示（父级统一管理）。
 *
 * 用模糊而非遮挡层：不改变布局，揭示前后无跳动。
 */
export function MaskedText({
  active,
  revealed,
  onReveal,
  children,
  className = '',
  as = 'span',
}: {
  /** 当前难度档位是否需要遮挡该内容 */
  active: boolean
  /** 父级持有的揭示状态（点击单点或空格整页揭示后为 true） */
  revealed: boolean
  /** 揭示回调（点击 / 回车 / 空格） */
  onReveal: () => void
  children: ReactNode
  /** 布局类同时作用于揭示态与模糊态，保证两种状态排版一致、揭示无跳动 */
  className?: string
  /** 包裹元素：行内内容用 span（默认），块级内容（构词拆解区）用 div */
  as?: 'span' | 'div'
}) {
  const Wrapper = as
  // className 同步作用于模糊内容，使遮挡/揭示两态行数一致（truncate 场景关键）
  if (!active || revealed) {
    return <Wrapper className={className}>{children}</Wrapper>
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      onReveal()
    }
  }

  return (
    <Wrapper
      role="button"
      tabIndex={0}
      aria-label="点击揭示内容"
      // 阻止默认与冒泡：遮罩可能嵌在 <Link> 内（首页这组词网格），点击应揭示而非跳转
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onReveal()
      }}
      onKeyDown={handleKeyDown}
      className={`relative cursor-pointer select-none ${className}`}
    >
      <Wrapper
        aria-hidden="true"
        className={`block blur-[5px] opacity-70 pointer-events-none ${className}`}
      >
        {children}
      </Wrapper>
    </Wrapper>
  )
}
