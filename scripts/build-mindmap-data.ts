// scripts/build-mindmap-data.ts
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { classifyLayer, LAYER_CORE, LAYER_MIDDLE, LAYER_EDGE } from './lib/layer-classifier'
import { mergeRoots, type MergeInput } from './lib/conservative-merger'
import { buildCooccurrenceLinks, type CooccurInput } from './lib/cooccurrence-linker'
import type { VocabEntry, RootIndex } from '../src/lib/types'
import type { MindMapData, EnhancedRootNode, WordLink } from '../src/lib/mindmap-types'

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

function main() {
  console.log('[build-mindmap] Loading source data...')
  const { vocab, rootIndex } = loadData()
  console.log(`  vocab: ${vocab.length} words`)
  console.log(`  rootIndex: ${Object.keys(rootIndex).length} roots`)

  console.log('[build-mindmap] Phase 1: Conservative merge...')
  const mergeInputs: MergeInput[] = Object.entries(rootIndex).map(([text, entry]) => ({
    text,
    meaning: entry.m,
    wordIndices: entry.w,
  }))

  const mergedGroups = mergeRoots(mergeInputs)
  console.log(`  merged: ${mergeInputs.length} -> ${mergedGroups.length} groups`)

  console.log('[build-mindmap] Phase 2: Layer classification...')
  const enhancedRoots: EnhancedRootNode[] = mergedGroups.map(group => {
    const wordCount = group.wordIndices.length
    return {
      primaryText: group.primaryText,
      aliases: group.texts.filter(t => t !== group.primaryText),
      meaning: group.meaning,
      layer: classifyLayer(wordCount),
      wordIndices: group.wordIndices,
      wordCount,
    }
  })

  const coreCount = enhancedRoots.filter(r => r.layer === LAYER_CORE).length
  const middleCount = enhancedRoots.filter(r => r.layer === LAYER_MIDDLE).length
  const edgeCount = enhancedRoots.filter(r => r.layer === LAYER_EDGE).length
  console.log(`  core: ${coreCount}, middle: ${middleCount}, edge: ${edgeCount}`)

  console.log('[build-mindmap] Phase 3: Cooccurrence links...')
  const partFreq: Record<string, number> = {}
  for (const word of vocab) {
    for (const part of word.parts) {
      const key = `${part.type}:${part.text}`
      partFreq[key] = (partFreq[key] || 0) + 1
    }
  }

  const cooccurInput: CooccurInput = {
    words: vocab.map((entry, index) => ({ index, parts: entry.parts })),
    partFrequency: partFreq,
  }

  const rawLinks = buildCooccurrenceLinks(cooccurInput, 0.1)
  // 将 CooccurLink (from/to) 映射为 WordLink (fromWordIndex/toWordIndex)
  const links: WordLink[] = rawLinks.map(l => ({
    fromWordIndex: l.from,
    toWordIndex: l.to,
    partText: l.partText,
    partType: l.partType,
    weight: l.weight,
  }))
  console.log(`  links: ${links.length}`)

  const result: MindMapData = {
    roots: enhancedRoots,
    links,
    stats: {
      totalRoots: enhancedRoots.length,
      coreRoots: coreCount,
      middleRoots: middleCount,
      edgeRoots: edgeCount,
      mergedGroups: mergedGroups.length,
      totalLinks: links.length,
    },
  }

  const outputPath = join(process.cwd(), 'public', 'data', 'enhanced-roots.json')
  writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8')
  console.log(`[build-mindmap] Output: ${outputPath}`)
  console.log('[build-mindmap] Stats:', result.stats)
}

main()
