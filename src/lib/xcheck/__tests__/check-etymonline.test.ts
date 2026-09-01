// src/lib/xcheck/__tests__/check-etymonline.test.ts
import { describe, it, expect } from 'vitest'
import { checkRootEtymonline, inspectWord, mapEntries } from '../check-etymonline'
import type { EtymonlineEntry } from '../etymonline'
import type { RootEntry, VocabEntryLike } from '../types'

// 与共享层 fixture 同构的小样本（不读 .cache）
const root: RootEntry = {
  primaryText: 'vis',
  aliases: ['vid'],
  meaning: '看',
  layer: 'core',
  wordIndices: [0, 1],
  wordCount: 2,
}

const vocab: VocabEntryLike[] = [
  { word: 'vision', definition: '视力', parts: [{ type: 'root', text: 'vis', meaning: '看' }] },
  { word: 'hound', definition: '猎犬', parts: [{ type: 'root', text: 'vis', meaning: '看' }] },
]

const latinEntry: EtymonlineEntry = {
  word: 'vision',
  etymology: 'from Latin visionem (nominative visio) "act of seeing, sight," from videre "to see."',
}

const germanicEntry: EtymonlineEntry = {
  word: 'hound',
  etymology: 'from Old English hund "dog, hound," from Proto-Germanic *hundaz.',
}

const classicalMismatchEntry: EtymonlineEntry = {
  word: 'vision',
  etymology: 'from Latin caput "head," from PIE *kaput.',
}

describe('inspectWord', () => {
  it('抽取拉丁词源证据并机判词义（vis → seeing/sight）', () => {
    const ev = inspectWord(root, { index: 0, word: 'vision', partText: 'vis', partMeaning: '看' }, latinEntry)
    expect(ev.present).toBe(true)
    expect(ev.strong.length).toBeGreaterThanOrEqual(1)
    expect(ev.strong[0].language).toBe('Latin')
    expect(ev.bestGloss).toContain('seeing')
  })

  it('未收录词条 present=false', () => {
    const ev = inspectWord(root, { index: 0, word: 'nonexistentword', partText: 'vis', partMeaning: '看' }, undefined)
    expect(ev.present).toBe(false)
    expect(ev.strong).toHaveLength(0)
  })
})

describe('checkRootEtymonline', () => {
  it('拉丁证据 → confirmed，词义机判 match，gloss 可溯源', () => {
    const out = checkRootEtymonline(root, vocab, mapEntries([latinEntry, germanicEntry]))
    expect(out.root.status).toBe('confirmed')
    expect(out.root.source).toBe('etymonline')
    expect(out.root.classicalHits).toBeGreaterThanOrEqual(1)
    // 抽取规则：引号紧跟的形态才算证据——本句中是括注形态 visio 与 videre（visionem 后跟括注不跟引号）
    expect(out.root.evidence).toContain('videre')
    expect(out.root.evidence).toContain('visio')
    const vision = out.words.find((w) => w.word === 'vision')
    expect(vision?.status).toBe('confirmed')
    expect(vision?.meaningVerdict).toBe('match')
    expect(vision?.gloss).toBeTruthy()
  })

  it('纯日耳曼词源且无古典提及 → conflict（启发式）', () => {
    const out = checkRootEtymonline(root, [vocab[1]], mapEntries([germanicEntry]))
    expect(out.words[0].status).toBe('conflict')
    expect(out.root.status).toBe('conflict')
    expect(out.root.nonClassicalEvidence).toEqual(['hound'])
  })

  it('提及古典但形态不符 → not_found（不算反证也不算 conflict）', () => {
    const out = checkRootEtymonline(root, [vocab[0]], mapEntries([classicalMismatchEntry]))
    expect(out.words[0].status).toBe('not_found')
    expect(out.root.status).toBe('not_found')
    expect(out.root.source).toBe('')
  })

  it('词条未收录 → not_found 且 detail 注明', () => {
    const out = checkRootEtymonline(root, [vocab[0]], mapEntries([]))
    expect(out.words[0].status).toBe('not_found')
    expect(out.words[0].detail).toContain('未收录')
  })

  it('确定性：同输入两次运行 deep-equal', () => {
    const entries = [latinEntry, germanicEntry, classicalMismatchEntry]
    const a = checkRootEtymonline(root, vocab, mapEntries(entries))
    const b = checkRootEtymonline(root, vocab, mapEntries(entries))
    expect(a).toEqual(b)
  })
})
