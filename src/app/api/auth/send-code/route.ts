// src/app/api/auth/send-code/route.ts
// 发送邮箱验证码。防盗刷三层在 此前动作依次为：
//   1. 中国邮箱域白名单（+一次性邮箱黑名单兜底）
//   2. IP 限流（5/小时）+ 邮箱限流（1/分钟、5/小时）
import { NextResponse } from 'next/server'
import { isAuthAvailable } from '@/db'
import { checkEmailPolicy } from '@/lib/auth/email-policy'
import { hitLimit, clientIp } from '@/lib/auth/ratelimit'
import { issueCode } from '@/lib/auth/codes'
import { sendVerificationCode, smtpConfigured } from '@/lib/auth/mailer'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  if (!isAuthAvailable()) {
    return NextResponse.json({ error: '账号功能仅在自托管版可用' }, { status: 503 })
  }
  const body = (await req.json().catch(() => ({}))) as { email?: string; purpose?: string }
  const purpose = body.purpose === 'login' ? 'login' : 'register'
  const policy = checkEmailPolicy(body.email ?? '')
  if (!policy.ok) {
    return NextResponse.json({ error: policy.reason }, { status: 400 })
  }

  const ip = clientIp(req)
  if (hitLimit(ip, 'send-code:ip')) {
    return NextResponse.json({ error: '发送太频繁，请一小时后再试' }, { status: 429 })
  }
  if (hitLimit(policy.email, 'send-code:email-burst')) {
    return NextResponse.json({ error: '验证码 1 分钟内刚发过，请查收或稍后再试' }, { status: 429 })
  }
  if (hitLimit(policy.email, 'send-code:email')) {
    return NextResponse.json({ error: '该邮箱发送次数已达上限，请一小时后再试' }, { status: 429 })
  }

  const code = issueCode(policy.email, purpose)
  try {
    const result = await sendVerificationCode(policy.email, code, purpose)
    return NextResponse.json({ ok: true, via: result.via })
  } catch (e) {
    console.error('[send-code] SMTP 发送失败:', e)
    // SMTP 异常时回退到日志兜底，不把用户挡死
    console.log(`[send-code] [兜底] ${purpose}验证码 → ${policy.email}: ${code}`)
    return NextResponse.json({ ok: true, via: 'console' })
  }
}

export async function GET() {
  return NextResponse.json({ smtpConfigured: smtpConfigured() })
}
