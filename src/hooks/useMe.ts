// src/hooks/useMe.ts
'use client'

import { useEffect, useState, useCallback } from 'react'

export interface MeResponse {
  authAvailable: boolean
  authenticated: boolean
  user?: {
    email: string | null
    displayName: string | null
    membershipExpiresAt: number
    membershipActive: boolean
    createdAt: number
  }
  settings?: Record<string, unknown>
  inviteCode?: string
  features?: { githubOAuth: boolean; smtp: boolean }
}

/**
 * 账号状态单例 hook（各页面共享一次请求的快照）。
 * authAvailable=false 表示当前部署无后端（如 Vercel 静态版），UI 隐藏账号入口。
 */
let cache: MeResponse | null = null
let inflight: Promise<MeResponse> | null = null

export function useMe() {
  const [me, setMe] = useState<MeResponse | null>(cache)
  const [loading, setLoading] = useState(!cache)

  const refresh = useCallback(async () => {
    if (!inflight) {
      inflight = fetch('/api/me', { cache: 'no-store' })
        .then((r) => r.json() as Promise<MeResponse>)
        .catch(() => ({ authAvailable: false, authenticated: false } as MeResponse))
        .then((data) => {
          cache = data
          inflight = null
          return data
        })
    }
    const data = await inflight
    setMe(data)
    setLoading(false)
    return data
  }, [])

  useEffect(() => {
    if (!cache) void refresh()
  }, [refresh])

  return { me, loading, refresh }
}
