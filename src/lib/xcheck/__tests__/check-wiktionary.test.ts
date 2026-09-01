// Wiktionary 交叉校验逻辑测试：自造小样本 fixture（不读 .cache），覆盖判定规则全分支

import { describe, expect, it } from 'vitest'
import { collectAncestors, type EtymonHit, type EtymwnIndex } from '../etymwn'
import {
  checkRootWiktionary,
  classifyFamily,
  expandFrontier,
  findRootMatches,
  isGermanicPure,
  WIKT_MAX_DEPTH,
  type WordAncestry,
} from '../check-wiktionary'
import type { RootEntry, VocabEntryLike } from '../types'

// ────────────────────────── fixtures ──────────────────────────

/** 手造索引：结构与 ety-wiktionary 转码一致 { [lang]: { [word]: [{ 词源形态: 语言 }] } }，方向为派生词→词源词 */
const index: EtymwnIndex = {
  eng: {
    vision: [{ visio: 'lat' }],
    action: [{ accion: 'enm' }],
    portable: [{ portable: 'fra' }, { portatile: 'ita' }],
    passage: [{ passage: 'fro' }],
    wight: [{ wiht: 'ang' }],
    respect: [{ respectus: 'lat' }],
    unrelated: [],
  },
  lat: {
    // visio 无词条：模拟真实数据集的稀疏中间形态（词源链在 2 跳内断掉）
    visio: [],
    respectus: [{ specere: 'lat' }],
    acta: [],
  },
  enm: { accion: [{ acte: 'fro' }] },
  fro: { acte: [{ acta: 'lat' }], passage: [] },
  ita: {},
  ang: { wiht: [{ wiht: 'p_gem' }] },
  p_gem: { wiht: [] },
}

const vocab: VocabEntryLike[] = [
  { word: 'vision', definition: '视力', parts: [{ type: 'root', text: 'vis', meaning: '看' }] },
  { word: 'action', definition: '行动', parts: [{ type: 'root', text: 'act', meaning: '做' }] },
  { word: 'portable', definition: '便携的', parts: [{ type: 'root', text: 'port', meaning: '携带' }] },
  { word: 'passage', definition: '通道', parts: [{ type: 'root', text: 'pass', meaning: '通过' }] },
  { word: 'wight', definition: '人', parts: [{ type: 'root', text: 'wer', meaning: '人' }] },
  { word: 'respect', definition: '尊敬', parts: [{ type: 'root', text: 'spect', meaning: '看' }] },
  { word: 'unrelated', definition: '无关', parts: [{ type: 'root', text: 'zzz', meaning: '无' }] },
]

function makeRoot(primaryText: string, wordIndex: number, aliases: string[] = []): RootEntry {
  return { primaryText, aliases, meaning: '测试义', layer: 'core', wordIndices: [wordIndex], wordCount: 1 }
}

/** 用 fixture 索引对单个抽样词跑 BFS（真实数据集方向：派生词→词源词），组装 ancByWord */
function ancestry(word: string): Map<string, WordAncestry> {
  const present = index.eng?.[word] !== undefined
  return new Map<string, WordAncestry>([
    [word, { hits: present ? collectAncestors(index, 'eng', word, WIKT_MAX_DEPTH) : [], present }],
  ])
}

/** 未收录词条：present=false（真实数据集约 1/3 抽样词属此类） */
function absent(word: string): Map<string, WordAncestry> {
  return new Map<string, WordAncestry>([[word, { hits: [], present: false }]])
}

// ────────────────────────── 家族归类 ──────────────────────────

describe('classifyFamily', () => {
  it('古典语（含 p_lat/p_grc）', () => {
    expect(classifyFamily('lat')).toBe('classical')
    expect(classifyFamily('grc')).toBe('classical')
    expect(classifyFamily('p_lat')).toBe('classical')
    expect(classifyFamily('p_grc')).toBe('classical')
  })
  it('罗曼语 / 日耳曼语族（含原始日耳曼语键）/ 其他', () => {
    expect(classifyFamily('fro')).toBe('romance')
    expect(classifyFamily('fra')).toBe('romance')
    expect(classifyFamily('ita')).toBe('romance')
    expect(classifyFamily('ang')).toBe('germanic')
    expect(classifyFamily('enm')).toBe('germanic')
    expect(classifyFamily('p_gem')).toBe('germanic')
    expect(classifyFamily('p_gmw')).toBe('germanic')
    expect(classifyFamily('hun')).toBe('other')
    expect(classifyFamily('sux')).toBe('other')
  })
})

