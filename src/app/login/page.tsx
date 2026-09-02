// src/app/login/page.tsx
// 登录/注册：邮箱（中国白名单）+ 验证码 + 密码（≥8 位）；密码登录带邮箱验证码二次验证；
// GitHub OAuth（未配置时按钮隐藏）；?ref=邀请码 自动带入注册；?error= 展示 OAuth 失败原因。
// 注册送 3 个月全功能。
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { useMe } from '@/hooks/useMe'

type Mode = 'register' | 'login'

function LoginInner() {
  const router = useRouter()
  const params = useSearchParams()
  const { me, refresh } = useMe()
  const [mode, setMode] = useState<Mode>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [needLoginCode, setNeedLoginCode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const ref = params.get('ref')?.trim().toUpperCase() || ''
  const oauthError = params.get('error')

  useEffect(() => {
    if (me?.authAvailable && me.authenticated) router.replace('/me')
  }, [me, router])

  const sendCode = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: mode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '发送失败')
      setCodeSent(true)
      setMsg(data.via === 'console' ? '验证码已生成（未配置发信邮箱，查看服务器日志）' : '验证码已发送到你的邮箱')
    } catch (e) {
      setError(e instanceof Error ? e.message : '发送失败')
    } finally {
      setBusy(false)
    }
  }

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, code, ref }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '注册失败')
        await refresh()
        router.push('/me')
      } else if (!needLoginCode) {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '登录失败')
        setNeedLoginCode(true)
        setCodeSent(true)
        setMsg('验证码已发送，完成二次验证')
      } else {
        const res = await fetch('/api/auth/login-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '验证失败')
        await refresh()
        router.push('/me')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败')
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full px-4 py-3 rounded-lg bg-bg-surface border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50'

  return (
    <div className="min-h-screen bg-bg-deep">
      <TopBar />
      <main className="max-w-md mx-auto px-6 pt-20 pb-24">
        <h1 className="text-3xl text-text-primary text-center mb-2">
          {mode === 'register' ? '注册' : '登录'}
        </h1>
        <p className="text-text-secondary text-sm text-center mb-8">
          {mode === 'register' ? '注册即送 3 个月全功能' : '密码 + 邮箱验证码双重验证'}
        </p>

        {oauthError && (
          <p className="mb-4 px-4 py-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-400">
            {oauthError}
          </p>
        )}
        {ref && mode === 'register' && (
          <p className="mb-4 text-center text-sm text-accent">邀请码 {ref} 已带入，注册成功双方各得 1 个月</p>
        )}

        <div className="flex mb-6 border-b border-border">
          {(['register', 'login'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m)
                setNeedLoginCode(false)
                setCodeSent(false)
                setError(null)
                setMsg(null)
              }}
              className={`flex-1 pb-3 text-sm transition-colors ${
                mode === m ? 'text-accent border-b-2 border-accent -mb-px' : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {m === 'register' ? '注册' : '登录'}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="邮箱（支持 QQ/163/126/foxmail 等中国邮箱）"
            className={inputCls}
            autoComplete="email"
          />
          {mode === 'register' && (
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="设置密码（至少 8 位）"
              className={inputCls}
              autoComplete="new-password"
            />
          )}
          {(mode === 'register' || needLoginCode) && (
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="邮箱验证码"
                className={inputCls}
                inputMode="numeric"
                maxLength={6}
              />
              <button
                type="button"
                onClick={sendCode}
                disabled={busy || !email || (mode === 'register' && !password)}
                className="shrink-0 px-4 rounded-lg border border-border text-sm text-text-secondary hover:text-accent hover:border-accent/50 disabled:opacity-40 transition-colors"
              >
                发验证码
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={busy || !email || (mode === 'register' && (!password || !code)) || (mode === 'login' && (!password || (needLoginCode && !code)))}
            className="mt-2 w-full py-3 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover disabled:opacity-40 transition-colors"
          >
            {busy ? '处理中…' : mode === 'register' ? '注册并领取 3 个月' : needLoginCode ? '完成验证' : '下一步'}
          </button>

          {me?.features?.githubOAuth && (
            <>
              <div className="flex items-center gap-3 my-1">
                <hr className="editorial-divider flex-1" />
                <span className="text-xs text-text-muted">或</span>
                <hr className="editorial-divider flex-1" />
              </div>
              <a
                href="/api/auth/github"
                className="w-full py-3 rounded-lg border border-border text-sm text-text-primary text-center hover:border-accent/50 transition-colors"
              >
                使用 GitHub 登录
              </a>
            </>
          )}
        </div>

        {msg && <p className="mt-4 text-sm text-accent text-center">{msg}</p>}
        {error && <p className="mt-4 text-sm text-red-400 text-center">{error}</p>}

        <p className="mt-8 text-xs text-text-muted text-center leading-relaxed">
          注册即送 3 个月全功能 · 邀请 1 位好友双方各得 1 个月
          <br />
          <Link href="/" className="hover:text-text-secondary">回首页继续浏览</Link>
        </p>
      </main>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  )
}
