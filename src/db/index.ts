// src/db/index.ts
// SQLite 单文件库（自托管版专用），使用 Node 22+ 内置的 node:sqlite（零原生依赖，
// 不再引入 better-sqlite3——其预编译/编译产物在部分容器环境 require 即段错误）。
// Vercel 只读文件系统打不开写库时 authAvailable=false，前端据此隐藏账号入口。
// 类型：@types/node@20 无 node:sqlite 声明，这里做最小手工声明。
import { mkdirSync } from 'fs'
import { join } from 'path'

export const DB_PATH = process.env.DB_PATH || join(process.cwd(), 'data', 'etymology.db')

interface SqliteStatement {
  run: (...params: unknown[]) => { changes: number | bigint; lastInsertRowid: number | bigint }
  get: (...params: unknown[]) => unknown
  all: (...params: unknown[]) => unknown[]
}

interface SqliteDatabase {
  exec: (sql: string) => void
  prepare: (sql: string) => SqliteStatement
  close: () => void
}

// node:sqlite 在 Node 22.5+ 可用（22.x 需 --experimental-sqlite，Dockerfile 已注入）；
// 本地开发用 Node 24+ 时无需 flag。缺失时按库不可用降级。
type SqliteCtor = new (path: string) => SqliteDatabase
let DatabaseSync: SqliteCtor | null = null
try {
  // node:sqlite 为内置模块无类型声明；同步初始化必须用 require（动态 import 是异步的）
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  DatabaseSync = (require('node:sqlite') as { DatabaseSync: SqliteCtor }).DatabaseSync
} catch {
  DatabaseSync = null
}

let db: SqliteDatabase | null = null
let initError: string | null = null

function init(): SqliteDatabase {
  if (!DatabaseSync) throw new Error('node:sqlite 不可用（需要 Node 22.5+ 并开启 --experimental-sqlite）')
  mkdirSync(join(DB_PATH, '..'), { recursive: true })
  const d = new DatabaseSync(DB_PATH)
  d.exec('PRAGMA journal_mode = WAL')
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
export function getDb(): SqliteDatabase | null {
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
