// src/components/feedback/MicroCelebrate.tsx
'use client'

import { useEffect, useState } from 'react'

interface MicroCelebrateProps {
  trigger: number
  message?: string
}

export function MicroCelebrate({ trigger, message = '已看' }: MicroCelebrateProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (trigger === 0) return
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), 800)
    return () => clearTimeout(timer)
  }, [trigger])

  if (!visible) return null

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="px-4 py-2 rounded-full bg-accent/90 text-white text-sm shadow-lg animate-pulse">
        {message}
      </div>
    </div>
  )
}
