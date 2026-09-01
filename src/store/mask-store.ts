// src/store/mask-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 释义遮罩难度档位（第二版需求：大页面默认遮释义，空格揭示，难度可调；
 * 个人中心上线后此设置迁入账号体系）：
 * - off  无遮罩，传统浏览模式
 * - easy 遮释义，构词拆解可见（提示式自测）
 * - hard 遮释义 + 构词拆解，只留单词与发音（硬核自测）
 */
export type MaskLevel = 'off' | 'easy' | 'hard'

export const MASK_LEVEL_ORDER: MaskLevel[] = ['off', 'easy', 'hard']

interface MaskState {
  maskLevel: MaskLevel
  setMaskLevel: (level: MaskLevel) => void
  cycleMaskLevel: () => void
}

export const useMaskStore = create<MaskState>()(
  persist(
    (set, get) => ({
      maskLevel: 'easy',
      setMaskLevel: (level) => set({ maskLevel: level }),
      cycleMaskLevel: () => {
        const idx = MASK_LEVEL_ORDER.indexOf(get().maskLevel)
        set({ maskLevel: MASK_LEVEL_ORDER[(idx + 1) % MASK_LEVEL_ORDER.length] })
      },
    }),
    { name: 'linxu-mask' }
  )
)
