// src/app/api/me/route.ts
// GET   /api/me     当前用户 + 会员状态 + 设置 + 功能开关（前端据此渲染登录入口/门控）
// PATCH /api/me     更新账号设置（maskLevel 等；登录后 localStorage 档位同步进账号）
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isAuthAvailable, getDb } from '@/db'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth/session'
import { getUserById, membershipActive, ensureInviteCode } from '@/lib/auth/users'
import { smtpConfigured } from '@/lib/auth/mailer'

export const runtime = 'nodejs'

async function currentUser(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!token) return null
  const payload = await verifySessionToken(token)
  if (!payload) return null
  return getUserById(payload.uid)
}

export async function GET(req: NextRequest) {
  if (!isAuthAvailable()) {
    // Vercel 静态版：无库 → 前端隐藏账号入口，学习功能不受影响
    return NextResponse.json({ authAvailable: false, authenticated: false })
  }
  const user = await currentUser(req)
  const githubOAuth = !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)
  if (!user) {
    return NextResponse.json({ authAvailable: true, authenticated: false, features: { githubOAuth, smtp: smtpConfigured() } })
  }
  const inviteCode = ensureInviteCode(user.id)
  return NextResponse.json({
    authAvailable: true,
    authenticated: true,
    user: {
      email: user.email,
      displayName: user.display_name,
      membershipExpiresAt: user.membership_expires_at,
      membershipActive: membershipActive(user),
      createdAt: user.created_at,
    },
    settings: JSON.parse(user.settings || '{}'),
    inviteCode,
    features: { githubOAuth, smtp: smtpConfigured() },
  })
}

export async function PATCH(req: NextRequest) {
  if (!isAuthAvailable() || !getDb()) {
    return NextResponse.json({ error: '账号功能仅在自托管版可用' }, { status: 503 })
  }
  const user = await currentUser(req)
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }
  const body = (await req.json().catch(() => ({}))) as { settings?: Record<string, unknown> }
  if (body.settings && typeof body.settings === 'object') {
    // 与既有设置浅合并，白名单键防脏数据
    const current = JSON.parse(user.settings || '{}') as Record<string, unknown>
    const allowed = ['maskLevel']
    for (const key of allowed) {
      if (key in body.settings) current[key] = body.settings[key]
    }
    getDb()!.prepare('UPDATE users SET settings = ? WHERE id = ?').run(JSON.stringify(current), user.id)
  }
  return NextResponse.json({ ok: true, settings: JSON.parse((getDb()!.prepare('SELECT settings FROM users WHERE id = ?').get(user.id) as { settings: string }).settings) })
}
