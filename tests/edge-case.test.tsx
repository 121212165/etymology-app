import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ObservePhase } from '@/components/train/ObservePhase'
import GuessPhase from '@/components/train/GuessPhase'
import { DecomposePhase } from '@/components/train/DecomposePhase'
import { getWordsForRoots, buildGuessQuestions, buildDecomposeQuestions } from '@/lib/root-network'
import type { VocabEntry, RootIndex, GuessQuestion, DecomposeQuestion } from '@/lib/types'

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

vi.mock('@/lib/data-loader', () => ({
  getCachedIndex: () => null,
  loadSearchIndex: vi.fn(),
  ensureChunksForRoots: vi.fn(),
}))

afterEach(cleanup)

function makeWord(overrides: Partial<VocabEntry> = {}): VocabEntry {
  return {
    word: 'test',
    definition: 'a test word',
    parts: [
      { type: 'root', text: 'test', meaning: 'test meaning', decomposed: false },
    ],
    ...overrides,
  }
}

function makeWords(count: number): VocabEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    word: `word${i + 1}`,
    definition: `definition of word${i + 1}`,
    parts: [
      { type: 'prefix' as const, text: `pre${i + 1}`, meaning: `前${i + 1}`, decomposed: false },
      { type: 'root' as const, text: `root${i + 1}`, meaning: `根${i + 1}`, decomposed: false },
      { type: 'suffix' as const, text: `suf${i + 1}`, meaning: `后${i + 1}`, decomposed: false },
    ],
  }))
}

function makeGuessQuestion(overrides: Partial<GuessQuestion> = {}): GuessQuestion {
  const entry = makeWord()
  return {
    entry,
    options: [entry.definition, 'wrong1', 'wrong2', 'wrong3'],
    correctIndex: 0,
    ...overrides,
  }
}

function makeDecomposeQuestion(overrides: Partial<DecomposeQuestion> = {}): DecomposeQuestion {
  const entry = makeWord({ parts: [{ type: 'root', text: 'test', meaning: 'test', decomposed: false }] })
  return {
    entry,
    correctRoots: ['test'],
    rootPool: ['test', 'distract1', 'distract2'],
    ...overrides,
  }
}

describe('EdgeCase - 空数据', () => {
  describe('ObservePhase with words=[]', () => {
    it('不崩溃：words为空数组时返回null', () => {
      const onNext = vi.fn()
      const onPhaseEnd = vi.fn()
      const { container } = render(
        <ObservePhase words={[]} currentIndex={0} onNext={onNext} onPhaseEnd={onPhaseEnd} />
      )
      expect(container.innerHTML).toBe('')
    })

    it('words=[]时onNext和onPhaseEnd均未被调用', () => {
      const onNext = vi.fn()
      const onPhaseEnd = vi.fn()
      render(
        <ObservePhase words={[]} currentIndex={0} onNext={onNext} onPhaseEnd={onPhaseEnd} />
      )
      expect(onNext).not.toHaveBeenCalled()
      expect(onPhaseEnd).not.toHaveBeenCalled()
    })
  })

  describe('GuessPhase with guessQuestions=[]', () => {
    it('questions为空时调用onComplete(0,0)', () => {
      const onComplete = vi.fn()
      render(<GuessPhase questions={[]} onComplete={onComplete} />)
      expect(onComplete).toHaveBeenCalledWith(0, 0)
    })

    it('questions为空时不渲染选项', () => {
      const onComplete = vi.fn()
      const { container } = render(<GuessPhase questions={[]} onComplete={onComplete} />)
      expect(container.querySelector('button')).toBeNull()
    })
  })

  describe('DecomposePhase with decomposeQuestions=[]', () => {
    it('questions为空时调用onComplete(0,0)', () => {
      const onComplete = vi.fn()
      render(<DecomposePhase questions={[]} onComplete={onComplete} />)
      expect(onComplete).toHaveBeenCalledWith(0, 0)
    })

    it('questions为空时不渲染内容', () => {
      const onComplete = vi.fn()
      const { container } = render(<DecomposePhase questions={[]} onComplete={onComplete} />)
      expect(container.innerHTML).toBe('')
    })
  })

  describe('rootIndex空对象', () => {
    it('getWordsForRoots返回空数组', () => {
      const result = getWordsForRoots(['vis', 'spect'], {}, [])
      expect(result).toEqual([])
    })

    it('buildGuessQuestions空words返回空数组', () => {
      const result = buildGuessQuestions([], [], 10)
      expect(result).toEqual([])
    })

    it('buildDecomposeQuestions空words返回空数组', () => {
      const result = buildDecomposeQuestions([], ['vis'], 10)
      expect(result).toEqual([])
    })

    it('getWordsForRoots空rootTexts返回空数组', () => {
      const vocab = [makeWord()]
      const rootIndex: RootIndex = { vis: { m: 'see', w: [0] } }
      const result = getWordsForRoots([], rootIndex, vocab)
      expect(result).toEqual([])
    })
  })
})

