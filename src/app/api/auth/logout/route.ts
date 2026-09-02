// src/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/auth/session'

export const runtime = 'nodejs'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  clearSessionCookie(res)
  return res
}
