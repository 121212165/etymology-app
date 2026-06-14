'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, MessageSquare, Footprints, Hand, Brain, Building2, RotateCcw, Scale, ArrowRight, ChevronDown, Accessibility } from 'lucide-react'
import { ROOT_GROUPS, type RootGroupDef } from '@/lib/root-groups'
import type { RootIndex } from '@/lib/types'
import type { LucideIcon } from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  eye: Eye,
  speak: MessageSquare,
  foot: Footprints,
  hand: Hand,
  mind: Brain,
  build: Building2,
  turn: RotateCcw,
  stand: Accessibility,
  scales: Scale,
  prefix: ArrowRight,
}

function getIcon(icon: string): LucideIcon {
  return ICON_MAP[icon] ?? ArrowRight
}

function countUniqueWords(group: RootGroupDef, rootIndex: RootIndex): number {
  const wordSet = new Set<number>()
  for (const member of group.members) {
    const entry = rootIndex[member]
    if (entry) {
      for (const wi of entry.w) {
        wordSet.add(wi)
      }
    }
  }
  return wordSet.size
}

interface RootGroupPickerProps {
  rootIndex: RootIndex
}

export function RootGroupPicker({ rootIndex }: RootGroupPickerProps) {
  const router = useRouter()
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {ROOT_GROUPS.map((group) => {
        const Icon = getIcon(group.icon)
        const wordCount = countUniqueWords(group, rootIndex)
        const isExpanded = expandedGroup === group.label

        return (
          <div
            key={group.label}
            className="bg-bg-surface border border-border rounded-xl p-4 hover:border-accent/30 cursor-pointer transition-all"
            onClick={() => router.push(`/train/${encodeURIComponent(group.label)}`)}
          >
            <div className="flex items-center gap-3 mb-2">
              <Icon className="w-5 h-5 text-accent shrink-0" />
              <span className="font-medium">{group.label}</span>
            </div>
            <div className="flex items-center gap-4 text-sm opacity-70 mb-2">
              <span>词根 {group.members.length}</span>
              <span>单词 {wordCount}</span>
            </div>
            <div
              className="flex items-center gap-1 text-xs opacity-50 hover:opacity-80 transition-opacity select-none"
              onClick={(e) => {
                e.stopPropagation()
                setExpandedGroup(isExpanded ? null : group.label)
              }}
            >
              <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              <span>{isExpanded ? '收起' : '展开'}</span>
            </div>
            {isExpanded && (
              <div className="mt-2 flex flex-wrap gap-1">
                {group.members.map((m) => (
                  <span key={m} className="font-mono text-xs bg-bg-elevated rounded px-1.5 py-0.5">
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
