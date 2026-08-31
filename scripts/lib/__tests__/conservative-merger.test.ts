import { describe, it, expect } from 'vitest'
import { shouldMerge, mergeRoots, MERGE_BLACKLIST, type MergeInput } from '../conservative-merger'

describe('shouldMerge', () => {
  it('merges same meaning + same first letter + close edit distance', () => {
    expect(shouldMerge(
      { text: 'duc', meaning: '引导' },
      { text: 'duce', meaning: '引导' }
    )).toBe(true)
  })

  it('still merges long roots (>=5) at edit distance 2 (scribe/script)', () => {
    expect(shouldMerge(
      { text: 'scribe', meaning: '写' },
      { text: 'script', meaning: '写' }
    )).toBe(true)
  })

  it('merges short roots (<=4) at edit distance 2 (ceed/cess 合法变体)', () => {
    // 距离 2 的合法变体必须保持合并（ceed/cess/cede、duce/duct、tain/tent 同理）；
    // 误合并（fair/fic）由 MERGE_BLACKLIST 阻断而非收紧阈值
    expect(shouldMerge(
      { text: 'ceed', meaning: '走' },
      { text: 'cess', meaning: '走' }
    )).toBe(true)
  })

  it('does NOT merge different meanings', () => {
    expect(shouldMerge(
      { text: 'port', meaning: '携带' },
      { text: 'port', meaning: '港口' }
    )).toBe(false)
  })

  it('does NOT merge different first letters', () => {
    expect(shouldMerge(
      { text: 'cept', meaning: '拿' },
      { text: 'sum', meaning: '拿' }
    )).toBe(false)
  })

  it('does NOT merge edit distance > 2', () => {
    expect(shouldMerge(
      { text: 'cede', meaning: '走' },
      { text: 'gress', meaning: '走' }
    )).toBe(false)
  })
})

describe('MERGE_BLACKLIST', () => {
  it('contains "fair"', () => {
    expect(MERGE_BLACKLIST.has('fair')).toBe(true)
  })

  it('blocks merge even when all other conditions hold (fair/fain, distance 1)', () => {
    expect(shouldMerge(
      { text: 'fair', meaning: '做' },
      { text: 'fain', meaning: '做' }
    )).toBe(false)
    // 对照：同样的距离、不在黑名单时正常合并
    expect(shouldMerge(
      { text: 'gair', meaning: '做' },
      { text: 'gain', meaning: '做' }
    )).toBe(true)
  })
})

describe('mergeRoots', () => {
  it('groups mergeable roots together', () => {
    const input: MergeInput[] = [
      { text: 'duc', meaning: '引导', wordIndices: [1, 2] },
      { text: 'duce', meaning: '引导', wordIndices: [3] },
      { text: 'duct', meaning: '引导', wordIndices: [4, 5] },
      { text: 'port', meaning: '携带', wordIndices: [6, 7] },
      { text: 'act', meaning: '做', wordIndices: [8] },
    ]

    const groups = mergeRoots(input)
    expect(groups).toHaveLength(3)

    const guideGroup = groups.find(g => g.meaning === '引导')
    expect(guideGroup?.texts).toEqual(['duc', 'duce', 'duct'])
    expect(guideGroup?.wordIndices).toEqual([1, 2, 3, 4, 5])

    const carryGroup = groups.find(g => g.meaning === '携带')
    expect(carryGroup?.texts).toEqual(['port'])

    const doGroup = groups.find(g => g.meaning === '做')
    expect(doGroup?.texts).toEqual(['act'])
  })

  it('deduplicates word indices when merging', () => {
    const input: MergeInput[] = [
      { text: 'duc', meaning: '引导', wordIndices: [1, 2, 3] },
      { text: 'duce', meaning: '引导', wordIndices: [3, 4] },
    ]

    const groups = mergeRoots(input)
    expect(groups[0].wordIndices).toEqual([1, 2, 3, 4])
  })

  it('keeps blacklisted roots standalone (fair 不并入 fic/fect)', () => {
    const input: MergeInput[] = [
      { text: 'fic', meaning: '做', wordIndices: [1] },
      { text: 'fair', meaning: '做', wordIndices: [2] },
      { text: 'benefit', meaning: '好处', wordIndices: [3] },
    ]

    const groups = mergeRoots(input)
    const fairGroup = groups.find(g => g.texts.includes('fair'))
    expect(fairGroup?.texts).toEqual(['fair'])
    expect(fairGroup?.wordIndices).toEqual([2])
  })

  it('does not let blacklisted entries join a group transitively', () => {
    // fair-fail(1)-faic(1)-fic(1) 构成合并链；无黑名单时 fair 会经 fail 传递并入，
    // 黑名单在第一跳就阻断，fair 始终独立
    const input: MergeInput[] = [
      { text: 'fair', meaning: '做', wordIndices: [1] },
      { text: 'fail', meaning: '做', wordIndices: [2] },
      { text: 'faic', meaning: '做', wordIndices: [3] },
      { text: 'fic', meaning: '做', wordIndices: [4] },
    ]

    const groups = mergeRoots(input)
    expect(groups).toHaveLength(2)
    const fairGroup = groups.find(g => g.texts.includes('fair'))
    expect(fairGroup?.texts).toEqual(['fair'])
    expect(fairGroup?.wordIndices).toEqual([1])
    const chainGroup = groups.find(g => g.texts.includes('fic'))
    expect(chainGroup?.texts).toEqual(['fail', 'faic', 'fic'])
  })
})
