// src/app/me/page.tsx
// 个人中心：账号信息、会员状态、邀请奖励、学习设置（遮罩档位迁入账号）。
// 未登录 → 跳 /login；无后端（Vercel 静态版）→ 引导提示。
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Copy, Check, LogOut } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { useMe } from '@/hooks/useMe'
import { useMaskStore } from '@/store/mask-store'

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('zh-CN')
}

export default function MePage() {
  const router = useRouter()
  const { me, loading, refresh } = useMe()
  const maskLevel = useMaskStore((s) => s.maskLevel)
  const setMaskLevel = useMaskStore((s) => s.setMaskLevel)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)

  // 登录后：账号设置 → 本地（档位以账号为准）
  useEffect(() => {
    const remote = me?.settings?.maskLevel
    if (typeof remote === 'string' && ['off', 'easy', 'hard'].includes(remote)) {
      if (remote !== useMaskStore.getState().maskLevel) setMaskLevel(remote as 'off' | 'easy' | 'hard')
    }
  }, [me?.settings?.maskLevel, setMaskLevel])

  const updateMaskLevel = async (level: 'off' | 'easy' | 'hard') => {
    setMaskLevel(level)
    if (!me?.authenticated) return
    setSaving(true)
    await fetch('/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { maskLevel: level } }),
    }).catch(() => null)
    setSaving(false)
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    await refresh()
    router.push('/')
  }

  const copyInvite = () => {
    const url = `${location.origin}/login?ref=${me!.inviteCode}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-deep">
        <TopBar />
        <div className="max-w-md mx-auto pt-32 text-center text-text-secondary text-sm">加载中…</div>
      </div>
    )
  }

  if (!me?.authAvailable) {
    return (
      <div className="min-h-screen bg-bg-deep">
        <TopBar />
        <div className="max-w-md mx-auto px-6 pt-32 text-center">
          <p className="text-text-secondary text-sm leading-relaxed">
            账号功能部署在自托管版（http://124.220.110.165）。
            <br />
            当前镜像站点为静态版，学习功能不受影响。
          </p>
          <Link href="/" className="inline-block mt-6 text-sm text-accent hover:underline">回首页</Link>
        </div>
      </div>
    )
  }

  if (!me.authenticated) {
    router.replace('/login')
    return null
  }

  const user = me.user!
  const LEVELS: { key: 'off' | 'easy' | 'hard'; label: string; desc: string }[] = [
    { key: 'off', label: '关', desc: '无遮罩' },
    { key: 'easy', label: '遮释义', desc: '构词可见' },
    { key: 'hard', label: '全遮', desc: '只留单词' },
  ]

  return (
    <div className="min-h-screen bg-bg-deep">
      <TopBar />
      <main className="max-w-xl mx-auto px-6 pt-16 pb-24">
        <h1 className="text-3xl text-text-primary mb-8">个人中心</h1>

        {/* ── 账号卡 ── */}
        <section className="editorial-card p-6 mb-6">
          <p className="editorial-label mb-2">账号</p>
          <p className="text-text-primary text-lg mb-1">{user.displayName ?? user.email}</p>
          {user.displayName && user.email && <p className="text-text-muted text-sm">{user.email}</p>}
          <p className="text-text-muted text-sm mt-3">
            注册于 {fmtDate(user.createdAt)} ·{' '}
            {user.membershipActive ? (
              <span className="text-accent">会员至 {fmtDate(user.membershipExpiresAt)}</span>
            ) : (
              <span>会员已到期</span>
            )}
          </p>
        </section>

        {/* ── 学习设置卡（难度档位从 localStorage 迁入账号，换设备不再丢） ── */}
        <section className="editorial-card p-6 mb-6">
          <div className="flex items-baseline justify-between mb-4">
            <p className="editorial-label">遮罩难度</p>
            {saving && <span className="text-xs text-text-muted">保存中…</span>}
          </div>
          <div className="flex gap-2">
            {LEVELS.map((l) => (
              <button
                key={l.key}
                type="button"
                onClick={() => updateMaskLevel(l.key)}
                className={`flex-1 px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                  maskLevel === l.key
                    ? 'border-accent/60 text-accent bg-accent/5'
                    : 'border-border text-text-secondary hover:border-accent/30'
                }`}
              >
                <span className="block">{l.label}</span>
                <span className="block text-xs text-text-muted mt-0.5">{l.desc}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-text-muted mt-3">登录后该设置跟随账号，任何设备一致。</p>
        </section>

        {/* ── 邀请卡 ── */}
        <section className="editorial-card p-6 mb-6">
          <p className="editorial-label mb-2">邀请好友</p>
          <p className="text-sm text-text-secondary mb-4">好友注册成功，双方各得 1 个月会员。</p>
          <div className="flex gap-2">
            <code className="flex-1 px-4 py-2.5 rounded-lg bg-bg-elevated text-sm text-text-primary font-mono truncate">
              {me.inviteCode}
            </code>
            <button
              type="button"
              onClick={copyInvite}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 rounded-lg border border-border text-sm text-text-secondary hover:text-accent hover:border-accent/50 transition-colors"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? '已复制' : '复制链接'}
            </button>
          </div>
        </section>

        {/* ── 付费（第三期接虎皮椒前的占位） ── */}
        <section className="editorial-card p-6 mb-6">
          <p className="editorial-label mb-2">会员</p>
          <p className="text-sm text-text-secondary">月 15 / 季 30 / 年 150 / 买断 300 · 在线支付即将开通</p>
        </section>

        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <LogOut size={14} />
          退出登录
        </button>
      </main>
    </div>
  )
}