describe('EdgeCase - 单元素', () => {
  describe('只有1个单词的训练流程', () => {
    it('ObservePhase正确渲染单个单词', () => {
      const words = makeWords(1)
      render(
        <ObservePhase words={words} currentIndex={0} onNext={vi.fn()} onPhaseEnd={vi.fn()} />
      )
      expect(screen.getByText('word1')).toBeInTheDocument()
      expect(screen.getByText('进入猜词义 →')).toBeInTheDocument()
    })

    it('单个单词显示"第 1 / 1 个"', () => {
      const words = makeWords(1)
      render(
        <ObservePhase words={words} currentIndex={0} onNext={vi.fn()} onPhaseEnd={vi.fn()} />
      )
      expect(screen.getByText('第 1 / 1 个')).toBeInTheDocument()
    })

    it('单个单词点击直接触发onPhaseEnd', () => {
      const words = makeWords(1)
      const onNext = vi.fn()
      const onPhaseEnd = vi.fn()
      render(
        <ObservePhase words={words} currentIndex={0} onNext={onNext} onPhaseEnd={onPhaseEnd} />
      )
      fireEvent.click(screen.getByText('进入猜词义 →'))
      expect(onPhaseEnd).toHaveBeenCalledTimes(1)
      expect(onNext).not.toHaveBeenCalled()
    })

    it('GuessPhase单个问题渲染4个选项', () => {
      const q = makeGuessQuestion()
      const { container } = render(<GuessPhase questions={[q]} onComplete={vi.fn()} />)
      const buttons = container.querySelectorAll('button')
      expect(buttons).toHaveLength(4)
    })

    it('DecomposePhase单个问题显示提交按钮', () => {
      const q = makeDecomposeQuestion()
      render(<DecomposePhase questions={[q]} onComplete={vi.fn()} />)
      expect(screen.getByText('提交')).toBeInTheDocument()
      expect(screen.getByText('提交')).toBeDisabled()
    })
  })

  describe('只有1个词根的网络展开', () => {
    it('getWordsForRoots单个词根返回正确结果', () => {
      const vocab = [makeWord({ word: 'visible' }), makeWord({ word: 'other' })]
      const rootIndex: RootIndex = { vis: { m: 'see', w: [0] } }
      const result = getWordsForRoots(['vis'], rootIndex, vocab)
      expect(result).toHaveLength(1)
      expect(result[0].word).toBe('visible')
    })

    it('buildGuessQuestions单个单词生成单个问题', () => {
      const words = [makeWord()]
      const result = buildGuessQuestions(words, words, 1)
      expect(result).toHaveLength(1)
    })

    it('buildDecomposeQuestions单个单词生成单个问题', () => {
      const words = [makeWord()]
      const result = buildDecomposeQuestions(words, ['test'], 1)
      expect(result).toHaveLength(1)
    })

    it('单个词根的decompose问题包含正确的rootPool', () => {
      const words = [makeWord()]
      const result = buildDecomposeQuestions(words, ['test', 'extra1', 'extra2'], 1)
      expect(result).toHaveLength(1)
      expect(result[0].rootPool).toContain('test')
      expect(result[0].correctRoots).toEqual(['test'])
    })
  })
})

