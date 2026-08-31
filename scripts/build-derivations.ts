// scripts/build-derivations.ts
// 为 vocab.json 构建派生链（derivation 字段），原地重写。
// 用法：npm run build:derivations
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { buildDerivations } from './lib/derivation'
import type { VocabEntry } from '../src/lib/types'

function main() {
  const path = join(process.cwd(), 'public', 'data', 'vocab.json')
  const vocab: VocabEntry[] = JSON.parse(readFileSync(path, 'utf-8'))
  const derivations = buildDerivations(vocab)

  let applied = 0
  const enriched = vocab.map(entry => {
    const der = derivations.get(entry.word)
    if (!der) return entry
    applied++
    return { ...entry, derivation: der }
  })

  writeFileSync(path, JSON.stringify(enriched, null, 2), 'utf-8')
  console.log(`[build-derivations] entries: ${enriched.length}, derivations applied: ${applied}`)

  // 抽样输出便于人工核对
  for (const word of ['fertility', 'accessibility', 'happiness', 'creation', 'nationality']) {
    const e = enriched.find(x => x.word === word)
    console.log(`  ${word}:`, e?.derivation ? `${e.derivation.stemWord} + ${e.derivation.suffix}` : '-')
  }
}

main()
