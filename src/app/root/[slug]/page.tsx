// src/app/root/[slug]/page.tsx
import { readFileSync } from 'fs'
import { join } from 'path'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { RootSession } from '@/components/root/RootSession'
import type { VocabEntry, RootIndex } from '@/lib/types'
import { notFound } from 'next/navigation'

function loadData() {
  const dataDir = join(process.cwd(), 'public', 'data')
  const vocab: VocabEntry[] = JSON.parse(
    readFileSync(join(dataDir, 'vocab.json'), 'utf-8')
  )
  const rootIndex: RootIndex = JSON.parse(
    readFileSync(join(dataDir, 'roots-index.json'), 'utf-8')
  )
  return { vocab, rootIndex }
}

export function generateStaticParams() {
  const { rootIndex } = loadData()
  return Object.keys(rootIndex).map((slug) => ({ slug }))
}

export default async function RootPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const rootText = decodeURIComponent(slug)
  const { vocab, rootIndex } = loadData()
  const rootEntry = rootIndex[rootText]

  if (!rootEntry) {
    notFound()
  }

  const words = rootEntry.w
    .filter(idx => idx < vocab.length)
    .map(idx => vocab[idx])
    .filter(Boolean)

  return (
    <div className="min-h-screen bg-bg-deep">
      <header className="sticky top-0 z-50 h-[56px] bg-bg-surface/95 backdrop-blur-sm border-b border-border flex items-center px-4 lg:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">返回</span>
        </Link>
      </header>

      <RootSession rootText={rootText} rootMeaning={rootEntry.m} words={words} />
    </div>
  )
}
