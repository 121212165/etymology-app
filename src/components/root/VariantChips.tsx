// src/components/root/VariantChips.tsx
'use client'

import type { VariantGroup } from '@/hooks/useVariantGroups'

interface VariantChipsProps {
  groups: VariantGroup[]
  /** 当前词所属的变体文本；null 表示当前词属于「其他」组 */
  activeVariant: string | null
  /** 点击 chip：跳到该组第一词。参数为该组的变体文本（「其他」组为 null） */
  onSelect: (variant: string | null) => void
}

/**
 * 词卡上方的变体条：每个变体一个 chip，当前词所属变体高亮。
 * 由调用方保证仅在 aliases 非空（groups 非空）时渲染。
 */
export function VariantChips({ groups, activeVariant, onSelect }: VariantChipsProps) {
  if (groups.length === 0) return null

  return (
    <div className="mb-4" data-testid="variant-chips">
      <p className="editorial-label mb-2">变体</p>
      <div className="flex flex-wrap gap-2">
        {groups.map(group => {
          const isOther = group.text === null
          const active = isOther
            ? activeVariant === null
            : activeVariant === group.text
          return (
            <button
              key={group.text ?? '__other__'}
              type="button"
              onClick={() => onSelect(group.text)}
              aria-pressed={active}
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-mono border transition-colors ${
                active
                  ? 'bg-accent text-white border-transparent'
                  : 'text-text-secondary border-border hover:text-accent hover:border-accent/40'
              }`}
            >
              {group.text ?? '其他'}
            </button>
          )
        })}
      </div>
    </div>
  )
}