// ────────────────────────── 形态匹配 ──────────────────────────

describe('findRootMatches', () => {
  it('强度≥2 才保留；同强度古典语优先、深度浅优先', () => {
    const hits: EtymonHit[] = [
      { lang: 'enm', form: 'accion', depth: 1 },
      { lang: 'fro', form: 'action', depth: 2 },
      { lang: 'lat', form: 'action', depth: 3 },
    ]
    const matches = findRootMatches(['act'], hits, 'action')
    // fro 与 lat 同形态同强度：古典语在前
    expect(matches.map((m) => `${m.lang}:${m.form}`)).toEqual(['lat:action', 'fro:action'])
    expect(matches[0].strength).toBe(3)
    expect(matches[0].depth).toBe(3)
  })
  it('别名形态参与匹配并记录 rootForm', () => {
    const matches = findRootMatches(['spect', 'spec'], [{ lang: 'lat', form: 'specere', depth: 2 }], 'respect')
    expect(matches).toHaveLength(1)
    expect(matches[0].rootForm).toBe('spec')
    expect(matches[0].strength).toBe(3)
  })
})

describe('isGermanicPure', () => {
  it('全日耳曼且无古典/罗曼 → true；混入古典/罗曼 → false；空 → false', () => {
    expect(isGermanicPure([{ lang: 'ang', form: 'wiht', depth: 1 }])).toBe(true)
    expect(
      isGermanicPure([
        { lang: 'ang', form: 'a', depth: 1 },
        { lang: 'lat', form: 'b', depth: 2 },
      ]),
    ).toBe(false)
    expect(isGermanicPure([{ lang: 'eng', form: 'self', depth: 1 }])).toBe(false)
    expect(isGermanicPure([])).toBe(false)
  })
})

// ────────────────────────── 词根级校验 ──────────────────────────

