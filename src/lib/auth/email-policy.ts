// src/lib/auth/email-policy.ts
// 注册邮箱策略（第二版需求）：只接受中国邮箱；一次性邮箱域名黑名单兜底。
// 纯函数，IP 限流见 ratelimit.ts。

/** 中国常见邮箱域白名单（可按需增补；vip 子域归一后匹配） */
export const CHINA_EMAIL_DOMAINS = new Set([
  'qq.com', 'vip.qq.com', 'foxmail.com',
  '163.com', 'vip.163.com', '126.com', 'vip.126.com', 'yeah.net',
  'sina.com', 'vip.sina.com', 'sina.cn',
  'sohu.com', 'vip.sohu.com',
  '139.com', '189.cn', 'aliyun.com',
  'tom.com', '21cn.com', 'wo.cn', 'msn.cn',
])

/** 已知一次性/临时邮箱域（白名单之外本就注册不了，这里是防白名单误增后的兜底） */
export const TEMP_EMAIL_DOMAINS = new Set([
  '10minutemail.com', '10minutemail.net', '20minutemail.com',
  'guerrillamail.com', 'guerrillamail.net', 'sharklasers.com', 'grr.la',
  'temp-mail.org', 'tempmail.com', 'tempmail.net', 'tmpmail.org',
  'mailinator.com', 'yopmail.com', 'yopmail.net', 'cool.fr.nf',
  'trashmail.com', 'trashmail.de', 'wegwerfmail.de',
  'dispostable.com', 'getnada.com', 'nada.email', 'mailnesia.com',
  'mytemp.email', 'mohmal.com', 'emailondeck.com', 'fakeinbox.com',
  'throwawaymail.com', 'maildrop.cc', 'mailcatch.com', 'spam4.me',
])

export interface EmailPolicyResult {
  ok: boolean
  /** 拒绝原因（ok=false 时给出，直接面向用户展示） */
  reason?: string
  /** 归一化后的邮箱（小写、trim） */
  email: string
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

/** 注册/绑定邮箱策略：格式 → 黑名单 → 白名单 */
export function checkEmailPolicy(raw: string): EmailPolicyResult {
  const email = normalizeEmail(raw)
  const at = email.lastIndexOf('@')
  if (at <= 0 || at === email.length - 1) {
    return { ok: false, reason: '邮箱格式不正确', email }
  }
  const domain = email.slice(at + 1)
  if (TEMP_EMAIL_DOMAINS.has(domain)) {
    return { ok: false, reason: '不支持临时邮箱注册', email }
  }
  if (!CHINA_EMAIL_DOMAINS.has(domain)) {
    return { ok: false, reason: '目前仅支持中国邮箱注册（QQ/163/126/foxmail/sina/sohu/139 等）', email }
  }
  return { ok: true, email }
}
