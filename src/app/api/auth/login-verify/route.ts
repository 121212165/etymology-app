// src/app/api/auth/login-verify/route.ts
// 密码登录第二步：邮箱验证码核销 → 发会话（双重验证闭环）。
import { NextResponse } from 'next/server'
import { isAuthAvailable } from '@/db'
import { normalizeEmail } from '@/lib/auth/email-policy'
import { clientIp } from '@/lib/auth/ratelimit'
import { consumeCode } from '@/lib/auth/codes'
import { getUserByEmail, recordLoginFail, loginFailExceeded } from '@/lib/auth/users'
import { createSessionToken, setSessionCookie } from '@/lib/auth/session'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  if (!isAuthAvailable()) {
    return NextResponse.json({ error: '账号功能仅在自托管版可用' }, { status: 503 })
  }
  const body = (await req.json().catch(() => ({}))) as { email?: string; code?: string }
  const email = normalizeEmail(body.email ?? '')
  const ip = clientIp(req)
  if (loginFailExceeded(ip)) {
    return NextResponse.json({ error: '失败次数过多，请 15 分钟后再试' }, { status: 429 })
  }
  const user = getUserByEmail(email)
  if (!user || !body.code || !consumeCode(email, 'login', body.code)) {
    recordLoginFail(ip)
    return NextResponse.json({ error: '验证码错误或已过期' }, { status: 401 })
  }
  const token = await createSessionToken({ uid: user.id, email: user.email })
  const res = NextResponse.json({ ok: true, membershipExpiresAt: user.membership_expires_at })
  setSessionCookie(res, token)
  return res
}
