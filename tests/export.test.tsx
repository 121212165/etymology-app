import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { TrainComplete } from '@/components/train/TrainComplete'

afterEach(cleanup)

const defaultProps = {
  groupLabel: '前缀 pre-',
  stats: {
    observeCount: 8,
    guessCorrect: 7,
    guessTotal: 10,
    decomposeCorrect: 6,
    decomposeTotal: 8,
  },
  onRestart: vi.fn(),
}

describe('TrainComplete', () => {
  describe('渲染', () => {
    it('显示组名', () => {
      render(<TrainComplete {...defaultProps} />)
      expect(screen.getByText(/前缀 pre-/)).toBeInTheDocument()
    })

    it('显示统计数字', () => {
      render(<TrainComplete {...defaultProps} />)
      expect(screen.getByText(/7\/10/)).toBeInTheDocument()
      expect(screen.getByText(/6\/8/)).toBeInTheDocument()
    })

    it('百分比计算正确', () => {
      render(<TrainComplete {...defaultProps} />)
      expect(screen.getByText(/70%/)).toBeInTheDocument()
      expect(screen.getByText(/75%/)).toBeInTheDocument()
    })
  })

  describe('操作按钮', () => {
    it('"返回首页"链接指向/', () => {
      render(<TrainComplete {...defaultProps} />)
      const link = screen.getByText('返回首页').closest('a')
      expect(link).toHaveAttribute('href', '/')
    })

    it('"再来一次"调用onRestart', () => {
      const onRestart = vi.fn()
      render(<TrainComplete {...defaultProps} onRestart={onRestart} />)
      fireEvent.click(screen.getByText('再来一次'))
      expect(onRestart).toHaveBeenCalledOnce()
    })
  })

  describe('统计准确性', () => {
    it('全对时显示100%', () => {
      render(
        <TrainComplete
          {...defaultProps}
          stats={{
            observeCount: 5,
            guessCorrect: 10,
            guessTotal: 10,
            decomposeCorrect: 8,
            decomposeTotal: 8,
          }}
        />
      )
      const percents = screen.getAllByText(/100%/)
      expect(percents.length).toBe(2)
    })

    it('全错时显示0%', () => {
      render(
        <TrainComplete
          {...defaultProps}
          stats={{
            observeCount: 5,
            guessCorrect: 0,
            guessTotal: 10,
            decomposeCorrect: 0,
            decomposeTotal: 8,
          }}
        />
      )
      const percents = screen.getAllByText(/0%/)
      expect(percents.length).toBe(2)
    })

    it('部分正确显示正确百分比', () => {
      render(
        <TrainComplete
          {...defaultProps}
          stats={{
            observeCount: 3,
            guessCorrect: 3,
            guessTotal: 7,
            decomposeCorrect: 1,
            decomposeTotal: 4,
          }}
        />
      )
      expect(screen.getByText(/43%/)).toBeInTheDocument()
      expect(screen.getByText(/25%/)).toBeInTheDocument()
    })
  })
})