describe('checkRootWiktionary', () => {
  it('古典语深度1命中 → confirmed，证据可溯源', () => {
    const { root, words } = checkRootWiktionary(makeRoot('vis', 0), vocab, ancestry('vision'))
    expect(root.status).toBe('confirmed')
    expect(root.source).toBe('wiktionary')
    expect(root.classicalHits).toBe(1)
    expect(root.romanceHits).toBe(0)
    expect(root.evidence).toContain('eng:vision → lat:visio(深度1')
    expect(root.nonClassicalEvidence).toEqual([])
    expect(root.sampledWords).toBe(1)
    expect(root.text).toBe('vis')
    expect(words[0].status).toBe('confirmed')
    expect(words[0].detail).toBe('eng:vision → lat:visio(深度1)')
    expect(words[0].meaningVerdict).toBe('unverified')
    expect('gloss' in words[0]).toBe(false)
  })

  it('多跳谱系链（eng→enm→fro→lat 深度3）古典命中 → confirmed', () => {
    const { root, words } = checkRootWiktionary(makeRoot('act', 1), vocab, ancestry('action'))
    expect(root.status).toBe('confirmed')
    expect(root.classicalHits).toBe(1)
    expect(root.romanceHits).toBe(1)
    expect(root.evidence).toContain('lat:acta(深度3')
    // 词级 detail：古典优先于罗曼（同强度）
    expect(words[0].detail).toBe('eng:action → lat:acta(深度3)；eng:action → fro:acte(深度2)')
  })

  it('罗曼语双命中（间接证据）→ confirmed，classicalHits=0', () => {
    const { root } = checkRootWiktionary(makeRoot('port', 2), vocab, ancestry('portable'))
    expect(root.status).toBe('confirmed')
    expect(root.classicalHits).toBe(0)
    expect(root.romanceHits).toBe(2)
    expect(root.evidence).toContain('fra:portable(深度1')
    expect(root.evidence).toContain('ita:portatile(深度1')
  })

  it('罗曼语单命中不达标 → not_found（source/evidence 为空）', () => {
    const { root, words } = checkRootWiktionary(makeRoot('pass', 3), vocab, ancestry('passage'))
    expect(root.status).toBe('not_found')
    expect(root.source).toBe('')
    expect(root.evidence).toBe('')
    expect(root.classicalHits).toBe(0)
    expect(root.romanceHits).toBe(1)
    expect(words[0].status).toBe('not_found')
  })

  it('词源链全为日耳曼语族且无古典/罗曼命中 → conflict（词级+词根级）', () => {
    const { root, words } = checkRootWiktionary(makeRoot('wer', 4), vocab, ancestry('wight'))
    expect(words[0].status).toBe('conflict')
    expect(root.status).toBe('conflict')
    expect(root.source).toBe('wiktionary')
    expect(root.classicalHits).toBe(0)
    expect(root.romanceHits).toBe(0)
    expect(root.evidence).toContain('ang:wiht(深度1)')
    expect(root.nonClassicalEvidence).toEqual([
      'eng:wight → ang:wiht(深度1)',
      'eng:wight → p_gem:wiht(深度2)',
    ])
  })

  it('eng 词条未收录 → not_found，detail 注明；与 conflict 词混合时词根级不判 conflict', () => {
    const missing = checkRootWiktionary(makeRoot('vis', 0), vocab, absent('vision'))
    expect(missing.root.status).toBe('not_found')
    expect(missing.root.source).toBe('')
    expect(missing.words[0].status).toBe('not_found')
    expect(missing.words[0].detail).toBe('eng:vision 词条未收录，无词源路径可查')
    expect(missing.root.nonClassicalEvidence).toEqual([])

    // 一个抽样词未收录 + 另一个日耳曼纯链：词根级从保守，不判 conflict
    // （root 需带别名 spect 才能同时抽到 wight 的 part「wer」与 respect 的 part「spect」）
    const mixed = checkRootWiktionary(
      { primaryText: 'wer', aliases: ['spect'], meaning: '测试义', layer: 'core', wordIndices: [4, 5], wordCount: 2 },
      vocab,
      new Map<string, WordAncestry>([
        ['wight', { hits: collectAncestors(index, 'eng', 'wight', WIKT_MAX_DEPTH), present: true }],
        ['respect', { hits: [], present: false }],
      ]),
    )
    expect(mixed.words.map((w) => w.status)).toEqual(['conflict', 'not_found'])
    expect(mixed.root.status).toBe('not_found')
    expect(mixed.root.nonClassicalEvidence).toEqual(['eng:wight → ang:wiht(深度1)', 'eng:wight → p_gem:wiht(深度2)'])
  })

  it('词条存在但无词源链 → not_found「祖先0个」；无抽样词 → not_found 且 sampledWords=0', () => {
    const empty = checkRootWiktionary(makeRoot('zzz', 6), vocab, ancestry('unrelated'))
    expect(empty.root.status).toBe('not_found')
    expect(empty.root.sampledWords).toBe(1)
    expect(empty.words[0].detail).toBe('无词根形态命中；祖先0个')

    const none = checkRootWiktionary(makeRoot('nosample', 99), vocab, new Map())
    expect(none.root.status).toBe('not_found')
    expect(none.root.sampledWords).toBe(0)
    expect(none.words).toEqual([])
    expect(none.root.source).toBe('')
  })

  it('别名命中：spect 经 spec 匹配 lat:specere（强度3）', () => {
    const { root, words } = checkRootWiktionary(makeRoot('spect', 5, ['spec']), vocab, ancestry('respect'))
    expect(root.status).toBe('confirmed')
    expect(root.classicalHits).toBe(2)
    expect(root.evidence).toContain('lat:specere(深度2')
    expect(words[0].detail).toContain('lat:specere(深度2)')
  })

  it('确定性：同输入重跑输出一致', () => {
    const a = checkRootWiktionary(makeRoot('act', 1), vocab, ancestry('action'))
    const b = checkRootWiktionary(makeRoot('act', 1), vocab, ancestry('action'))
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})

// ────────────────────────── BFS 前沿扩展 ──────────────────────────

describe('expandFrontier', () => {
  it('沿「派生词→词源词」方向展开、跳过 expanded/自环、去重保序', () => {
    const idx: EtymwnIndex = {
      eng: { a: [{ b: 'lat' }, { c: 'fro' }, { a: 'eng' }] },
      lat: { b: [{ d: 'grc' }] },
    }
    const expanded = new Set(['eng:a'])
    const f1 = expandFrontier(idx, [{ lang: 'eng', form: 'a' }], expanded)
    expect(f1).toEqual([
      { lang: 'lat', form: 'b' },
      { lang: 'fro', form: 'c' },
    ])
    expanded.add('lat:b')
    expanded.add('fro:c')
    expect(expandFrontier(idx, f1, expanded)).toEqual([{ lang: 'grc', form: 'd' }])
  })
})
