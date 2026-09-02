// src/lib/auth/codes.ts
// 邮箱验证码：6 位数字，10 分钟有效，一次性消费。
import { getDb } from '@/db'

const CODE_TTL = 10 * 60_000

function newCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

/** 签发验证码（覆盖式：同邮箱同用途旧码全部作废） */
export function issueCode(email: string, purpose: 'register' | 'login'): string {
  const db = getDb()!
  const code = newCode()
  const now = Date.now()
  db.prepare('UPDATE email_codes SET consumed = 1 WHERE email = ? AND purpose = ? AND consumed = 0').run(email, purpose)
  db.prepare('INSERT INTO email_codes (email, code, purpose, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(email, code, purpose, now + CODE_TTL, now)
  return code
}

/** 校验并消费（错误码不计失败次数，靠限流层防爆破） */
export function consumeCode(email: string, purpose: 'register' | 'login', code: string): boolean {
  const db = getDb()!
  const now = Date.now()
  const row = db.prepare(
    'SELECT id FROM email_codes WHERE email = ? AND purpose = ? AND consumed = 0 AND code = ? AND expires_at > ? ORDER BY id DESC LIMIT 1',
  ).get(email, purpose, code.trim(), now) as { id: number } | undefined
  if (!row) return false
  db.prepare('UPDATE email_codes SET consumed = 1 WHERE id = ?').run(row.id)
  return true
}
