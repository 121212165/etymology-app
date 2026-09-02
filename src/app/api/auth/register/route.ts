// src/app/api/auth/register/route.ts
// 邮箱注册：验证码 + 密码 → 建号送 3 个月（trial），可选邀请码双方 +30 天。
// 防盗刷：注册 IP 3/天。
import { NextResponse } from 'next/server'
import { isAuthAvailable } from '@/db'
import { checkEmailPolicy } from '@/lib/auth/email-policy'
import { hitLimit, clientIp } from '@/lib/auth/ratelimit'
import { consumeCode } from '@/lib/auth/codes'
import { createEmailUser, getUserByEmail } from '@/lib/auth/users'
import { createSessionToken, setSessionCookie } from '@/lib/auth/session'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  if (!isAuthAvailable()) {
    return NextResponse.json({ error: '账号功能仅在自托管版可用' }, { status: 503 })
  }
  const body = (await req.json().catch(() => ({}))) as {
    email?: string
    password?: string
    code?: string
    ref?: string
  }
  const policy = checkEmailPolicy(body.email ?? '')
  if (!policy.ok) {
    return NextResponse.json({ error: policy.reason }, { status: 400 })
  }
  if (!body.password || body.password.length < 8) {
    return NextResponse.json({ error: '密码至少 8 位' }, { status: 400 })
  }
  const ip = clientIp(req)
  if (hitLimit(ip, 'register:ip')) {
    return NextResponse.json({ error: '该 IP 今日注册次数已达上限' }, { status: 429 })
  }
  if (!body.code || !consumeCode(policy.email, 'register', body.code)) {
    return NextResponse.json({ error: '验证码错误或已过期' }, { status: 400 })
  }
  if (getUserByEmail(policy.email)) {
    return NextResponse.json({ error: '该邮箱已注册，请直接登录' }, { status: 409 })
  }

  const { user } = createEmailUser({ email: policy.email, password: body.password, inviteCode: body.ref?.trim().toUpperCase() })
  const token = await createSessionToken({ uid: user.id, email: user.email })
  const res = NextResponse.json({
    ok: true,
    membershipExpiresAt: user.membership_expires_at,
  })
  setSessionCookie(res, token)
  return res
}
