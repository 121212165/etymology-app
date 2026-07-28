import { describe, it, expect } from 'vitest'
import { buildCooccurrenceLinks, type CooccurInput } from '../cooccurrence-linker'

describe('buildCooccurrenceLinks', () => {
  it('links two words sharing a rare part', () => {
    const input: CooccurInput = {
      words: [
        { index: 0, parts: [{ type: 'root', text: 'port', meaning: '携带' }] },
        { index: 1, parts: [{ type: 'root', text: 'port', meaning: '携带' }] },
      ],
      partFrequency: { 'root:port': 2 }
    }

    const links = buildCooccurrenceLinks(input, 0.1)
    expect(links).toEqual([
      { from: 0, to: 1, partText: 'port', partType: 'root', weight: 0.5 }
    ])
  })

  it('does NOT link words sharing a frequent part (ion, ing, etc.)', () => {
    const input: CooccurInput = {
      words: [
        { index: 0, parts: [{ type: 'suffix', text: 'ion', meaning: '行为' }] },
        { index: 1, parts: [{ type: 'suffix', text: 'ion', meaning: '行为' }] },
      ],
      partFrequency: { 'suffix:ion': 500 }
    }

    const links = buildCooccurrenceLinks(input, 0.1)
    expect(links).toEqual([])
  })

  it('links multiple words through the same rare part', () => {
    const input: CooccurInput = {
      words: [
        { index: 0, parts: [{ type: 'root', text: 'spect', meaning: '看' }] },
        { index: 1, parts: [{ type: 'root', text: 'spect', meaning: '看' }] },
        { index: 2, parts: [{ type: 'root', text: 'spect', meaning: '看' }] },
      ],
      partFrequency: { 'root:spect': 3 }
    }

    const links = buildCooccurrenceLinks(input, 0.1)
    expect(links).toHaveLength(3)
    expect(links.every(l => l.weight > 0.1)).toBe(true)
  })

  it('deduplicates symmetric links (only keeps from < to)', () => {
    const input: CooccurInput = {
      words: [
        { index: 0, parts: [{ type: 'root', text: 'port', meaning: '携带' }] },
        { index: 1, parts: [{ type: 'root', text: 'port', meaning: '携带' }] },
      ],
      partFrequency: { 'root:port': 2 }
    }

    const links = buildCooccurrenceLinks(input, 0.1)
    expect(links).toHaveLength(1)
    expect(links[0].from).toBe(0)
    expect(links[0].to).toBe(1)
  })
})
