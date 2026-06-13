import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ObservePhase } from '@/components/train/ObservePhase'
import type { VocabEntry } from '@/lib/types'

vi.mock('@/components/train/RootNetwork', () => ({
  RootNetwork: ({ rootText, onClose }: { rootText: string; onClose: () => void }) => (
    <div data-testid="root-network">
      <span>RootNetwork: {rootText}</span>
      <button onClick={onClose}>close</button>
    </div>
  ),
}))

vi.mock('@/components/ui/SpeakButton', () => ({
  SpeakButton: ({ word }: { word: string }) => (
    <button data-testid="speak-button">Speak: {word}</button>
  ),
}))

const makeWords = (count: number): VocabEntry[] =>
  Array.from({ length: count }, (_, i) => ({
    word: `word${i + 1}`,
    definition: `definition of word${i + 1}`,
    parts: [
      { type: 'prefix' as const, text: `pre${i + 1}`, meaning: `前${i + 1}`, decomposed: false },
      { type: 'root' as const, text: `root${i + 1}`, meaning: `根${i + 1}`, decomposed: false },
      { type: 'suffix' as const, text: `suf${i + 1}`, meaning: `后${i + 1}`, decomposed: false },
    ],
  }))

describe('ObservePhase', () => {
  const words = makeWords(3)
  let onNext: ReturnType<typeof vi.fn>
  let onPhaseEnd: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onNext = vi.fn()
    onPhaseEnd = vi.fn()
  })

  afterEach(() => {
    cleanup()
  })

  describe('组件渲染', () => {
    it('显示当前单词', () => {
      render(<ObservePhase words={words} currentIndex={0} onNext={onNext} onPhaseEnd={onPhaseEnd} />)
      expect(screen.getByText('word1')).toBeInTheDocument()
    })

    it('渲染PartTags，每个part独立一行带颜色边框', () => {
      const { container } = render(
        <ObservePhase words={words} currentIndex={0} onNext={onNext} onPhaseEnd={onPhaseEnd} />
      )
      const partRows = container.querySelectorAll('[style*="border-left"]')
      expect(partRows.length).toBe(3)
      expect(partRows[0]).toHaveStyle({ borderLeft: '4px solid #E8A84C' })
      expect(partRows[1]).toHaveStyle({ borderLeft: '4px solid #5BB89A' })
      expect(partRows[2]).toHaveStyle({ borderLeft: '4px solid #9B8EC4' })
    })

    it('显示每个part的text和meaning', () => {
      render(<ObservePhase words={words} currentIndex={0} onNext={onNext} onPhaseEnd={onPhaseEnd} />)
      expect(screen.getAllByText('pre1').length).toBeGreaterThan(0)
      expect(screen.getAllByText('前1').length).toBeGreaterThan(0)
      expect(screen.getAllByText('root1').length).toBeGreaterThan(0)
      expect(screen.getAllByText('根1').length).toBeGreaterThan(0)
      expect(screen.getAllByText('suf1').length).toBeGreaterThan(0)
      expect(screen.getAllByText('后1').length).toBeGreaterThan(0)
    })

    it('显示释义', () => {
      render(<ObservePhase words={words} currentIndex={0} onNext={onNext} onPhaseEnd={onPhaseEnd} />)
      expect(screen.getByText('definition of word1')).toBeInTheDocument()
    })
  })

  describe('导航', () => {
    it('点击下一个按钮调用onNext', () => {
      render(<ObservePhase words={words} currentIndex={0} onNext={onNext} onPhaseEnd={onPhaseEnd} />)
      fireEvent.click(screen.getByText('下一个 →'))
      expect(onNext).toHaveBeenCalledTimes(1)
      expect(onPhaseEnd).not.toHaveBeenCalled()
    })

    it('最后一个词时按钮文字变为"进入猜词义 →"', () => {
      render(<ObservePhase words={words} currentIndex={2} onNext={onNext} onPhaseEnd={onPhaseEnd} />)
      expect(screen.getByText('进入猜词义 →')).toBeInTheDocument()
    })

    it('最后一个词点击调用onPhaseEnd', () => {
      render(<ObservePhase words={words} currentIndex={2} onNext={onNext} onPhaseEnd={onPhaseEnd} />)
      fireEvent.click(screen.getByText('进入猜词义 →'))
      expect(onPhaseEnd).toHaveBeenCalledTimes(1)
      expect(onNext).not.toHaveBeenCalled()
    })
  })

  describe('键盘', () => {
    it('按空格键触发onNext', () => {
      render(<ObservePhase words={words} currentIndex={0} onNext={onNext} onPhaseEnd={onPhaseEnd} />)
      fireEvent.keyDown(window, { code: 'Space' })
      expect(onNext).toHaveBeenCalledTimes(1)
      expect(onPhaseEnd).not.toHaveBeenCalled()
    })

    it('最后一个词按空格触发onPhaseEnd', () => {
      render(<ObservePhase words={words} currentIndex={2} onNext={onNext} onPhaseEnd={onPhaseEnd} />)
      fireEvent.keyDown(window, { code: 'Space' })
      expect(onPhaseEnd).toHaveBeenCalledTimes(1)
      expect(onNext).not.toHaveBeenCalled()
    })
  })

  describe('词根网络入口', () => {
    it('点击part.text展开RootNetwork组件', () => {
      render(<ObservePhase words={words} currentIndex={0} onNext={onNext} onPhaseEnd={onPhaseEnd} />)
      expect(screen.queryByTestId('root-network')).not.toBeInTheDocument()

      fireEvent.click(screen.getAllByText('root1')[0])
      expect(screen.getByTestId('root-network')).toBeInTheDocument()
      expect(screen.getByText('RootNetwork: root1')).toBeInTheDocument()
    })

    it('再次点击同一part收起RootNetwork', () => {
      render(<ObservePhase words={words} currentIndex={0} onNext={onNext} onPhaseEnd={onPhaseEnd} />)
      fireEvent.click(screen.getAllByText('root1')[0])
      expect(screen.getByTestId('root-network')).toBeInTheDocument()

      fireEvent.click(screen.getAllByText('root1')[0])
      expect(screen.queryByTestId('root-network')).not.toBeInTheDocument()
    })

    it('点击不同part切换展开内容', () => {
      render(<ObservePhase words={words} currentIndex={0} onNext={onNext} onPhaseEnd={onPhaseEnd} />)
      fireEvent.click(screen.getAllByText('pre1')[0])
      expect(screen.getByText('RootNetwork: pre1')).toBeInTheDocument()

      fireEvent.click(screen.getAllByText('suf1')[0])
      expect(screen.getByText('RootNetwork: suf1')).toBeInTheDocument()
    })
  })
})
