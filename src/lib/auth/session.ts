// src/lib/auth/session.ts
// 会话：jose HS256 无状态 JWT，HttpOnly Cookie，30 天。
// 拿不到 SESSION_SECRET 时启动期随机生成（仅本进程有效）——便于未配置也能本地跑，
// 但生产务必通过 env_file 固定，否则重启后所有人掉线。
import { SignJWT, jwtVerify } from 'jose'
import type { NextResponse } from 'next/server'

export const SESSION_COOKIE = 'etym_session'
const THIRTY_DAYS = 30 * 24 * 3600

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || `dev-${Date.now()}-insecure`
  return new TextEncoder().encode(secret.padEnd(32, '0'))
}

export interface SessionPayload {
  uid: number
  email: string | null
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ uid: payload.uid, email: payload.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${THIRTY_DAYS}s`)
    .sign(secretKey())
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey())
    if (typeof payload.uid !== 'number') return null
    return { uid: payload.uid, email: (payload.email as string) ?? null }
  } catch {
    return null
  }
}

/** 给 NextResponse 设置会话 Cookie（HttpOnly；APP_URL 为 https 时加 Secure） */
export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.APP_URL?.startsWith('https://') ?? false,
    maxAge: THIRTY_DAYS,
    path: '/',
  })
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, maxAge: 0, path: '/' })
}
