// scripts/lib/__tests__/xcheck-merge.test.ts
import { describe, it, expect } from 'vitest'
import { mergeReports, type SourcePartialReport } from '../xcheck-merge'
import type { RootCheckResult, WordCheckResult } from '../../../src/lib/xcheck/types'

function rootOf(text: string, status: RootCheckResult['status'], evidence = ''): RootCheckResult {
  return {
    text,
    layer: 'core',
    meaning: '测试义',
    status,
    evidence: status === 'not_found' ? '' : evidence,
    source: status === 'not_found' ? '' : text,
    classicalHits: status === 'confirmed' ? 1 : 0,
    romanceHits: 0,
    nonClassicalEvidence: [],
    sampledWords: 2,
  }
}

function wordOf(root: string, word: string, status: WordCheckResult['status'], verdict: WordCheckResult['meaningVerdict']): WordCheckResult {
  return { word, root, status, detail: `d(${root}/${word})`, meaningVerdict: verdict }
}

function partial(
  source: SourcePartialReport['source'],
  roots: RootCheckResult[],
  words: WordCheckResult[],
): SourcePartialReport {
  return {
    source,
    sourceInfo: { id: source, description: source, version: 't', license: 't', origin: 't' },
    runStatus: { id: source, ok: true, note: 'ok' },
    roots,
    words,
    methodNotes: [`${source} 注`],
  }
}

describe('mergeReports', () => {
  const p1 = partial('etymwn',
    [rootOf('vis', 'confirmed', 'visio 命中'), rootOf('hund', 'conflict'), rootOf('zzq', 'not_found')],
    [wordOf('vis', 'vision', 'confirmed', 'unverified'), wordOf('hund', 'hound', 'conflict', 'unverified')],
  )
  const p2 = partial('wiktionary',
    [rootOf('vis', 'confirmed', 'wikt 证据'), rootOf('hund', 'not_found'), rootOf('zzq', 'not_found')],
    [wordOf('vis', 'vision', 'not_found', 'unverified'), wordOf('hund', 'hound', 'not_found', 'unverified')],
  )
  const p3 = partial('etymonline',
    [rootOf('vis', 'not_found'), rootOf('hund', 'conflict'), rootOf('zzq', 'not_found')],
    [wordOf('vis', 'vision', 'confirmed', 'match'), wordOf('hund', 'hound', 'not_found', 'unverified')],
  )

  const merged = mergeReports([p1, p2, p3])

  it('词根取任一源最高结论；evidence 只保留确认源', () => {
    const vis = merged.roots.find((r) => r.text === 'vis')!
    expect(vis.status).toBe('confirmed')
    expect(vis.source).toBe('etymwn,wiktionary') // 两源确认
    expect(vis.evidence).toContain('【etymwn】')
    expect(vis.evidence).toContain('【wiktionary】')
    expect(vis.evidence).not.toContain('etymonline')

    const hund = merged.roots.find((r) => r.text === 'hund')!
    expect(hund.status).toBe('conflict')
    expect(hund.source).toBe('etymwn,etymonline')

    const zzq = merged.roots.find((r) => r.text === 'zzq')!
    expect(zzq.status).toBe('not_found')
    expect(zzq.source).toBe('')
  })

  it('词级结论与词义机判取最优（match > mismatch > unverified）', () => {
    const vision = merged.words.find((w) => w.word === 'vision')!
    expect(vision.status).toBe('confirmed')
    expect(vision.meaningVerdict).toBe('match')
    expect(vision.detail).toContain('【etymonline】')
    const hound = merged.words.find((w) => w.word === 'hound')!
    expect(hound.status).toBe('conflict')
  })

  it('summary 汇总正确（含分层与机判统计）', () => {
    expect(merged.summary.rootTotal).toBe(3)
    expect(merged.summary.confirmed).toBe(1)
    expect(merged.summary.conflict).toBe(1)
    expect(merged.summary.notFound).toBe(1)
    expect(merged.summary.layerBreakdown[0]).toEqual({ layer: 'core', confirmed: 1, notFound: 1, conflict: 1 })
    expect(merged.summary.wordsChecked).toBe(1)
    expect(merged.summary.wordMismatch).toBe(0)
  })

  it('sources/sourceStatus/methodNotes 齐备且合并规则可追溯', () => {
    expect(merged.sources).toHaveLength(3)
    expect(merged.sourceStatus).toHaveLength(3)
    expect(merged.methodNotes.some((n) => n.includes('合并规则'))).toBe(true)
    expect(merged.methodNotes.some((n) => n.includes('etymwn'))).toBe(true)
  })

  it('确定性：同输入两次合并 deep-equal', () => {
    expect(mergeReports([p1, p2, p3])).toEqual(merged)
  })
})
