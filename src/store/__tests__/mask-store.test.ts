// src/store/__tests__/mask-store.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useMaskStore, MASK_LEVEL_ORDER } from '../mask-store'

describe('mask-store', () => {
  beforeEach(() => {
    useMaskStore.setState({ maskLevel: 'easy' })
  })

  it('defaults to easy (遮释义)', () => {
    expect(useMaskStore.getState().maskLevel).toBe('easy')
  })

  it('cycles off → easy → hard → off', () => {
    const { cycleMaskLevel } = useMaskStore.getState()
    useMaskStore.setState({ maskLevel: 'off' })
    cycleMaskLevel()
    expect(useMaskStore.getState().maskLevel).toBe('easy')
    cycleMaskLevel()
    expect(useMaskStore.getState().maskLevel).toBe('hard')
    cycleMaskLevel()
    expect(useMaskStore.getState().maskLevel).toBe('off')
  })

  it('covers the full level order', () => {
    expect(MASK_LEVEL_ORDER).toEqual(['off', 'easy', 'hard'])
  })

  it('sets a level directly', () => {
    useMaskStore.getState().setMaskLevel('hard')
    expect(useMaskStore.getState().maskLevel).toBe('hard')
  })
})
