// src/lib/auth/ratelimit.ts
// IP/邮箱维度滑动窗口限流（rate_events 表，行即事件）。
// 防盗刷第三层：验证码发送 / 注册 / 登录失败各自配额，超限拒办。
import { getDb } from '@/db'

export const LIMITS = {
  /** 发验证码：同 IP 5/小时，同邮箱 1/分钟 + 5/小时 */
  'send-code:ip': { max: 5, windowMs: 3600_000 },
  'send-code:email': { max: 5, windowMs: 3600_000 },
  'send-code:email-burst': { max: 1, windowMs: 60_000 },
  /** 注册：同 IP 3/天 */
  'register:ip': { max: 3, windowMs: 24 * 3600_000 },
  /** 登录失败：同 IP 5/15 分钟（成功不记事件） */
  'login-fail:ip': { max: 5, windowMs: 15 * 60_000 },
} as const

export type LimitAction = keyof typeof LIMITS

/** 记一次事件并判断是否超限（先记后查：本事件计入窗口） */
export function hitLimit(key: string, action: LimitAction): boolean {
  const db = getDb()
  if (!db) return false
  const { max, windowMs } = LIMITS[action]
  const now = Date.now()
  db.prepare('INSERT INTO rate_events (key, created_at) VALUES (?, ?)').run(`${key}:${action}`, now)
  // 顺手清理 24h 前的旧事件，防表膨胀
  if (Math.random() < 0.05) {
    db.prepare('DELETE FROM rate_events WHERE created_at < ?').run(now - 24 * 3600_000)
  }
  const row = db
    .prepare('SELECT COUNT(*) AS n FROM rate_events WHERE key = ? AND created_at > ?')
    .get(`${key}:${action}`, now - windowMs) as { n: number }
  return row.n > max
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}
