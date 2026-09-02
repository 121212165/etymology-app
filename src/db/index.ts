// src/db/index.ts
// SQLite 单文件库（自托管版专用）。Vercel 只读文件系统打不开写库时，
// authAvailable=false，前端据此隐藏账号入口，两边平台都不报错。
import Database from 'better-sqlite3'
import { mkdirSync } from 'fs'
import { join } from 'path'

export const DB_PATH = process.env.DB_PATH || join(process.cwd(), 'data', 'etymology.db')

let db: Database.Database | null = null
let initError: string | null = null

function init(): Database.Database {
  mkdirSync(join(DB_PATH, '..'), { recursive: true })
  const d = new Database(DB_PATH)
  d.pragma('journal_mode = WAL')
  d.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password_hash TEXT,
      github_id TEXT UNIQUE,
      display_name TEXT,
      membership_expires_at INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      settings TEXT NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS memberships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      source TEXT NOT NULL,            -- signup_bonus / invite / payment / correction
      days INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,     -- 该次叠加后的到期时间（审计用）
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS email_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      purpose TEXT NOT NULL,           -- register / login
      expires_at INTEGER NOT NULL,
      consumed INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rate_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL,               -- ip:action / email:action
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS invite_codes (
      code TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      used_by INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_email_codes ON email_codes(email, purpose, consumed);
    CREATE INDEX IF NOT EXISTS idx_rate_events ON rate_events(key, created_at);
  `)
  return d
}

/** 库不可用（Vercel 只读 FS / 初始化失败）时返回 null，调用方走降级分支 */
export function getDb(): Database.Database | null {
  if (db) return db
  if (initError) return null
  try {
    db = init()
    return db
  } catch (e) {
    initError = e instanceof Error ? e.message : String(e)
    console.warn('[db] init failed, auth disabled:', initError)
    return null
  }
}

export function isAuthAvailable(): boolean {
  return getDb() !== null
}
