import { describe, it, expect } from 'vitest'
import { editDistance } from '../edit-distance'

describe('editDistance', () => {
  it('returns 0 for identical strings', () => {
    expect(editDistance('act', 'act')).toBe(0)
  })

  it('returns length for empty vs non-empty', () => {
    expect(editDistance('', 'act')).toBe(3)
  })

  it('computes Levenshtein distance correctly', () => {
    expect(editDistance('ceed', 'cess')).toBe(2)
    // 'cept' -> 'ceive': match 'ce', then 'pt' -> 'ive' (2 subs + 1 ins) = 3
    expect(editDistance('cept', 'ceive')).toBe(3)
    expect(editDistance('duc', 'duce')).toBe(1)
    expect(editDistance('cap', 'cept')).toBe(2)
  })

  it('is symmetric', () => {
    expect(editDistance('cede', 'ced')).toBe(editDistance('ced', 'cede'))
  })
})