describe('EdgeCase - 极端输入', () => {
  describe('超长单词（>30字符）', () => {
    it('ObservePhase正确显示50字符单词', () => {
      const longWord = 'a'.repeat(50)
      const words = [makeWord({ word: longWord })]
      render(
        <ObservePhase words={words} currentIndex={0} onNext={vi.fn()} onPhaseEnd={vi.fn()} />
      )
      expect(screen.getByText(longWord)).toBeInTheDocument()
    })

    it('GuessPhase正确显示超长释义', () => {
      const longDef = 'a'.repeat(100)
      const entry = makeWord({ definition: longDef })
      const q: GuessQuestion = {
        entry,
        options: [longDef, 'short1', 'short2', 'short3'],
        correctIndex: 0,
      }
      render(<GuessPhase questions={[q]} onComplete={vi.fn()} />)
      expect(screen.getByText(longDef)).toBeInTheDocument()
    })

    it('DecomposePhase正确显示超长单词', () => {
      const longWord = 'pneumonoultramicroscopicsilicovolcanoconiosis'
      const q = makeDecomposeQuestion({
        entry: makeWord({ word: longWord }),
      })
      render(<DecomposePhase questions={[q]} onComplete={vi.fn()} />)
      expect(screen.getByText(longWord)).toBeInTheDocument()
    })

    it('ObservePhase显示超长释义', () => {
      const longDef = 'This is a very long definition that goes on and on and on'
      const words = [makeWord({ definition: longDef })]
      render(
        <ObservePhase words={words} currentIndex={0} onNext={vi.fn()} onPhaseEnd={vi.fn()} />
      )
      expect(screen.getByText(longDef)).toBeInTheDocument()
    })
  })

  describe('含特殊字符的单词', () => {
    it('连字符单词正确渲染', () => {
      const words = [makeWord({ word: 'self-control' })]
      render(
        <ObservePhase words={words} currentIndex={0} onNext={vi.fn()} onPhaseEnd={vi.fn()} />
      )
      expect(screen.getByText('self-control')).toBeInTheDocument()
    })

    it('大写单词正确渲染', () => {
      const words = [makeWord({ word: 'DNA' })]
      render(
        <ObservePhase words={words} currentIndex={0} onNext={vi.fn()} onPhaseEnd={vi.fn()} />
      )
      expect(screen.getByText('DNA')).toBeInTheDocument()
    })

    it('混合大小写单词正确渲染', () => {
      const words = [makeWord({ word: 'McDonald' })]
      render(
        <ObservePhase words={words} currentIndex={0} onNext={vi.fn()} onPhaseEnd={vi.fn()} />
      )
      expect(screen.getByText('McDonald')).toBeInTheDocument()
    })

    it('带数字的单词正确渲染', () => {
      const words = [makeWord({ word: '3D' })]
      render(
        <ObservePhase words={words} currentIndex={0} onNext={vi.fn()} onPhaseEnd={vi.fn()} />
      )
      expect(screen.getByText('3D')).toBeInTheDocument()
    })

    it('带撇号的单词正确渲染', () => {
      const words = [makeWord({ word: "it's" })]
      render(
        <ObservePhase words={words} currentIndex={0} onNext={vi.fn()} onPhaseEnd={vi.fn()} />
      )
      expect(screen.getByText("it's")).toBeInTheDocument()
    })

    it('带空格的part text正确渲染', () => {
      const words = [makeWord({
        parts: [{ type: 'root', text: 'vis/vid', meaning: 'see', decomposed: false }],
      })]
      render(
        <ObservePhase words={words} currentIndex={0} onNext={vi.fn()} onPhaseEnd={vi.fn()} />
      )
      expect(screen.getByText('vis/vid')).toBeInTheDocument()
    })
  })

  describe('词根文本为空字符串', () => {
    it('ObservePhase空part.text渲染空按钮', () => {
      const words = [makeWord({
        parts: [{ type: 'root', text: '', meaning: 'empty root', decomposed: false }],
      })]
      const { container } = render(
        <ObservePhase words={words} currentIndex={0} onNext={vi.fn()} onPhaseEnd={vi.fn()} />
      )
      expect(container.querySelector('.bg-bg-elevated')).toBeTruthy()
      expect(screen.getByText('empty root')).toBeInTheDocument()
    })

    it('DecomposePhase空correctRoots不崩溃', () => {
      const q = makeDecomposeQuestion({ correctRoots: [] })
      const { container } = render(
        <DecomposePhase questions={[q]} onComplete={vi.fn()} />
      )
      expect(container).toBeTruthy()
    })

    it('getWordsForRoots空词根文本匹配空键', () => {
      const vocab = [makeWord()]
      const rootIndex: RootIndex = { '': { m: 'empty', w: [0] } }
      const result = getWordsForRoots([''], rootIndex, vocab)
      expect(result).toHaveLength(1)
    })

    it('getWordsForRoots不存在的词根返回空', () => {
      const vocab = [makeWord()]
      const rootIndex: RootIndex = { vis: { m: 'see', w: [0] } }
      const result = getWordsForRoots(['nonexistent'], rootIndex, vocab)
      expect(result).toEqual([])
    })

    it('ObservePhase空meaning正确渲染', () => {
      const words = [makeWord({
        parts: [{ type: 'root', text: 'test', meaning: '', decomposed: false }],
      })]
      const { container } = render(
        <ObservePhase words={words} currentIndex={0} onNext={vi.fn()} onPhaseEnd={vi.fn()} />
      )
      expect(container.querySelector('.bg-bg-elevated')).toBeTruthy()
    })
  })
})

