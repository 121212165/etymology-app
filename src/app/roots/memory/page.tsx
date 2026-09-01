// src/app/roots/memory/page.tsx
'use client'

import { TopBar } from '@/components/layout/TopBar'
import { RootMemorySession } from '@/components/memory/RootMemorySession'

export default function RootMemoryPage() {
  return (
    <div className="min-h-screen bg-bg-deep">
      <TopBar />
      <RootMemorySession />
    </div>
  )
}
