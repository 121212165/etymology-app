// src/app/root/[slug]/page.tsx
import { readFileSync } from 'fs'
import { join } from 'path'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { RootSession } from '@/components/root/RootSession'
import type { VocabEntry, RootIndex } from '@/lib/types'
import type { MindMapData } from '@/lib/mindmap-types'
import { notFound } from 'next/navigation'

// 模块级缓存：SSG 时 613 个页面共享一份数据，避免重复 readFileSync + JSON.parse
// （enhanced-roots.json 有 27K 行，重复解析会导致 build 时间爆炸）
let cachedData: { vocab: VocabEntry[]; rootIndex: RootIndex; mindmap: MindMapData } | null = null

function loadData() {
  if (cachedData) return cachedData
  const dataDir = join(process.cwd(), 'public', 'data')
  const vocab: VocabEntry[] = JSON.parse(
    readFileSync(join(dataDir, 'vocab.json'), 'utf-8')
  )
  const rootIndex: RootIndex = JSON.parse(
    readFileSync(join(dataDir, 'roots-index.json'), 'utf-8')
  )
  // 使用增强后的合并数据，保证首页与词根页数据源一致
  const mindmap: MindMapData = JSON.parse(
    readFileSync(join(dataDir, 'enhanced-roots.json'), 'utf-8')
  )
  cachedData = { vocab, rootIndex, mindmap }
  return cachedData
}

// 生成所有词根的静态参数（包含合并后的主文本与别名，保证别名 URL 也可访问）
export function generateStaticParams() {
  const { rootIndex } = loadData()
  return Object.keys(rootIndex).map((slug) => ({ slug }))
}

// 通过任一别名找到合并后的词根节点
function findRootByAnyText(data: MindMapData, text: string) {
  return data.roots.find(
    (r) => r.primaryText === text || r.aliases.includes(text)
  )
}

export default async function RootPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const rootText = decodeURIComponent(slug)
  const { vocab, rootIndex, mindmap } = loadData()

  // 优先使用合并后的增强数据；若未找到（理论上不应发生），回退到原始 rootIndex
  const enhancedRoot = findRootByAnyText(mindmap, rootText)
  const rootEntry = rootIndex[rootText]

  if (!enhancedRoot && !rootEntry) {
    notFound()
  }

  const meaning = enhancedRoot?.meaning ?? rootEntry!.m
  const wordIndices = enhancedRoot?.wordIndices ?? rootEntry!.w
  // 统一用合并组的主文本作为展示名，避免别名与合并组内容不一致
  const displayRootText = enhancedRoot?.primaryText ?? rootText

  const words = wordIndices
    .filter((idx) => idx < vocab.length)
    .map((idx) => vocab[idx])
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

      {/* key 强制在词根切换时重挂载，避免 currentIndex 等内部 state 跨 root 复用导致越界/起始词错乱 */}
      <RootSession
        key={displayRootText}
        rootText={displayRootText}
        rootMeaning={meaning}
        words={words}
        enhancedRoot={enhancedRoot}
      />
    </div>
  )
}
