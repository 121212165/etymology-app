// src/lib/auth/users.ts
// 用户与会员模型：注册送 3 个月（trial），邀请注册双方各 +30 天。
// 到期时间统一存 users.membership_expires_at；memberships 表留审计流水。
import bcrypt from 'bcryptjs'
import { getDb } from '@/db'

export const TRIAL_DAYS = 92        // 新用户注册送 3 个月（按 92 天计）
export const INVITE_DAYS = 30       // 邀请成功双方各 +1 个月
const DAY = 24 * 3600_000

export interface UserRow {
  id: number
  email: string | null
  password_hash: string | null
  github_id: string | null
  display_name: string | null
  membership_expires_at: number
  created_at: number
  settings: string
}

export function getUserById(id: number): UserRow | null {
  return (getDb()!.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow) ?? null
}

export function getUserByEmail(email: string): UserRow | null {
  return (getDb()!.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow) ?? null
}

export function getUserByGithubId(githubId: string): UserRow | null {
  return (getDb()!.prepare('SELECT * FROM users WHERE github_id = ?').get(githubId) as UserRow) ?? null
}

/** 延长会员：从「当前到期与 now 的较大者」起加 days，写审计流水 */
export function extendMembership(userId: number, days: number, source: string): number {
  const db = getDb()!
  const user = getUserById(userId)
  const base = Math.max(user!.membership_expires_at, Date.now())
  const expiresAt = base + days * DAY
  db.prepare('UPDATE users SET membership_expires_at = ? WHERE id = ?').run(expiresAt, userId)
  db.prepare('INSERT INTO memberships (user_id, source, days, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(userId, source, days, expiresAt, Date.now())
  return expiresAt
}

export interface CreateEmailUserInput {
  email: string
  password: string
  /** 邀请码（可选）：被邀方 +30 天，邀请方 +30 天 */
  inviteCode?: string
}

export function createEmailUser(input: CreateEmailUserInput): { user: UserRow; invitedBy: number | null } {
  const db = getDb()!
  const now = Date.now()
  const hash = bcrypt.hashSync(input.password, 10)
  const info = db.prepare(
    'INSERT INTO users (email, password_hash, membership_expires_at, created_at) VALUES (?, ?, ?, ?)',
  ).run(input.email, hash, now + TRIAL_DAYS * DAY, now)
  const user = getUserById(Number(info.lastInsertRowid))!
  db.prepare('INSERT INTO memberships (user_id, source, days, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(user.id, 'signup_bonus', TRIAL_DAYS, user.membership_expires_at, now)

  // 邀请归因：码有效且未被用 → 双方各 +30 天
  let invitedBy: number | null = null
  if (input.inviteCode) {
    const row = db.prepare('SELECT user_id, used_by FROM invite_codes WHERE code = ?').get(input.inviteCode) as
      | { user_id: number; used_by: number | null }
      | undefined
    if (row && row.used_by === null && row.user_id !== user.id) {
      db.prepare('UPDATE invite_codes SET used_by = ? WHERE code = ?').run(user.id, input.inviteCode)
      extendMembership(user.id, INVITE_DAYS, 'invite')
      extendMembership(row.user_id, INVITE_DAYS, 'invite')
      invitedBy = row.user_id
    }
  }
  return { user, invitedBy }
}

export function createGithubUser(githubId: string, displayName: string | null, email: string | null): UserRow {
  const db = getDb()!
  const now = Date.now()
  const info = db.prepare(
    'INSERT INTO users (github_id, display_name, email, membership_expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(githubId, displayName, email, now + TRIAL_DAYS * DAY, now)
  const user = getUserById(Number(info.lastInsertRowid))!
  db.prepare('INSERT INTO memberships (user_id, source, days, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(user.id, 'signup_bonus', TRIAL_DAYS, user.membership_expires_at, now)
  return user
}

export function verifyPassword(user: UserRow, password: string): boolean {
  if (!user.password_hash) return false
  return bcrypt.compareSync(password, user.password_hash)
}

export function recordLoginFail(ip: string): void {
  const db = getDb()!
  db.prepare('INSERT INTO rate_events (key, created_at) VALUES (?, ?)').run(`${ip}:login-fail:ip`, Date.now())
}

export function loginFailExceeded(ip: string): boolean {
  const db = getDb()!
  const row = db.prepare(
    "SELECT COUNT(*) AS n FROM rate_events WHERE key = ? AND created_at > ?",
  ).get(`${ip}:login-fail:ip`, Date.now() - 15 * 60_000) as { n: number }
  return row.n >= 5
}

/** 为用户生成专属邀请码（一人一码，重复请求返回既有码） */
export function ensureInviteCode(userId: number): string {
  const db = getDb()!
  const existing = db.prepare('SELECT code FROM invite_codes WHERE user_id = ? AND used_by IS NULL').get(userId) as
    | { code: string }
    | undefined
  if (existing) return existing.code
  const code = `LX${userId.toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  db.prepare('INSERT INTO invite_codes (code, user_id, created_at) VALUES (?, ?, ?)').run(code, userId, Date.now())
  return code
}

export function membershipActive(user: UserRow, now = Date.now()): boolean {
  return user.membership_expires_at > now
}
