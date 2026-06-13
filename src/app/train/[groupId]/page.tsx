'use client'

import { useTrainSession } from '@/hooks/useTrainSession'
import { TopBar } from '@/components/layout/TopBar'
import { PhaseProgress } from '@/components/train/PhaseProgress'
import { ObservePhase } from '@/components/train/ObservePhase'
import GuessPhase from '@/components/train/GuessPhase'
import { DecomposePhase } from '@/components/train/DecomposePhase'
import { TrainComplete } from '@/components/train/TrainComplete'
import { useParams, useRouter } from 'next/navigation'

export default function TrainPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = decodeURIComponent(params.groupId as string)
  const {
    loading,
    phase,
    phaseIndex,
    words,
    guessQuestions,
    decomposeQuestions,
    group,
    observeNext,
    advancePhase,
    reset,
    stats,
  } = useTrainSession(groupId)

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-deep">
        <TopBar />
        <div
          className="flex items-center justify-center"
          style={{ minHeight: 'calc(100vh - 56px)' }}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-text-secondary text-sm">加载数据中...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-deep">
      <TopBar />
      <div className="px-4 pt-4 max-w-3xl mx-auto">
        <PhaseProgress
          currentPhase={phase}
          phaseIndex={phase === 'observe' ? 0 : phase === 'guess' ? 1 : phase === 'decompose' ? 2 : 3}
          phaseTotal={3}
        />
      </div>
      {phase === 'observe' && (
        <ObservePhase
          words={words}
          currentIndex={phaseIndex}
          onNext={observeNext}
          onPhaseEnd={advancePhase}
        />
      )}
      {phase === 'guess' && (
        <GuessPhase
          questions={guessQuestions}
          onComplete={() => advancePhase()}
        />
      )}
      {phase === 'decompose' && (
        <DecomposePhase
          questions={decomposeQuestions}
          onComplete={() => advancePhase()}
        />
      )}
      {phase === 'complete' && (
        <TrainComplete
          groupLabel={group?.label ?? groupId}
          stats={stats}
          onRestart={reset}
        />
      )}
    </div>
  )
}
