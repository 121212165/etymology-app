// src/lib/mindmap-loader.ts
import type { MindMapData, EnhancedRootNode } from './mindmap-types'
import { orderRoots } from './root-ordering'

let cachedMindMap: MindMapData | null = null
let loadPromise: Promise<MindMapData> | null = null

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  return res.json()
}

export async function loadMindMapData(): Promise<MindMapData> {
  if (cachedMindMap) return cachedMindMap
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    try {
      const data = await fetchJSON<MindMapData>('/data/enhanced-roots.json')
      cachedMindMap = data
      return data
    } catch (e) {
      loadPromise = null
      throw e
    }
  })()

  return loadPromise
}

export function getCachedMindMap(): MindMapData | null {
  return cachedMindMap
}

export function getCoreRoots(data: MindMapData): EnhancedRootNode[] {
  // 词根排列 v2：核心层走语义主题全序，首页「下一个词根」与词根云随之成线
  return orderRoots(data.roots.filter(r => r.layer === 'core'))
}

export function getMiddleRoots(data: MindMapData): EnhancedRootNode[] {
  return orderRoots(data.roots.filter(r => r.layer === 'middle'))
}

export function findRootByText(data: MindMapData, text: string): EnhancedRootNode | undefined {
  return data.roots.find(r => r.primaryText === text || r.aliases.includes(text))
}
