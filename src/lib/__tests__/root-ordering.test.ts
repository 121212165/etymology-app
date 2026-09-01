// src/lib/__tests__/root-ordering.test.ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  orderRoots,
  getOrderedRoots,
  assignTheme,
  findUnfixableConfusables,
  THEMES,
  OTHER_THEME,
} from '../root-ordering'
import { CONFUSABLE_ROOTS } from '../confusables'
import type { MindMapData, EnhancedRootNode } from '../mindmap-types'

// 真实数据：569 词根，直接从 public/data 读取（与 SSR 同源）
const dataDir = join(process.cwd(), 'public', 'data')
const realData: MindMapData = JSON.parse(
  readFileSync(join(dataDir, 'enhanced-roots.json'), 'utf-8')
)

function fixture(overrides: Partial<EnhancedRootNode> & { primaryText: string }): EnhancedRootNode {
  return { aliases: [], meaning: '', layer: 'core', wordCount: 1, wordIndices: [], ...overrides }
}

const sample: EnhancedRootNode[] = [
  fixture({ primaryText: 'act', meaning: '做，行动', wordCount: 11 }),
  fixture({ primaryText: 'spect', meaning: '看', wordCount: 9 }),
  fixture({ primaryText: 'vis', meaning: '看', wordCount: 8 }),
  fixture({ primaryText: 'port', meaning: '携带', wordCount: 12 }),
  fixture({ primaryText: 'fer', meaning: '携带', wordCount: 7 }),
  fixture({ primaryText: 'cid', meaning: '切', wordCount: 5 }),
  fixture({ primaryText: 'sid', meaning: '坐', wordCount: 5 }),
  fixture({ primaryText: 'zzz', meaning: '未知莫测词', wordCount: 2 }),
]

describe('assignTheme', () => {
  it('按关键词把词义归入主题', () => {
    expect(assignTheme(fixture({ primaryText: 'act', meaning: '做，行动' })).key).toBe('action')
    expect(assignTheme(fixture({ primaryText: 'vis', meaning: '看' })).key).toBe('sight')
    expect(assignTheme(fixture({ primaryText: 'ition', meaning: '行为' })).key).toBe('affix')
    expect(assignTheme(fixture({ primaryText: 'not', meaning: '不' })).key).toBe('affix')
  })

  it('未命中任何主题时归入其他', () => {
    expect(assignTheme(fixture({ primaryText: 'zzz', meaning: '未知莫测词' }))).toBe(OTHER_THEME)
  })
})

describe('orderRoots（fixture）', () => {
  it('主题成连续区段且其他垫尾', () => {
    const ordered = orderRoots(sample)
    const keys = ordered.map((r) => assignTheme(r).key)
    // 其他组（zzz）必须在最后
    expect(keys[keys.length - 1]).toBe('other')
    // 每个主题的成员连续（其他组除外允许垫尾一段）
    for (const theme of THEMES) {
      const idx = keys.map((k, i) => (k === theme.key ? i : -1)).filter((i) => i >= 0)
      if (idx.length > 1) {
        expect(idx[idx.length - 1] - idx[0] + 1).toBe(idx.length)
      }
    }
  })

  it('同主题高产词根靠前', () => {
    const ordered = orderRoots(sample)
    const action = ordered.filter((r) => r.meaning.includes('做'))
    expect(action[0].primaryText).toBe('act') // wordCount 11 > 1
  })

  it('易混词根不相邻（cid/sid 同组时错开）', () => {
    const ordered = orderRoots(sample)
    const texts = ordered.map((r) => r.primaryText)
    // cid 与 sid 同为 wordCount 5 且都命中 break/body 不同主题——构造同组场景单独验证
    const pair = [fixture({ primaryText: 'cid', meaning: '切' }), fixture({ primaryText: 'sid', meaning: '切' })]
    const pairOrdered = orderRoots(pair)
    // 两元素组无法错开，属不可修复对；三元素组验证交换逻辑
    const trio = [
      fixture({ primaryText: 'cid', meaning: '切' }),
      fixture({ primaryText: 'sid', meaning: '切' }),
      fixture({ primaryText: 'tom', meaning: '切割' }),
    ]
    const trioTexts = orderRoots(trio).map((r) => r.primaryText)
    expect(pairOrdered).toHaveLength(2)
    expect(trioTexts.join(',')).not.toMatch(/cid,sid|sid,cid/)
    expect(texts).toBeDefined()
  })
})

describe('orderRoots（真实 569 词根数据）', () => {
  const ordered = getOrderedRoots(realData)

  it('完备性：与原数据是同集合排列（无遗漏、无重复）', () => {
    expect(ordered).toHaveLength(realData.roots.length)
    const orig = realData.roots.map((r) => r.primaryText).sort()
    const sorted = ordered.map((r) => r.primaryText).sort()
    expect(sorted).toEqual(orig)
  })

  it('确定性：两次调用结果一致', () => {
    expect(getOrderedRoots(realData)).toEqual(ordered)
  })

  it('策展易混对全库不相邻', () => {
    const texts = ordered.map((r) => r.primaryText)
    for (let i = 1; i < texts.length; i++) {
      const pair = [texts[i - 1], texts[i]].sort().join('|')
      const allPairs = new Set(
        Object.entries(CONFUSABLE_ROOTS).flatMap(([from, entries]) =>
          entries.map((e) => [from, e.text].sort().join('|'))
        )
      )
      expect(allPairs.has(pair)).toBe(false)
    }
    // 不可修复对应为空（若策展数据新增无法错开的孤立对，请在此登记说明）
    expect(findUnfixableConfusables(realData.roots)).toEqual([])
  })

  it('主题区段在全库连续', () => {
    const keys = ordered.map((r) => assignTheme(r).key)
    for (const theme of THEMES) {
      const idx = keys.map((k, i) => (k === theme.key ? i : -1)).filter((i) => i >= 0)
      if (idx.length > 1) {
        expect(idx[idx.length - 1] - idx[0] + 1).toBe(idx.length)
      }
    }
  })

  it('分层视图同样满足完备与确定性（getCoreRoots/getMiddleRoots 消费路径）', () => {
    for (const layer of ['core', 'middle', 'edge'] as const) {
      const layerRoots = realData.roots.filter((r) => r.layer === layer)
      const once = orderRoots(layerRoots)
      expect(orderRoots(layerRoots)).toEqual(once)
      expect(once.map((r) => r.primaryText).sort()).toEqual(
        layerRoots.map((r) => r.primaryText).sort()
      )
    }
  })
})
