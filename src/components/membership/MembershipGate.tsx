// src/components/membership/MembershipGate.tsx
// 全站会员门控·预览版：未登录/到期用户每个词根只可学前 PREVIEW_LIMIT 个词。
// - 无后端（authAvailable=false，如 Vercel 静态版）或状态未加载完 → 不门控（保持开放）
// - 真正的服务端数据门控在支付期硬化（当前静态数据仍可被直接下载，属已知边界）
'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { Lock } from 'lucide-react'
import { useMe } from '@/hooks/useMe'

export const PREVIEW_LIMIT = 3

export interface GateState {
  /** null = 不门控；数字 = 可见词数 */
  limit: number | null
  /** 词根全量词数（banner 展示用） */
  total: number
}

export function useMembershipGate(): GateState {
  const { me } = useMe()
  return useMemo(
    () => ({
      limit: !me || !me.authAvailable || (me.authenticated && !!me.user?.membershipActive)
        ? null
        : PREVIEW_LIMIT,
      total: 0,
    }),
    [me],
  )
}

export function GateBanner({ total, visible }: { total: number; visible: number }) {
  const { me } = useMe()
  if (!me?.authAvailable) return null
  const expired = me.authenticated && !me.user?.membershipActive

  return (
    <div className="editorial-card p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-3 border-accent/30">
      <Lock size={16} className="text-accent shrink-0" />
      <p className="text-sm text-text-secondary flex-1 leading-relaxed">
        {expired ? (
          <>会员已到期 —— 本组共 {total} 词，当前可预览 {visible} 词。</>
        ) : (
          <>免费预览 {visible} / {total} 词 —— 注册即送 3 个月全功能，邀请好友双方各得 1 个月。</>
        )}
      </p>
      <Link
        href={expired ? '/me' : '/login'}
        className="shrink-0 inline-flex items-center justify-center px-5 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover transition-colors"
      >
        {expired ? '查看会员' : '解锁全部'}
      </Link>
    </div>
  )
}
