// src/components/mask/MaskToggle.tsx
'use client'

import { Eye, EyeOff, Glasses } from 'lucide-react'
import { useMaskStore, type MaskLevel } from '@/store/mask-store'

const LEVEL_META: Record<MaskLevel, { label: string; icon: typeof Eye; title: string }> = {
  off: { label: '无遮罩', icon: EyeOff, title: '遮罩：关（点击切换到遮释义）' },
  easy: { label: '遮释义', icon: Eye, title: '遮罩：遮释义（点击切换到全遮）' },
  hard: { label: '全遮', icon: Glasses, title: '遮罩：全遮释义与拆解（点击关闭）' },
}

/**
 * 遮罩难度切换（第二版需求：难度档位可调；个人中心上线前先以全局开关代替，
 * 后端就绪后迁移到个人中心）。点击在 关 → 遮释义 → 全遮 间循环。
 */
export function MaskToggle({ className = '' }: { className?: string }) {
  const maskLevel = useMaskStore((s) => s.maskLevel)
  const cycleMaskLevel = useMaskStore((s) => s.cycleMaskLevel)
  const meta = LEVEL_META[maskLevel]
  const Icon = meta.icon

  return (
    <button
      type="button"
      onClick={cycleMaskLevel}
      title={meta.title}
      aria-label={meta.title}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors ${className}`}
    >
      <Icon size={16} />
      <span className="text-xs">{meta.label}</span>
    </button>
  )
}
