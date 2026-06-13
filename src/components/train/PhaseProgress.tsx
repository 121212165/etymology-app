'use client'

import type { TrainPhase } from '@/lib/types'
import { Check } from 'lucide-react'

const PHASES: { key: TrainPhase; label: string }[] = [
  { key: 'observe', label: '观察' },
  { key: 'guess', label: '猜词义' },
  { key: 'decompose', label: '自主拆解' },
]

interface PhaseProgressProps {
  currentPhase: TrainPhase
  phaseIndex: number
  phaseTotal: number
}

export function PhaseProgress({ currentPhase, phaseIndex }: PhaseProgressProps) {
  const isComplete = currentPhase === 'complete'

  return (
    <div className="flex items-start gap-3 h-12">
      {PHASES.map((phase, i) => {
        const done = isComplete || i < phaseIndex
        const active = !isComplete && i === phaseIndex

        return (
          <div key={phase.key} className="flex-1 flex flex-col items-center gap-1">
            <span
              className={`text-xs font-medium ${
                active
                  ? 'text-accent'
                  : done
                    ? 'text-green-500'
                    : 'text-text-muted'
              }`}
            >
              {done ? (
                <span className="inline-flex items-center gap-1">
                  <Check size={12} />
                  {phase.label}
                </span>
              ) : (
                phase.label
              )}
            </span>
            <div className="w-full h-1 rounded-full bg-bg-hover overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  done
                    ? 'bg-green-500 w-full'
                    : active
                      ? 'bg-accent w-1/2'
                      : 'w-0'
                }`}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