describe('EdgeCase - 重复数据', () => {
  describe('同一个单词在多个词根组中出现', () => {
    it('getWordsForRoots去重正确', () => {
      const vocab = [
        makeWord({ word: 'visible' }),
        makeWord({ word: 'inspect' }),
        makeWord({ word: 'transport' }),
      ]
      const rootIndex: RootIndex = {
        vis: { m: 'see', w: [0] },
        spect: { m: 'look', w: [0, 1] },
        port: { m: 'carry', w: [0, 2] },
      }
      const result = getWordsForRoots(['vis', 'spect', 'port'], rootIndex, vocab)
      expect(result).toHaveLength(3)
      const words = result.map(w => w.word)
      expect(words).toContain('visible')
      expect(words).toContain('inspect')
      expect(words).toContain('transport')
    })

    it('同一单词被多个词根引用时不重复', () => {
      const vocab = [makeWord({ word: 'transportation' })]
      const rootIndex: RootIndex = {
        trans: { m: 'across', w: [0] },
        port: { m: 'carry', w: [0] },
      }
      const result = getWordsForRoots(['trans', 'port'], rootIndex, vocab)
      expect(result).toHaveLength(1)
      expect(result[0].word).toBe('transportation')
    })

    it('完全重复的词根列表去重', () => {
      const vocab = [makeWord({ word: 'visible' })]
      const rootIndex: RootIndex = {
        vis: { m: 'see', w: [0] },
      }
      const result = getWordsForRoots(['vis', 'vis', 'vis'], rootIndex, vocab)
      expect(result).toHaveLength(1)
    })

    it('buildGuessQuestions从重复数据生成问题不崩溃', () => {
      const words = [
        makeWord({ word: 'visible' }),
        makeWord({ word: 'visible' }),
        makeWord({ word: 'vision' }),
        makeWord({ word: 'visit' }),
        makeWord({ word: 'revise' }),
      ]
      const result = buildGuessQuestions(words, words, 3)
      expect(result).toHaveLength(3)
      result.forEach(q => {
        expect(q.options).toHaveLength(4)
        expect(q.correctIndex).toBeGreaterThanOrEqual(0)
        expect(q.correctIndex).toBeLessThan(4)
      })
    })

    it('buildDecomposeQuestions从重复数据生成问题不崩溃', () => {
      const words = [
        makeWord({ word: 'visible' }),
        makeWord({ word: 'visible' }),
        makeWord({ word: 'vision' }),
        makeWord({ word: 'visitor' }),
        makeWord({ word: 'revise' }),
      ]
      const result = buildDecomposeQuestions(words, ['vis'], 3)
      expect(result).toHaveLength(3)
      result.forEach(q => {
        expect(q.correctRoots).toBeDefined()
        expect(q.rootPool).toBeDefined()
      })
    })
  })

  describe('getWordsForRoots边界情况', () => {
    it('rootIndex中有无效索引时不崩溃', () => {
      const vocab = [makeWord({ word: 'valid' })]
      const rootIndex: RootIndex = {
        test: { m: 'test', w: [0, 99, 100] },
      }
      const result = getWordsForRoots(['test'], rootIndex, vocab)
      expect(result).toHaveLength(1)
      expect(result[0].word).toBe('valid')
    })

    it('vocab为空但rootIndex有数据时不崩溃', () => {
      const rootIndex: RootIndex = {
        vis: { m: 'see', w: [0, 1, 2] },
      }
      const result = getWordsForRoots(['vis'], rootIndex, [])
      expect(result).toEqual([])
    })

    it('rootIndex中w为空数组时返回空', () => {
      const vocab = [makeWord()]
      const rootIndex: RootIndex = {
        vis: { m: 'see', w: [] },
      }
      const result = getWordsForRoots(['vis'], rootIndex, vocab)
      expect(result).toEqual([])
    })

    it('多个词根但全部不存在时返回空', () => {
      const vocab = [makeWord()]
      const rootIndex: RootIndex = { vis: { m: 'see', w: [0] } }
      const result = getWordsForRoots(['abc', 'def', 'ghi'], rootIndex, vocab)
      expect(result).toEqual([])
    })
  })
})

