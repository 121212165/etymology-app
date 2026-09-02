// src/app/api/auth/login/route.ts
// 密码登录第一步：验密 → 发登录验证码（双重验证）。
// 登录失败记 IP 事件（5 次/15 分钟锁定），成功不记。
import { NextResponse } from 'next/server'
import { isAuthAvailable } from '@/db'
import { normalizeEmail } from '@/lib/auth/email-policy'
import { clientIp } from '@/lib/auth/ratelimit'
import { issueCode } from '@/lib/auth/codes'
import { sendVerificationCode } from '@/lib/auth/mailer'
import { getUserByEmail, verifyPassword, recordLoginFail, loginFailExceeded } from '@/lib/auth/users'

export const runtime = 'nodejs'

// 统一错误文案，避免「该邮箱不存在」这类用户枚举信息
const GENERIC_FAIL = '邮箱或密码不正确'

export async function POST(req: Request) {
  if (!isAuthAvailable()) {
    return NextResponse.json({ error: '账号功能仅在自托管版可用' }, { status: 503 })
  }
  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string }
  const email = normalizeEmail(body.email ?? '')
  const ip = clientIp(req)
  if (loginFailExceeded(ip)) {
    return NextResponse.json({ error: '失败次数过多，请 15 分钟后再试' }, { status: 429 })
  }

  const user = getUserByEmail(email)
  if (!user || !body.password || !verifyPassword(user, body.password)) {
    recordLoginFail(ip)
    return NextResponse.json({ error: GENERIC_FAIL }, { status: 401 })
  }
  if (!user.email) {
    // GitHub-only 账号没设密码，走 GitHub 登录
    return NextResponse.json({ error: '该账号使用 GitHub 登录' }, { status: 400 })
  }

  const code = issueCode(email, 'login')
  try {
    await sendVerificationCode(email, code, 'login')
  } catch (e) {
    console.error('[login] SMTP 失败:', e)
    console.log(`[login] [兜底] 登录验证码 → ${email}: ${code}`)
  }
  return NextResponse.json({ ok: true, needCode: true })
}
