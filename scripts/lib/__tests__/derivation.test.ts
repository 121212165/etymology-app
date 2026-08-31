import { describe, it, expect } from 'vitest'
import { buildDerivations, outerSuffix, type Derivation } from '../derivation'
import type { VocabEntry } from '../../../src/lib/types'

function entry(word: string, parts: VocabEntry['parts']): VocabEntry {
  return { word, definition: '', parts }
}

describe('outerSuffix', () => {
  it('returns the trailing suffix part', () => {
    expect(
      outerSuffix([
        { type: 'root', text: 'fer', meaning: '携带' },
        { type: 'suffix', text: 'ity', meaning: '性质' },
      ])?.text
    ).toBe('ity')
  })

  it('returns null when the word does not end with a suffix', () => {
    expect(
      outerSuffix([{ type: 'root', text: 'fer', meaning: '携带' }])
    ).toBeNull()
  })
})

describe('buildDerivations', () => {
  const vocab: VocabEntry[] = [
    entry('fertility', [
      { type: 'root', text: 'fer', meaning: '携带' },
      { type: 'linker', text: 'til', meaning: '连接字母' },
      { type: 'suffix', text: 'ity', meaning: '性质' },
    ]),
    entry('fertile', [{ type: 'root', text: 'fertile', meaning: '肥沃的' }]),
    entry('accessibility', [
      { type: 'prefix', text: 'ad', surface: 'ac', meaning: '' },
      { type: 'root', text: 'cess', meaning: '走' },
      { type: 'suffix', text: 'ible', meaning: '能够' },
      { type: 'suffix', text: 'ity', meaning: '性质' },
    ]),
    entry('accessible', [
      { type: 'prefix', text: 'ad', surface: 'ac', meaning: '' },
      { type: 'root', text: 'cess', meaning: '走' },
      { type: 'suffix', text: 'ible', meaning: '能够' },
    ]),
    entry('cats', [{ type: 'suffix', text: 's', meaning: '复数' }]),
    entry('cat', [{ type: 'root', text: 'cat', meaning: '猫' }]),
    entry('access', [
      { type: 'prefix', text: 'ad', surface: 'ac', meaning: '' },
      { type: 'root', text: 'cess', meaning: '走' },
    ]),
    entry('happiness', [
      { type: 'root', text: 'happy', meaning: '快乐的' },
      { type: 'suffix', text: 'ness', meaning: '状态' },
    ]),
    entry('happy', [{ type: 'root', text: 'happy', meaning: '快乐的' }]),
  ]

  it('derives fertility → fertile (stem + e repair)', () => {
    const d = buildDerivations(vocab)
    expect(d.get('fertility')).toEqual<Derivation>({ stemWord: 'fertile', suffix: 'ity' })
  })

  it('derives accessibility → accessible (outermost suffix wins)', () => {
    const d = buildDerivations(vocab)
    expect(d.get('accessibility')).toEqual<Derivation>({ stemWord: 'accessible', suffix: 'ity' })
  })

  it('derives accessible → access (base word)', () => {
    const d = buildDerivations(vocab)
    expect(d.get('accessible')).toEqual<Derivation>({ stemWord: 'access', suffix: 'ible' })
  })

  it('derives single-suffix-part words (cats → cat)', () => {
    const d = buildDerivations(vocab)
    expect(d.get('cats')).toEqual<Derivation>({ stemWord: 'cat', suffix: 's' })
  })

  it('repairs i→y (happiness → happy)', () => {
    const d = buildDerivations(vocab)
    expect(d.get('happiness')).toEqual<Derivation>({ stemWord: 'happy', suffix: 'ness' })
  })

  it('does not derive words whose stem is not in the vocab', () => {
    const d = buildDerivations(vocab)
    expect(d.has('fertile')).toBe(false)
  })

  it('never maps a word to itself', () => {
    const d = buildDerivations(vocab)
    for (const [word, der] of d) expect(word).not.toBe(der.stemWord)
  })
})