describe('EdgeCase - 并发/快速操作', () => {
  describe('快速连续点击"下一个"', () => {
    it('多次快速点击onNext不崩溃', () => {
      const words = makeWords(5)
      const onNext = vi.fn()
      const onPhaseEnd = vi.fn()
      render(
        <ObservePhase words={words} currentIndex={0} onNext={onNext} onPhaseEnd={onPhaseEnd} />
      )
      const btn = screen.getByText('下一个 →')
      fireEvent.click(btn)
      fireEvent.click(btn)
      fireEvent.click(btn)
      expect(onNext).toHaveBeenCalledTimes(3)
      expect(onPhaseEnd).not.toHaveBeenCalled()
    })

    it('最后一个词多次点击只触发onPhaseEnd', () => {
      const words = makeWords(3)
      const onNext = vi.fn()
      const onPhaseEnd = vi.fn()
      render(
        <ObservePhase words={words} currentIndex={2} onNext={onNext} onPhaseEnd={onPhaseEnd} />
      )
      const btn = screen.getByText('进入猜词义 →')
      fireEvent.click(btn)
      fireEvent.click(btn)
      expect(onPhaseEnd).toHaveBeenCalledTimes(2)
      expect(onNext).not.toHaveBeenCalled()
    })

    it('快速空格键连续触发不崩溃', () => {
      const words = makeWords(3)
      const onNext = vi.fn()
      const onPhaseEnd = vi.fn()
      render(
        <ObservePhase words={words} currentIndex={0} onNext={onNext} onPhaseEnd={onPhaseEnd} />
      )
      fireEvent.keyDown(window, { code: 'Space' })
      fireEvent.keyDown(window, { code: 'Space' })
      fireEvent.keyDown(window, { code: 'Space' })
      expect(onNext).toHaveBeenCalledTimes(3)
    })

    it('混合点击和空格键不崩溃', () => {
      const words = makeWords(3)
      const onNext = vi.fn()
      const onPhaseEnd = vi.fn()
      render(
        <ObservePhase words={words} currentIndex={0} onNext={onNext} onPhaseEnd={onPhaseEnd} />
      )
      fireEvent.click(screen.getByText('下一个 →'))
      fireEvent.keyDown(window, { code: 'Space' })
      fireEvent.click(screen.getByText('下一个 →'))
      expect(onNext).toHaveBeenCalledTimes(3)
    })
  })

  describe('快速切换选项', () => {
    it('GuessPhase快速点击多个选项不崩溃', () => {
      const q = makeGuessQuestion()
      const q2 = makeGuessQuestion({
        entry: makeWord({ word: 'second', definition: 'second def' }),
        options: ['second def', 'w1', 'w2', 'w3'],
        correctIndex: 0,
      })
      const { container } = render(<GuessPhase questions={[q, q2]} onComplete={vi.fn()} />)
      const buttons = container.querySelectorAll('button')
      fireEvent.click(buttons[0])
      fireEvent.click(buttons[1])
      fireEvent.click(buttons[2])
      expect(buttons).toHaveLength(4)
    })

    it('DecomposePhase快速切换词根选择不崩溃', () => {
      const q = makeDecomposeQuestion({
        rootPool: ['a', 'b', 'c', 'd', 'test'],
      })
      const { container } = render(<DecomposePhase questions={[q]} onComplete={vi.fn()} />)
      const poolItems = container.querySelectorAll('.part-tag-root.transition-opacity')
      const aBtn = Array.from(poolItems).find(el => el.textContent === 'a')
      const bBtn = Array.from(poolItems).find(el => el.textContent === 'b')
      const cBtn = Array.from(poolItems).find(el => el.textContent === 'c')
      fireEvent.click(aBtn!)
      fireEvent.click(bBtn!)
      fireEvent.click(aBtn!)
      fireEvent.click(cBtn!)
      expect(container).toBeTruthy()
    })

    it('DecomposePhase点击已选词根取消选择', () => {
      const q = makeDecomposeQuestion({
        rootPool: ['test', 'extra'],
      })
      const { container } = render(<DecomposePhase questions={[q]} onComplete={vi.fn()} />)
      const poolItems = container.querySelectorAll('.part-tag-root.transition-opacity')
      const testBtn = Array.from(poolItems).find(el => el.textContent === 'test')
      fireEvent.click(testBtn!)
      fireEvent.click(testBtn!)
      const submitBtn = container.querySelector('button:not(.part-tag-root)') as HTMLButtonElement
      expect(submitBtn.disabled).toBe(true)
    })

    it('GuessPhase禁用后点击无效', () => {
      const q = makeGuessQuestion()
      const q2 = makeGuessQuestion({
        entry: makeWord({ word: 'second', definition: 'second def' }),
        options: ['second def', 'w1', 'w2', 'w3'],
        correctIndex: 0,
      })
      const { container } = render(<GuessPhase questions={[q, q2]} onComplete={vi.fn()} />)
      const buttons = container.querySelectorAll('button')
      fireEvent.click(buttons[0])
      expect(buttons[0]).toBeDisabled()
    })
  })

  describe('GuessPhase边界情况', () => {
    it('正确答案高亮绿色', () => {
      const q = makeGuessQuestion()
      const { container } = render(<GuessPhase questions={[q]} onComplete={vi.fn()} />)
      const buttons = container.querySelectorAll('button')
      fireEvent.click(buttons[0])
      const greenButtons = container.querySelectorAll('.bg-green-500\\/10')
      expect(greenButtons.length).toBeGreaterThanOrEqual(1)
    })

    it('错误答案高亮红色', () => {
      const q = makeGuessQuestion()
      const { container } = render(<GuessPhase questions={[q]} onComplete={vi.fn()} />)
      const buttons = container.querySelectorAll('button')
      fireEvent.click(buttons[1])
      const redButtons = container.querySelectorAll('.bg-red-500\\/10')
      expect(redButtons.length).toBeGreaterThanOrEqual(1)
    })

    it('显示正确释义', () => {
      const q = makeGuessQuestion()
      const { container } = render(<GuessPhase questions={[q]} onComplete={vi.fn()} />)
      const buttons = container.querySelectorAll('button')
      fireEvent.click(buttons[1])
      expect(screen.getByText(/正确释义/)).toBeInTheDocument()
    })
  })

  describe('DecomposePhase边界情况', () => {
    it('多个正确词根全部选中才通过', () => {
      const entry = makeWord({
        parts: [
          { type: 'root', text: 'vis', meaning: 'see', decomposed: false },
          { type: 'root', text: 'ion', meaning: 'act', decomposed: false },
        ],
      })
      const q: DecomposeQuestion = {
        entry,
        correctRoots: ['vis', 'ion'],
        rootPool: ['vis', 'ion', 'extra1', 'extra2'],
      }
      const { container } = render(<DecomposePhase questions={[q]} onComplete={vi.fn()} />)
      const poolItems = container.querySelectorAll('.part-tag-root.transition-opacity')
      const visBtn = Array.from(poolItems).find(el => el.textContent === 'vis')
      const ionBtn = Array.from(poolItems).find(el => el.textContent === 'ion')
      fireEvent.click(visBtn!)
      fireEvent.click(ionBtn!)
      const submitBtn = container.querySelector('button:not(.part-tag-root)') as HTMLButtonElement
      expect(submitBtn.disabled).toBe(false)
    })

    it('部分选中正确词根时提交后显示错误', () => {
      const entry = makeWord({
        parts: [
          { type: 'root', text: 'vis', meaning: 'see', decomposed: false },
          { type: 'root', text: 'ion', meaning: 'act', decomposed: false },
        ],
      })
      const q: DecomposeQuestion = {
        entry,
        correctRoots: ['vis', 'ion'],
        rootPool: ['vis', 'ion', 'extra'],
      }
      const { container } = render(<DecomposePhase questions={[q]} onComplete={vi.fn()} />)
      const poolItems = container.querySelectorAll('.part-tag-root.transition-opacity')
      const visBtn = Array.from(poolItems).find(el => el.textContent === 'vis')
      fireEvent.click(visBtn!)
      const submitBtn = container.querySelector('button:not(.part-tag-root)') as HTMLButtonElement
      fireEvent.click(submitBtn)
      expect(container.textContent).toContain('正确拆解')
    })

    it('rootPool为空时提交按钮禁用', () => {
      const q = makeDecomposeQuestion({ rootPool: [] })
      const { container } = render(<DecomposePhase questions={[q]} onComplete={vi.fn()} />)
      const submitBtn = container.querySelector('button:not(.part-tag-root)') as HTMLButtonElement
      expect(submitBtn.disabled).toBe(true)
    })

    it('多题时第一题提交后切换到第二题', () => {
      const q1 = makeDecomposeQuestion({
        entry: makeWord({ word: 'first' }),
        rootPool: ['test', 'extra'],
      })
      const q2 = makeDecomposeQuestion({
        entry: makeWord({ word: 'second' }),
        rootPool: ['test', 'extra'],
      })
      const { container } = render(<DecomposePhase questions={[q1, q2]} onComplete={vi.fn()} />)
      expect(container.textContent).toContain('first')
      const poolItems = container.querySelectorAll('.part-tag-root.transition-opacity')
      const testBtn = Array.from(poolItems).find(el => el.textContent === 'test')
      fireEvent.click(testBtn!)
      const submitBtn = container.querySelector('button:not(.part-tag-root)') as HTMLButtonElement
      fireEvent.click(submitBtn)
      expect(container.textContent).toContain('第 1 / 2 题')
    })
  })
})
