// src/app/api/auth/github/callback/route.ts
// GitHub OAuth 回调：验 state → 换 token → 拉 user+邮箱 → 建/连号 → 发会话 → 回首页。
// GitHub 账号注册同样送 3 个月。
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { getDb, isAuthAvailable } from '@/db'
import { createGithubUser, getUserByGithubId, getUserByEmail } from '@/lib/auth/users'
import { createSessionToken, setSessionCookie } from '@/lib/auth/session'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state') ?? ''
  const returnOrigin = req.cookies.get('etym_oauth_return')?.value ?? url.origin
  const fail = (msg: string) => NextResponse.redirect(`${returnOrigin}/login?error=${encodeURIComponent(msg)}`)

  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET
  if (!isAuthAvailable() || !clientId || !clientSecret) return fail('GitHub 登录未配置')
  if (!code) return fail('GitHub 授权未完成')

  try {
    // state 校验（前半段是签名的 JWT，| 后是发起 origin）
    const [jwtPart, stateOrigin] = state.split('|')
    await jwtVerify(jwtPart, new TextEncoder().encode(process.env.SESSION_SECRET || 'dev-state'))
    if (stateOrigin !== returnOrigin) return fail('登录来源校验失败，请重试')
  } catch {
    return fail('登录状态已过期，请重试')
  }

  // 换 access_token（显式 Accept 头，否则 GitHub 返回文本）
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  })
  const tokenJson = (await tokenRes.json()) as { access_token?: string }
  if (!tokenJson.access_token) return fail('GitHub 授权失败，请重试')

  const headers = {
    Authorization: `Bearer ${tokenJson.access_token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'etymology-app',
  }
  const ghUser = (await (await fetch('https://api.github.com/user', { headers })).json()) as {
    id: number
    login: string
    email: string | null
  }
  const ghEmails = (await (await fetch('https://api.github.com/user/emails', { headers })).json()) as
    | { email: string; primary: boolean; verified: boolean }[]
    | undefined
  const primaryVerified = Array.isArray(ghEmails) ? ghEmails.find((e) => e.primary && e.verified)?.email ?? null : null

  const db = getDb()!
  const existing = getUserByGithubId(String(ghUser.id))
  let userId: number
  if (existing) {
    userId = existing.id
  } else if (primaryVerified && getUserByEmail(primaryVerified.toLowerCase())) {
    // 同邮箱老用户：绑定 GitHub（email 列唯一，维持邮箱登录能力）
    const linked = getUserByEmail(primaryVerified.toLowerCase())!
    db.prepare('UPDATE users SET github_id = ? WHERE id = ?').run(String(ghUser.id), linked.id)
    userId = linked.id
  } else {
    const created = createGithubUser(String(ghUser.id), ghUser.login, primaryVerified?.toLowerCase() ?? null)
    userId = created.id
  }

  const token = await createSessionToken({ uid: userId, email: primaryVerified?.toLowerCase() ?? null })
  const res = NextResponse.redirect(`${returnOrigin}/me`)
  setSessionCookie(res, token)
  res.cookies.set('etym_oauth_return', '', { maxAge: 0, path: '/' })
  return res
}
