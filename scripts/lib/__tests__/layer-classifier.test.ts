import { describe, it, expect } from 'vitest'
import { classifyLayer, LAYER_CORE, LAYER_MIDDLE, LAYER_EDGE } from '../layer-classifier'

describe('classifyLayer', () => {
  it('classifies core layer (>= 10 words)', () => {
    expect(classifyLayer(10)).toBe(LAYER_CORE)
    expect(classifyLayer(30)).toBe(LAYER_CORE)
  })

  it('classifies middle layer (4-9 words)', () => {
    expect(classifyLayer(4)).toBe(LAYER_MIDDLE)
    expect(classifyLayer(9)).toBe(LAYER_MIDDLE)
  })

  it('classifies edge layer (< 4 words)', () => {
    expect(classifyLayer(1)).toBe(LAYER_EDGE)
    expect(classifyLayer(3)).toBe(LAYER_EDGE)
  })

  it('handles zero words', () => {
    expect(classifyLayer(0)).toBe(LAYER_EDGE)
  })
})
