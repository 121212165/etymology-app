import { describe, it, expect } from 'vitest'
import {
  parseNdjson,
  normalizeWord,
  dedupeWords,
  sortEntries,
  computeIntersection,
  type KaoYanRawEntry,
  type KaoYanEntry,
} from '../kaoyan'

/** 构造一条源记录的最小 fixture（只含本管线用到的字段） */
function raw(word: string, trans: { tranCn?: string; pos?: string }[]): KaoYanRawEntry {
  return {
    wordRank: 1,
    headWord: word,
    content: { word: { wordHead: word, content: { trans } } },
  }
}

describe('parseNdjson', () => {
  it('parses one JSON object per line and skips empty lines', () => {
    const input = [
      JSON.stringify(raw('act', [{ tranCn: '行动', pos: 'n' }])),
      '',
      '   ',
      JSON.stringify(raw('action', [{ tranCn: '行动', pos: 'n' }])),
    ].join('\n')
    const entries = parseNdjson(input)
    expect(entries).toHaveLength(2)
    expect(entries[0].headWord).toBe('act')
    expect(entries[1].headWord).toBe('action')
  })

  it('handles CRLF line endings', () => {
    const input = JSON.stringify(raw('act', [{ tranCn: '行动' }])) + '\r\n'
    expect(parseNdjson(input)).toHaveLength(1)
  })

  it('throws with the line number for malformed lines', () => {
    const input = [
      JSON.stringify(raw('act', [{ tranCn: '行动' }])),
      '{"wordRank":2,"headWord":"broken', // 截断的行
    ].join('\n')
    expect(() => parseNdjson(input)).toThrowError(/第 2 行/)
  })

  it('returns empty array for blank input', () => {
    expect(parseNdjson('\n\n  \n')).toEqual([])
  })
})

describe('normalizeWord', () => {
  it('joins multiple trans with "；" and unique pos values with "/"', () => {
    const entry = normalizeWord(
      raw('paragraph', [
        { tranCn: '段落；短评', pos: 'n' },
        { tranCn: '将…分段', pos: 'v' },
        { tranCn: '分段', pos: 'n' },
      ]),
    )
    expect(entry).toEqual<KaoYanEntry>({
      word: 'paragraph',
      pos: 'n/v',
      tran: '段落；短评；将…分段；分段',
      book: 'kaoyan',
    })
  })

  it('omits pos when no source trans has pos', () => {
    const entry = normalizeWord(raw('act', [{ tranCn: '行动' }]))
    expect(entry).toEqual<KaoYanEntry>({ word: 'act', tran: '行动', book: 'kaoyan' })
  })

  it('trims whitespace around word and translations', () => {
    const entry = normalizeWord(raw(' act ', [{ tranCn: ' 行动 ' }]))
    expect(entry?.word).toBe('act')
    expect(entry?.tran).toBe('行动')
  })

  it('returns null when the word is missing', () => {
    expect(normalizeWord(raw('', [{ tranCn: '行动' }]))).toBeNull()
    expect(normalizeWord(raw('   ', [{ tranCn: '行动' }]))).toBeNull()
  })

  it('returns null when there is no usable Chinese translation', () => {
    expect(normalizeWord(raw('act', []))).toBeNull()
    expect(normalizeWord(raw('act', [{ tranCn: '  ' }, { pos: 'n' }]))).toBeNull()
    expect(normalizeWord(raw('act', [{ tranCn: '', pos: 'n' }]))).toBeNull()
  })
})

describe('dedupeWords', () => {
  it('keeps the entry with the fullest tran across books', () => {
    const result = dedupeWords([
      {
        bookFile: 'KaoYan_1.json',
        entries: [{ word: 'action', tran: '行动', book: 'kaoyan' }],
      },
      {
        bookFile: 'KaoYan_2.json',
        entries: [{ word: 'action', tran: '行动；动作；作用', book: 'kaoyan' }],
      },
    ])
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].tran).toBe('行动；动作；作用')
    expect(result.duplicatesMerged).toBe(1)
  })

  it('breaks ties by book order (earlier book wins)', () => {
    const tran = '行动'
    const result = dedupeWords([
      { bookFile: 'KaoYan_1.json', entries: [{ word: 'act', tran, book: 'kaoyan' }] },
      { bookFile: 'KaoYan_2.json', entries: [{ word: 'act', tran, book: 'kaoyan' }] },
    ])
    expect(result.entries[0].tran).toBe(tran)
    expect(result.duplicatesMerged).toBe(1)
  })

  it('keeps words that appear in only one book', () => {
    const result = dedupeWords([
      { bookFile: 'KaoYan_1.json', entries: [{ word: 'act', tran: '行动', book: 'kaoyan' }] },
      { bookFile: 'KaoYan_2.json', entries: [{ word: 'bare', tran: '赤裸的', book: 'kaoyan' }] },
    ])
    expect(result.entries).toHaveLength(2)
    expect(result.duplicatesMerged).toBe(0)
  })
})

describe('sortEntries', () => {
  it('sorts by code-unit order deterministically (uppercase before lowercase)', () => {
    const entries: KaoYanEntry[] = [
      { word: 'march', tran: '行军', book: 'kaoyan' },
      { word: 'March', tran: '三月', book: 'kaoyan' },
      { word: 'act', tran: '行动', book: 'kaoyan' },
    ]
    const sorted = sortEntries(entries)
    expect(sorted.map(e => e.word)).toEqual(['March', 'act', 'march'])
    // 不改动原数组
    expect(entries.map(e => e.word)).toEqual(['march', 'March', 'act'])
  })
})

describe('computeIntersection', () => {
  it('counts overlap, rates and added words', () => {
    const stats = computeIntersection(
      ['act', 'action', 'bare', 'zeitgeist'],
      ['act', 'bare', 'cat'],
    )
    expect(stats.total).toBe(4)
    expect(stats.overlap).toBe(2)
    expect(stats.overlapRate).toBeCloseTo(0.5)
    expect(stats.vocabCoverage).toBeCloseTo(2 / 3)
    expect(stats.added).toBe(2)
  })

  it('matches case-sensitively', () => {
    const stats = computeIntersection(['March'], ['march'])
    expect(stats.overlap).toBe(0)
    expect(stats.added).toBe(1)
  })

  it('deduplicates repeated words before counting', () => {
    const stats = computeIntersection(['act', 'act'], ['act', 'act', 'dog'])
    expect(stats.total).toBe(1)
    expect(stats.overlap).toBe(1)
    expect(stats.added).toBe(0)
  })

  it('returns zeroed stats for an empty kaoyan list', () => {
    const stats = computeIntersection([], ['act'])
    expect(stats.total).toBe(0)
    expect(stats.overlap).toBe(0)
    expect(stats.overlapRate).toBe(0)
    expect(stats.added).toBe(0)
  })
})
