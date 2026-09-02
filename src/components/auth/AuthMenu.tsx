// src/components/auth/AuthMenu.tsx
// TopBar 右侧账号入口：未登录 → 登录/注册；已登录 → 会员徽章 + 个人中心。
// authAvailable=false（Vercel 静态版）时整个入口不渲染。
'use client'

import Link from 'next/link'
import { CircleUserRound } from 'lucide-react'
import { useMe } from '@/hooks/useMe'

function fmtExpiry(ts: number): string {
  const days = Math.ceil((ts - Date.now()) / 24 / 3600_000)
  if (days <= 0) return '已到期'
  if (days > 365 * 10) return '买断'
  return `会员剩 ${days} 天`
}

export function AuthMenu() {
  const { me, loading } = useMe()
  if (loading || !me?.authAvailable) return null

  if (!me.authenticated) {
    return (
      <Link
        href="/login"
        className="text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        登录 / 注册
      </Link>
    )
  }

  const active = me.user!.membershipActive
  return (
    <Link
      href="/me"
      className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
      title={me.user!.email ?? ''}
    >
      <CircleUserRound size={16} className={active ? 'text-accent' : 'text-text-muted'} />
      <span className="hidden sm:inline">{fmtExpiry(me.user!.membershipExpiresAt)}</span>
    </Link>
  )
}
