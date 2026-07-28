import { describe, it, expect } from 'vitest'
import { shouldMerge, mergeRoots, type MergeInput } from '../conservative-merger'

describe('shouldMerge', () => {
  it('merges same meaning + same first letter + close edit distance', () => {
    expect(shouldMerge(
      { text: 'duc', meaning: '引导' },
      { text: 'duce', meaning: '引导' }
    )).toBe(true)
  })

  it('merges ceed/cess (both "走", edit distance 2)', () => {
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
})
