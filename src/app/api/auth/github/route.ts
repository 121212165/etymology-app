// src/app/api/auth/github/route.ts
// GitHub OAuth 第一步：带 state 防 CSRF 跳转授权页。未配置回调 503。
import { NextResponse } from 'next/server'
import { SignJWT } from 'jose'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const clientId = process.env.GITHUB_CLIENT_ID
  if (!clientId || !process.env.GITHUB_CLIENT_SECRET) {
    return NextResponse.json({ error: 'GitHub 登录未配置' }, { status: 503 })
  }
  const state = await new SignJWT({ t: Date.now() })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(new TextEncoder().encode(process.env.SESSION_SECRET || 'dev-state'))
  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('scope', 'read:user user:email')
  url.searchParams.set('state', `${state}|${new URL(req.url).origin}`)
  const res = NextResponse.redirect(url.toString())
  res.cookies.set('etym_oauth_return', new URL(req.url).origin, { httpOnly: true, maxAge: 600, path: '/' })
  return res
}
