// src/app/api/auth/github/route.ts
// GitHub OAuth 第一步：带 state 防 CSRF 跳转授权页。未配置回调 503。
import { NextResponse } from 'next/server'
import { SignJWT } from 'jose'

export const runtime = 'nodejs'

/** 公网回源地址：反代后 req.url 是内部地址（localhost:3000），必须用 APP_URL/转发头推导 */
function publicOrigin(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL
  const proto = req.headers.get('x-forwarded-proto') ?? 'http'
  const host = req.headers.get('host') ?? 'localhost:3000'
  return `${proto}://${host}`
}

export async function GET(req: Request) {
  const clientId = process.env.GITHUB_CLIENT_ID
  if (!clientId || !process.env.GITHUB_CLIENT_SECRET) {
    return NextResponse.json({ error: 'GitHub 登录未配置' }, { status: 503 })
  }
  const origin = publicOrigin(req)
  const state = await new SignJWT({ t: Date.now() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(new TextEncoder().encode(process.env.SESSION_SECRET || 'dev-state'))
  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('scope', 'read:user user:email')
  url.searchParams.set('state', `${state}|${origin}`)
  const res = NextResponse.redirect(url.toString())
  res.cookies.set('etym_oauth_return', origin, { httpOnly: true, maxAge: 600, path: '/' })
  return res
}
