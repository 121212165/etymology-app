// src/lib/auth/mailer.ts
// SMTP 发信（QQ 邮箱等个人邮箱开 SMTP 拿授权码即可）。未配置 SMTP 时进入
// 控制台兜底模式：验证码打进服务器日志（docker logs 可见），注册流程不受阻——
// 便于先上线后补钥匙。生产配置 SMTP_* 环境变量后自动切真实发信。
import nodemailer from 'nodemailer'

export function smtpConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

export async function sendVerificationCode(email: string, code: string, purpose: 'register' | 'login'): Promise<{ sent: boolean; via: 'smtp' | 'console' }> {
  const scene = purpose === 'register' ? '注册' : '登录'
  if (!smtpConfigured()) {
    console.log(`[mailer] [兜底模式] ${scene}验证码 → ${email}: ${code}`)
    return { sent: true, via: 'console' }
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  })
  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: `林序 · ${scene}验证码 ${code}`,
    text: `你的${scene}验证码是 ${code}，10 分钟内有效。若非本人操作请忽略。`,
  })
  return { sent: true, via: 'smtp' }
}
