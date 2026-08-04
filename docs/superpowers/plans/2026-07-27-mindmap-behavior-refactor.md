# 林序思维导图重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把林序从"5000 词平铺展示"重构为"分层词根思维导图 + 行为闭环"，数据构建 100% 算法化，0 bug 风险

**Architecture:**
1. **数据层**：基于现有 vocab.json + roots-index.json，程序化构建三层增强结构（词根分层 + 同义保守合并 + TF-IDF 共现连接）
2. **行为层**：基于 localStorage 的轻量进度状态，遵循福格模型（隐藏总量、单点聚焦、微庆祝反馈）
3. **UI 层**：思维导图作为主交互，词根聚焦卡作为首页入口

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Zustand 5, Tailwind v4, Vitest 3

**核心原则（贯穿全计划）:**
- 数据构建只用算法判断，不用 AI 语义判断（宁可漏连，不要错连）
- 永不向用户暴露"未完成数量"（避免母组块压迫感）
- 任何单次行为 < 3 分钟可完成（福格 Tiny Habit 原则）

**数据现状（已验证）:**
- 5011 词 / 613 词根 / 5 个无词根词
- 词根下词数中位数 2，76% 词根只挂 2-3 词
- 67 组同义不同形词根（如 cept/ceive/cap 都="拿"）
- 现有数据 0 越界、0 不一致

---

## 文件结构

### 新增文件

**数据构建脚本（构建时运行，0 运行时风险）**
- `scripts/lib/edit-distance.ts` - 编辑距离工具
- `scripts/lib/layer-classifier.ts` - 词根分层算法
- `scripts/lib/conservative-merger.ts` - 同义词根保守合并算法
- `scripts/lib/cooccurrence-linker.ts` - TF-IDF 共现连接算法
- `scripts/build-mindmap-data.ts` - 主构建脚本
- `scripts/lib/__tests__/*.test.ts` - 对应测试

**运行时类型与数据加载**
- `src/lib/mindmap-types.ts` - 增强后的思维导图数据类型
- `src/lib/mindmap-loader.ts` - 思维导图数据加载

**状态管理**
- `src/store/progress-store.ts` - 进度状态（localStorage 持久化）

**UI 组件**
- `src/components/home/FocusCard.tsx` - 首页焦点卡片（替代词根云）
- `src/components/root/RootSession.tsx` - 词根会话组件
- `src/components/mindmap/MindMap.tsx` - 思维导图可视化
- `src/components/feedback/MicroCelebrate.tsx` - 微庆祝反馈

### 修改文件
- `src/app/page.tsx` - 重构首页（从平铺改为聚焦）
- `src/app/root/[slug]/page.tsx` - 重构词根页（从列表改为会话）
- `package.json` - 新增 `build:mindmap` 脚本
- `REBUILD_PROMPT.md` - 更新重建提示词

### 删除文件
- `src/components/search/RootCloud.tsx` - 词根云（被 FocusCard 替代）

---

## 阶段 1：数据构建基础设施（核心难点）

### Task 1: 编辑距离工具

**Files:**
- Create: `scripts/lib/edit-distance.ts`
- Test: `scripts/lib/__tests__/edit-distance.test.ts`

- [ ] **Step 1: 写失败测试**

```typescript
// scripts/lib/__tests__/edit-distance.test.ts
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
    // cept(4) vs ceive(5): match 'ce' prefix, then 'pt' vs 'ive' (0 matches) → 2 substitutions + 1 insertion = 3
    expect(editDistance('cept', 'ceive')).toBe(3)
    expect(editDistance('duc', 'duce')).toBe(1)
    expect(editDistance('cap', 'cept')).toBe(2)
  })

  it('is symmetric', () => {
    expect(editDistance('cede', 'ced')).toBe(editDistance('ced', 'cede'))
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run scripts/lib/__tests__/edit-distance.test.ts`
Expected: FAIL with "Cannot find module '../edit-distance'"

- [ ] **Step 3: 实现编辑距离**

```typescript
// scripts/lib/edit-distance.ts
/**
 * 计算 Levenshtein 编辑距离
 * 用于同义词根保守合并：仅合并含义相同、首字母相同、编辑距离 <= 2 的词根
 */
export function editDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  )

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      )
    }
  }

  return dp[m][n]
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run scripts/lib/__tests__/edit-distance.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: 提交**

```bash
git add scripts/lib/edit-distance.ts scripts/lib/__tests__/edit-distance.test.ts
git commit -m "feat(data): add edit distance utility for conservative root merging"
```

---

### Task 2: 词根分层算法

**Files:**
- Create: `scripts/lib/layer-classifier.ts`
- Test: `scripts/lib/__tests__/layer-classifier.test.ts`

**核心规则（程序化，0 判断风险）:**
- 核心层: `w.length >= 10` → 思维导图主节点
- 中间层: `w.length >= 4` → 默认折叠
- 边缘层: `w.length < 4` → 不进入导图

- [ ] **Step 1: 写失败测试**

```typescript
// scripts/lib/__tests__/layer-classifier.test.ts
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
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run scripts/lib/__tests__/layer-classifier.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现分层算法**

```typescript
// scripts/lib/layer-classifier.ts
/**
 * 词根分层算法 - 程序化判断，0 AI 介入
 *
 * 核心层: >= 10 词 → 思维导图主节点（约 31 个）
 * 中间层: 4-9 词   → 默认折叠（约 100 个）
 * 边缘层: < 4 词   → 不进入导图（约 480 个）
 *
 * 设计理由：613 个词根全展示会产生"母组块压迫感"
 * 分层后用户只看到 31 个核心节点，能力门槛大幅降低
 */

export const LAYER_CORE = 'core' as const
export const LAYER_MIDDLE = 'middle' as const
export const LAYER_EDGE = 'edge' as const

export type RootLayer = typeof LAYER_CORE | typeof LAYER_MIDDLE | typeof LAYER_EDGE

export const CORE_THRESHOLD = 10
export const MIDDLE_THRESHOLD = 4

export function classifyLayer(wordCount: number): RootLayer {
  if (wordCount >= CORE_THRESHOLD) return LAYER_CORE
  if (wordCount >= MIDDLE_THRESHOLD) return LAYER_MIDDLE
  return LAYER_EDGE
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run scripts/lib/__tests__/layer-classifier.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add scripts/lib/layer-classifier.ts scripts/lib/__tests__/layer-classifier.test.ts
git commit -m "feat(data): add root layer classifier (core/middle/edge)"
```

---

### Task 3: 同义词根保守合并算法

**Files:**
- Create: `scripts/lib/conservative-merger.ts`
- Test: `scripts/lib/__tests__/conservative-merger.test.ts`

**保守合并规则（全部硬条件，0 AI 判断）:**
1. meaning 字符串完全相等
2. 首字母相同
3. 编辑距离 <= 2

- [ ] **Step 1: 写失败测试**

```typescript
// scripts/lib/__tests__/conservative-merger.test.ts
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
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run scripts/lib/__tests__/conservative-merger.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现保守合并算法**

```typescript
// scripts/lib/conservative-merger.ts
import { editDistance } from './edit-distance'

export interface MergeInput {
  text: string
  meaning: string
  wordIndices: number[]
}

export interface MergeGroup {
  texts: string[]
  meaning: string
  wordIndices: number[]
  primaryText: string  // 主文本（最长的，作为展示名）
}

/**
 * 保守合并规则（全部硬条件，0 AI 语义判断）:
 * 1. meaning 字符串完全相等
 * 2. 首字母相同
 * 3. 编辑距离 <= 2
 *
 * 设计取舍：宁可漏合并，不要错合并
 */
export function shouldMerge(
  a: { text: string; meaning: string },
  b: { text: string; meaning: string }
): boolean {
  if (a.meaning !== b.meaning) return false
  if (a.text[0] !== b.text[0]) return false
  return editDistance(a.text, b.text) <= 2
}

export function mergeRoots(inputs: MergeInput[]): MergeGroup[] {
  // Union-Find 进行传递性合并
  const parent: number[] = inputs.map((_, i) => i)

  function find(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]
      x = parent[x]
    }
    return x
  }

  function union(x: number, y: number): void {
    const px = find(x)
    const py = find(y)
    if (px !== py) parent[px] = py
  }

  for (let i = 0; i < inputs.length; i++) {
    for (let j = i + 1; j < inputs.length; j++) {
      if (shouldMerge(inputs[i], inputs[j])) {
        union(i, j)
      }
    }
  }

  const groupMap = new Map<number, MergeInput[]>()
  for (let i = 0; i < inputs.length; i++) {
    const root = find(i)
    if (!groupMap.has(root)) groupMap.set(root, [])
    groupMap.get(root)!.push(inputs[i])
  }

  return Array.from(groupMap.values()).map(group => {
    const texts = group.map(g => g.text)
    const meaning = group[0].meaning
    const wordIndices = Array.from(new Set(group.flatMap(g => g.wordIndices))).sort((a, b) => a - b)
    const primaryText = texts.reduce((longest, t) => t.length > longest.length ? t : longest, texts[0])

    return { texts, meaning, wordIndices, primaryText }
  })
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run scripts/lib/__tests__/conservative-merger.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add scripts/lib/conservative-merger.ts scripts/lib/__tests__/conservative-merger.test.ts
git commit -m "feat(data): add conservative root merger (meaning + first letter + edit distance)"
```

---

### Task 4: TF-IDF 共现连接算法

**Files:**
- Create: `scripts/lib/cooccurrence-linker.ts`
- Test: `scripts/lib/__tests__/cooccurrence-linker.test.ts`

**核心算法:**
- 连接权重 = 1 / (该 part 在全库出现的总次数)
- 只保留权重 >= 阈值（如 0.1，即该 part 出现次数 <= 10）的连接
- 自动过滤 ion/ing 等高频后缀的噪声连接

- [ ] **Step 1: 写失败测试**

```typescript
// scripts/lib/__tests__/cooccurrence-linker.test.ts
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
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run scripts/lib/__tests__/cooccurrence-linker.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现共现连接算法**

```typescript
// scripts/lib/cooccurrence-linker.ts
export interface CooccurPart {
  type: 'prefix' | 'root' | 'suffix'
  text: string
  meaning: string
}

export interface CooccurWord {
  index: number
  parts: CooccurPart[]
}

export interface CooccurInput {
  words: CooccurWord[]
  partFrequency: Record<string, number>
}

export interface CooccurLink {
  from: number
  to: number
  partText: string
  partType: 'prefix' | 'root' | 'suffix'
  weight: number
}

/**
 * TF-IDF 共现连接算法
 *
 * 两个词共享某个 part 时，该 part 越稀有，连接越有意义
 * 权重 = 1 / 该 part 在全库出现的总次数
 *
 * 阈值 0.1 = 只连接出现 <= 10 次的 part
 * 自动过滤 ion/ing/ed 等高频后缀的噪声连接
 *
 * 0 AI 语义判断，纯算法
 */
export function buildCooccurrenceLinks(
  input: CooccurInput,
  threshold: number
): CooccurLink[] {
  const links: CooccurLink[] = []
  const seen = new Set<string>()

  const partToWords = new Map<string, { indices: number[], part: CooccurPart }>()

  for (const word of input.words) {
    for (const part of word.parts) {
      const key = `${part.type}:${part.text}`
      if (!partToWords.has(key)) {
        partToWords.set(key, { indices: [], part })
      }
      partToWords.get(key)!.indices.push(word.index)
    }
  }

  for (const [key, { indices, part }] of partToWords) {
    const freq = input.partFrequency[key] || indices.length
    const weight = 1 / freq

    if (weight < threshold) continue

    for (let i = 0; i < indices.length; i++) {
      for (let j = i + 1; j < indices.length; j++) {
        const from = Math.min(indices[i], indices[j])
        const to = Math.max(indices[i], indices[j])
        const linkKey = `${from}-${to}-${part.type}-${part.text}`

        if (seen.has(linkKey)) continue
        seen.add(linkKey)

        links.push({
          from,
          to,
          partText: part.text,
          partType: part.type,
          weight,
        })
      }
    }
  }

  return links
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run scripts/lib/__tests__/cooccurrence-linker.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add scripts/lib/cooccurrence-linker.ts scripts/lib/__tests__/cooccurrence-linker.test.ts
git commit -m "feat(data): add TF-IDF cooccurrence linker (auto-filter high-freq noise)"
```

---

### Task 5: 增强思维导图数据构建主脚本

**Files:**
- Create: `src/lib/mindmap-types.ts`
- Create: `scripts/build-mindmap-data.ts`
- Modify: `package.json`
- Output: `public/data/enhanced-roots.json`

- [ ] **Step 1: 定义思维导图数据类型**

```typescript
// src/lib/mindmap-types.ts
import type { VocabPart } from './types'

export type RootLayer = 'core' | 'middle' | 'edge'

export interface EnhancedRootNode {
  primaryText: string
  aliases: string[]
  meaning: string
  layer: RootLayer
  wordIndices: number[]
  wordCount: number
}

export interface WordLink {
  fromWordIndex: number
  toWordIndex: number
  partText: string
  partType: VocabPart['type']
  weight: number
}

export interface MindMapData {
  roots: EnhancedRootNode[]
  links: WordLink[]
  stats: {
    totalRoots: number
    coreRoots: number
    middleRoots: number
    edgeRoots: number
    mergedGroups: number
    totalLinks: number
  }
}
```

- [ ] **Step 2: 实现主构建脚本**

```typescript
// scripts/build-mindmap-data.ts
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { classifyLayer, LAYER_CORE, LAYER_MIDDLE, LAYER_EDGE } from './lib/layer-classifier'
import { mergeRoots, type MergeInput } from './lib/conservative-merger'
import { buildCooccurrenceLinks, type CooccurInput } from './lib/cooccurrence-linker'
import type { VocabEntry, RootIndex } from '../src/lib/types'
import type { MindMapData, EnhancedRootNode } from '../src/lib/mindmap-types'

function loadData() {
  const dataDir = join(process.cwd(), 'public', 'data')
  const vocab: VocabEntry[] = JSON.parse(
    readFileSync(join(dataDir, 'vocab.json'), 'utf-8')
  )
  const rootIndex: RootIndex = JSON.parse(
    readFileSync(join(dataDir, 'roots-index.json'), 'utf-8')
  )
  return { vocab, rootIndex }
}

function main() {
  console.log('[build-mindmap] Loading source data...')
  const { vocab, rootIndex } = loadData()
  console.log(`  vocab: ${vocab.length} words`)
  console.log(`  rootIndex: ${Object.keys(rootIndex).length} roots`)

  console.log('[build-mindmap] Phase 1: Conservative merge...')
  const mergeInputs: MergeInput[] = Object.entries(rootIndex).map(([text, entry]) => ({
    text,
    meaning: entry.m,
    wordIndices: entry.w,
  }))

  const mergedGroups = mergeRoots(mergeInputs)
  console.log(`  merged: ${mergeInputs.length} -> ${mergedGroups.length} groups`)

  console.log('[build-mindmap] Phase 2: Layer classification...')
  const enhancedRoots: EnhancedRootNode[] = mergedGroups.map(group => {
    const wordCount = group.wordIndices.length
    return {
      primaryText: group.primaryText,
      aliases: group.texts.filter(t => t !== group.primaryText),
      meaning: group.meaning,
      layer: classifyLayer(wordCount),
      wordIndices: group.wordIndices,
      wordCount,
    }
  })

  const coreCount = enhancedRoots.filter(r => r.layer === LAYER_CORE).length
  const middleCount = enhancedRoots.filter(r => r.layer === LAYER_MIDDLE).length
  const edgeCount = enhancedRoots.filter(r => r.layer === LAYER_EDGE).length
  console.log(`  core: ${coreCount}, middle: ${middleCount}, edge: ${edgeCount}`)

  console.log('[build-mindmap] Phase 3: Cooccurrence links...')
  const partFreq: Record<string, number> = {}
  for (const word of vocab) {
    for (const part of word.parts) {
      const key = `${part.type}:${part.text}`
      partFreq[key] = (partFreq[key] || 0) + 1
    }
  }

  const cooccurInput: CooccurInput = {
    words: vocab.map((entry, index) => ({ index, parts: entry.parts })),
    partFrequency: partFreq,
  }

  const links = buildCooccurrenceLinks(cooccurInput, 0.1)
  console.log(`  links: ${links.length}`)

  const result: MindMapData = {
    roots: enhancedRoots,
    links,
    stats: {
      totalRoots: enhancedRoots.length,
      coreRoots: coreCount,
      middleRoots: middleCount,
      edgeRoots: edgeCount,
      mergedGroups: mergedGroups.length,
      totalLinks: links.length,
    },
  }

  const outputPath = join(process.cwd(), 'public', 'data', 'enhanced-roots.json')
  writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8')
  console.log(`[build-mindmap] Output: ${outputPath}`)
  console.log('[build-mindmap] Stats:', result.stats)
}

main()
```

- [ ] **Step 3: 添加 npm script**

修改 `package.json` 的 scripts 部分：

```json
{
  "scripts": {
    "dev": "next dev --turbopack=false",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest",
    "build:mindmap": "tsx scripts/build-mindmap-data.ts"
  }
}
```

- [ ] **Step 4: 安装 tsx 并运行构建**

Run: `npm install -D tsx`
Run: `npm run build:mindmap`
Expected: 输出 `public/data/enhanced-roots.json`，stats 显示约 31 core / 100 middle / 480 edge

- [ ] **Step 5: 验证输出文件**

Run: `node -e "const d = require('./public/data/enhanced-roots.json'); console.log('roots:', d.roots.length); console.log('links:', d.links.length); console.log('core roots (sample):', d.roots.filter(r => r.layer === 'core').slice(0, 5).map(r => r.primaryText + ':' + r.wordCount))"`
Expected: 列出 act:11, port:12, fer:14 等核心词根

- [ ] **Step 6: 提交**

```bash
git add scripts/build-mindmap-data.ts src/lib/mindmap-types.ts package.json public/data/enhanced-roots.json
git commit -m "feat(data): build enhanced mindmap data (3-layer + merged + cooccurrence)"
```

---

## 阶段 2：行为设计层（福格模型）

### Task 6: 进度状态存储（localStorage 持久化）

**Files:**
- Create: `src/store/progress-store.ts`
- Test: `src/store/__tests__/progress-store.test.ts`

**核心原则:**
- 永不存储"未完成数"
- 只记录"已看过"的事实（幂等）
- 无时间戳、无连续天数（避免外部动机绑架）

- [ ] **Step 1: 实现进度存储**

```typescript
// src/store/progress-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ProgressState {
  viewedWords: string[]
  viewedWordSet: Record<string, true>
  completedRoots: string[]
  currentRoot: string | null

  markWordViewed: (word: string) => void
  markRootCompleted: (rootText: string) => void
  setCurrentRoot: (root: string | null) => void
  isWordViewed: (word: string) => boolean
  isRootCompleted: (rootText: string) => boolean
  getViewedCountForRoot: (rootText: string, allWordIndices: number[], vocab: { word: string }[]) => number
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      viewedWords: [],
      viewedWordSet: {},
      completedRoots: [],
      currentRoot: null,

      markWordViewed: (word) => {
        const state = get()
        if (state.viewedWordSet[word]) return
        set({
          viewedWords: [...state.viewedWords, word],
          viewedWordSet: { ...state.viewedWordSet, [word]: true },
        })
      },

      markRootCompleted: (rootText) => {
        const state = get()
        if (state.completedRoots.includes(rootText)) return
        set({ completedRoots: [...state.completedRoots, rootText] })
      },

      setCurrentRoot: (root) => set({ currentRoot: root }),

      isWordViewed: (word) => !!get().viewedWordSet[word],

      isRootCompleted: (rootText) => get().completedRoots.includes(rootText),

      getViewedCountForRoot: (rootText, allWordIndices, vocab) => {
        const state = get()
        return allWordIndices.filter(idx => {
          const word = vocab[idx]?.word
          return word && state.viewedWordSet[word]
        }).length
      },
    }),
    {
      name: 'linxu-progress',
      partialize: (state) => ({
        viewedWords: state.viewedWords,
        viewedWordSet: state.viewedWordSet,
        completedRoots: state.completedRoots,
        currentRoot: state.currentRoot,
      }),
    }
  )
)
```

- [ ] **Step 2: 写测试**

```typescript
// src/store/__tests__/progress-store.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useProgressStore } from '../progress-store'

describe('progress-store', () => {
  beforeEach(() => {
    useProgressStore.setState({
      viewedWords: [],
      viewedWordSet: {},
      completedRoots: [],
      currentRoot: null,
    })
  })

  it('marks word as viewed (idempotent)', () => {
    const { markWordViewed, isWordViewed } = useProgressStore.getState()
    expect(isWordViewed('act')).toBe(false)
    markWordViewed('act')
    expect(isWordViewed('act')).toBe(true)
    markWordViewed('act')
    expect(useProgressStore.getState().viewedWords).toHaveLength(1)
  })

  it('marks root as completed (idempotent)', () => {
    const { markRootCompleted, isRootCompleted } = useProgressStore.getState()
    expect(isRootCompleted('act')).toBe(false)
    markRootCompleted('act')
    expect(isRootCompleted('act')).toBe(true)
    markRootCompleted('act')
    expect(useProgressStore.getState().completedRoots).toHaveLength(1)
  })

  it('sets current root', () => {
    const { setCurrentRoot } = useProgressStore.getState()
    setCurrentRoot('port')
    expect(useProgressStore.getState().currentRoot).toBe('port')
  })

  it('counts viewed words for a root', () => {
    const { markWordViewed, getViewedCountForRoot } = useProgressStore.getState()
    markWordViewed('act')
    markWordViewed('action')
    const count = getViewedCountForRoot('act', [0, 1, 2], [
      { word: 'act' },
      { word: 'action' },
      { word: 'active' },
    ])
    expect(count).toBe(2)
  })
})
```

- [ ] **Step 3: 运行测试**

Run: `npx vitest run src/store/__tests__/progress-store.test.ts`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add src/store/progress-store.ts src/store/__tests__/progress-store.test.ts
git commit -m "feat(behavior): add progress store (idempotent, no countdown)"
```

---

### Task 7: 思维导图数据加载器

**Files:**
- Create: `src/lib/mindmap-loader.ts`

- [ ] **Step 1: 实现思维导图数据加载器**

```typescript
// src/lib/mindmap-loader.ts
import type { MindMapData, EnhancedRootNode } from './mindmap-types'

let cachedMindMap: MindMapData | null = null
let loadPromise: Promise<MindMapData> | null = null

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  return res.json()
}

export async function loadMindMapData(): Promise<MindMapData> {
  if (cachedMindMap) return cachedMindMap
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    try {
      const data = await fetchJSON<MindMapData>('/data/enhanced-roots.json')
      cachedMindMap = data
      return data
    } catch (e) {
      loadPromise = null
      throw e
    }
  })()

  return loadPromise
}

export function getCachedMindMap(): MindMapData | null {
  return cachedMindMap
}

export function getCoreRoots(data: MindMapData): EnhancedRootNode[] {
  return data.roots.filter(r => r.layer === 'core')
}

export function getMiddleRoots(data: MindMapData): EnhancedRootNode[] {
  return data.roots.filter(r => r.layer === 'middle')
}

export function findRootByText(data: MindMapData, text: string): EnhancedRootNode | undefined {
  return data.roots.find(r => r.primaryText === text || r.aliases.includes(text))
}
```

- [ ] **Step 2: 提交**

```bash
git add src/lib/mindmap-loader.ts
git commit -m "feat(data): add mindmap data loader with caching"
```

---

## 阶段 3：UI 重构

### Task 8: 首页焦点卡片（替代词根云）

**Files:**
- Create: `src/components/home/FocusCard.tsx`
- Modify: `src/app/page.tsx`

**设计原则:**
- 中央一张大卡片：当前词根
- 主 CTA: "继续看" 或 "开始看"
- 永不显示总数
- 进入门槛 < 1 秒

- [ ] **Step 1: 创建 FocusCard 组件**

```typescript
// src/components/home/FocusCard.tsx
'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { EnhancedRootNode } from '@/lib/mindmap-types'

interface FocusCardProps {
  root: EnhancedRootNode
  viewedCount: number
}

export function FocusCard({ root, viewedCount }: FocusCardProps) {
  const isFirstTime = viewedCount === 0

  return (
    <div className="max-w-xl mx-auto px-4">
      <div className="bg-bg-surface border border-border rounded-2xl p-8 hover:border-accent/30 transition-all duration-300">
        <p className="text-xs text-text-muted uppercase tracking-wider mb-3">
          {isFirstTime ? '今日词根' : '继续这个词根'}
        </p>

        <div className="flex items-baseline gap-3 mb-4">
          <h2 className="text-4xl font-bold font-mono text-root">
            {root.primaryText}
          </h2>
          <span className="text-lg text-text-secondary">{root.meaning}</span>
        </div>

        <p className="text-text-secondary text-sm mb-6">
          {isFirstTime ? '一组关联词，3 分钟看完' : `已看 ${viewedCount} 个词`}
        </p>

        <Link
          href={`/root/${encodeURIComponent(root.primaryText)}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover transition-colors"
        >
          {isFirstTime ? '开始看' : '继续看'}
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 重构首页**

替换 `src/app/page.tsx` 全部内容：

```typescript
// src/app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { FocusCard } from '@/components/home/FocusCard'
import { useSearch } from '@/hooks/useSearch'
import { useAppStore } from '@/store/app-store'
import { useProgressStore } from '@/store/progress-store'
import { loadMindMapData, getCoreRoots } from '@/lib/mindmap-loader'
import type { EnhancedRootNode } from '@/lib/mindmap-types'

export default function HomePage() {
  const { loading, error, retry } = useSearch()
  const { searchIndex } = useAppStore()
  const { currentRoot, setCurrentRoot, completedRoots, getViewedCountForRoot } = useProgressStore()
  const [coreRoots, setCoreRoots] = useState<EnhancedRootNode[]>([])
  const [focusRoot, setFocusRoot] = useState<EnhancedRootNode | null>(null)

  useEffect(() => {
    loadMindMapData().then(data => {
      const cores = getCoreRoots(data)
      setCoreRoots(cores)

      if (currentRoot) {
        const found = cores.find(r => r.primaryText === currentRoot)
        if (found) {
          setFocusRoot(found)
          return
        }
      }

      const next = cores.find(r => !completedRoots.includes(r.primaryText)) || cores[0]
      setFocusRoot(next)
      setCurrentRoot(next?.primaryText || null)
    })
  }, [])

  if (loading || !searchIndex || !focusRoot) {
    return (
      <div className="min-h-screen bg-bg-deep flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary text-sm">加载中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg-deep flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-text-secondary">{error}</p>
          <button
            onClick={retry}
            className="px-6 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  const viewedCount = getViewedCountForRoot(
    focusRoot.primaryText,
    focusRoot.wordIndices,
    searchIndex.data
  )

  return (
    <div className="min-h-screen bg-bg-deep">
      <TopBar />

      <main className="max-w-5xl mx-auto p-6 pt-16">
        <FocusCard root={focusRoot} viewedCount={viewedCount} />
      </main>
    </div>
  )
}
```

- [ ] **Step 3: 运行验证**

Run: `npm run dev`
打开 http://localhost:3000
Expected: 看到单一焦点卡片，不再有词根云和卡片网格

- [ ] **Step 4: 提交**

```bash
git add src/components/home/FocusCard.tsx src/app/page.tsx
git commit -m "feat(ui): replace root cloud with single focus card (Fogg: tiny habit entry)"
```

---

### Task 9: 词根页重构（从列表改为单词会话）

**Files:**
- Create: `src/components/root/RootSession.tsx`
- Modify: `src/app/root/[slug]/page.tsx`

**核心改动:**
- 从"11 个词的列表"改为"一次只看一个词 + 上一个/下一个"
- 顶部进度条显示 `1/5`
- 看完最后一个 → 完成庆祝页

- [ ] **Step 1: 创建词根会话客户端组件**

```typescript
// src/components/root/RootSession.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { PartTags } from '@/components/word/PartTags'
import { SpeakButton } from '@/components/word/SpeakButton'
import { useProgressStore } from '@/store/progress-store'
import type { VocabEntry } from '@/lib/types'

interface RootSessionProps {
  rootText: string
  rootMeaning: string
  words: VocabEntry[]
}

export function RootSession({ rootText, rootMeaning, words }: RootSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const { markWordViewed, markRootCompleted, setCurrentRoot, isRootCompleted } = useProgressStore()

  const current = words[currentIndex]
  const isLast = currentIndex === words.length - 1
  const completed = isRootCompleted(rootText)

  useEffect(() => {
    setCurrentRoot(rootText)
  }, [rootText, setCurrentRoot])

  useEffect(() => {
    if (current) markWordViewed(current.word)
  }, [current, markWordViewed])

  const handleNext = () => {
    if (isLast) {
      markRootCompleted(rootText)
      return
    }
    setCurrentIndex(i => i + 1)
  }

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1)
  }

  if (isLast && completed) {
    return (
      <div className="max-w-2xl mx-auto p-6 lg:p-10 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-accent/20 flex items-center justify-center">
          <Check size={32} className="text-accent" />
        </div>
        <h1 className="text-2xl font-semibold text-text-primary mb-2">
          看完 {rootText}
        </h1>
        <p className="text-text-secondary mb-8">
          这组词你都看过了
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover transition-colors"
        >
          回首页看下一个
          <ArrowRight size={16} />
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 lg:p-10">
      <div className="mb-8">
        <div className="flex items-baseline gap-3 mb-2">
          <h1 className="text-3xl font-bold font-mono text-root">{rootText}</h1>
          <span className="text-text-secondary">{rootMeaning}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1 bg-bg-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-text-muted font-mono">
            {currentIndex + 1}/{words.length}
          </span>
        </div>
      </div>

      <div className="bg-bg-surface border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-3xl font-bold text-text-primary mb-2">{current.word}</h2>
            <p className="text-text-secondary">{current.definition}</p>
          </div>
          <SpeakButton word={current.word} />
        </div>
        <PartTags parts={current.parts} />

        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-sm text-text-secondary leading-relaxed">
            <span className="text-text-primary font-medium">{current.word}</span>
            {' '}由{' '}
            {current.parts.map((part, i) => (
              <span key={i}>
                {i > 0 && ' + '}
                <span className="font-mono text-root">{part.text}</span>
                <span className="text-text-muted">({part.meaning})</span>
              </span>
            ))}
            {' '}组成
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeft size={16} />
          上一个
        </button>

        <button
          onClick={handleNext}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover transition-colors"
        >
          {isLast ? '完成' : '下一个'}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 重构词根详情页**

替换 `src/app/root/[slug]/page.tsx` 全部内容：

```typescript
// src/app/root/[slug]/page.tsx
import { readFileSync } from 'fs'
import { join } from 'path'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { RootSession } from '@/components/root/RootSession'
import type { VocabEntry, RootIndex } from '@/lib/types'
import { notFound } from 'next/navigation'

function loadData() {
  const dataDir = join(process.cwd(), 'public', 'data')
  const vocab: VocabEntry[] = JSON.parse(
    readFileSync(join(dataDir, 'vocab.json'), 'utf-8')
  )
  const rootIndex: RootIndex = JSON.parse(
    readFileSync(join(dataDir, 'roots-index.json'), 'utf-8')
  )
  return { vocab, rootIndex }
}

export function generateStaticParams() {
  const { rootIndex } = loadData()
  return Object.keys(rootIndex).map((slug) => ({ slug }))
}

export default async function RootPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const rootText = decodeURIComponent(slug)
  const { vocab, rootIndex } = loadData()
  const rootEntry = rootIndex[rootText]

  if (!rootEntry) {
    notFound()
  }

  const words = rootEntry.w
    .filter(idx => idx < vocab.length)
    .map(idx => vocab[idx])
    .filter(Boolean)

  return (
    <div className="min-h-screen bg-bg-deep">
      <header className="sticky top-0 z-50 h-[56px] bg-bg-surface/95 backdrop-blur-sm border-b border-border flex items-center px-4 lg:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">返回</span>
        </Link>
      </header>

      <RootSession rootText={rootText} rootMeaning={rootEntry.m} words={words} />
    </div>
  )
}
```

- [ ] **Step 3: 运行验证**

Run: `npm run dev`
访问 http://localhost:3000/root/act
Expected: 一次只看到一个词，有进度条和上一个/下一个按钮

- [ ] **Step 4: 提交**

```bash
git add src/components/root/RootSession.tsx src/app/root/[slug]/page.tsx
git commit -m "feat(ui): convert root page from list to single-word session"
```

---

## 阶段 4：思维导图可视化

### Task 10: 思维导图核心组件

**Files:**
- Create: `src/components/mindmap/MindMap.tsx`

**设计:**
- 中心：当前词根节点
- 一圈：该词根下的词（按角度均匀分布）
- 二圈：通过共现连接的相关词根
- 已看过的词高亮

- [ ] **Step 1: 创建 MindMap 组件**

```typescript
// src/components/mindmap/MindMap.tsx
'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import type { MindMapData, EnhancedRootNode } from '@/lib/mindmap-types'
import type { VocabEntry } from '@/lib/types'
import { useProgressStore } from '@/store/progress-store'

interface MindMapProps {
  data: MindMapData
  vocab: VocabEntry[]
  centerRoot: EnhancedRootNode
}

export function MindMap({ data, vocab, centerRoot }: MindMapProps) {
  const { isWordViewed } = useProgressStore()

  const centerWords = useMemo(() => {
    return centerRoot.wordIndices
      .filter(idx => idx < vocab.length)
      .map(idx => vocab[idx])
  }, [centerRoot, vocab])

  const relatedRoots = useMemo(() => {
    const centerWordIndices = new Set(centerRoot.wordIndices)
    const relatedLinks = data.links.filter(l =>
      centerWordIndices.has(l.fromWordIndex) || centerWordIndices.has(l.toWordIndex)
    )

    const otherWordIndices = new Set<number>()
    for (const link of relatedLinks) {
      if (centerWordIndices.has(link.fromWordIndex)) {
        otherWordIndices.add(link.toWordIndex)
      } else {
        otherWordIndices.add(link.fromWordIndex)
      }
    }

    const rootSet = new Set<string>()
    for (const idx of otherWordIndices) {
      const word = vocab[idx]
      if (!word) continue
      for (const part of word.parts) {
        if (part.type === 'root') rootSet.add(part.text)
      }
    }

    return data.roots.filter(r =>
      r.primaryText !== centerRoot.primaryText &&
      !r.aliases.includes(centerRoot.primaryText) &&
      (rootSet.has(r.primaryText) || r.aliases.some(a => rootSet.has(a)))
    ).slice(0, 6)
  }, [data, centerRoot, vocab])

  return (
    <div className="relative w-full h-[600px] bg-bg-surface/30 rounded-2xl border border-border overflow-hidden">
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
        {centerWords.map((_, i) => {
          const angle = (i / centerWords.length) * Math.PI * 2 - Math.PI / 2
          const x = 50 + 25 * Math.cos(angle)
          const y = 50 + 25 * Math.sin(angle)
          return (
            <line
              key={`line-${i}`}
              x1="50%" y1="50%"
              x2={`${x}%`} y2={`${y}%`}
              stroke="var(--root-color)"
              strokeWidth="1"
              strokeOpacity="0.3"
            />
          )
        })}
      </svg>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="px-4 py-2 rounded-full bg-root/20 border-2 border-root text-root font-mono font-bold">
          {centerRoot.primaryText}
        </div>
      </div>

      {centerWords.map((word, i) => {
        const angle = (i / centerWords.length) * Math.PI * 2 - Math.PI / 2
        const x = 50 + 25 * Math.cos(angle)
        const y = 50 + 25 * Math.sin(angle)
        const viewed = isWordViewed(word.word)
        return (
          <div
            key={word.word}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-5"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <Link
              href={`/word/${encodeURIComponent(word.word)}`}
              className={`block px-3 py-1.5 rounded-full text-xs border transition-all ${
                viewed
                  ? 'bg-accent/10 border-accent/30 text-accent'
                  : 'bg-bg-surface border-border text-text-secondary hover:border-accent/30 hover:text-text-primary'
              }`}
            >
              {word.word}
            </Link>
          </div>
        )
      })}

      {relatedRoots.map((root, i) => {
        const angle = (i / Math.max(relatedRoots.length, 1)) * Math.PI * 2 - Math.PI / 2
        const x = 50 + 42 * Math.cos(angle)
        const y = 50 + 42 * Math.sin(angle)
        return (
          <div
            key={root.primaryText}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-5"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <Link
              href={`/root/${encodeURIComponent(root.primaryText)}`}
              className="block px-3 py-1 rounded-full bg-bg-elevated border border-border text-xs text-text-muted hover:text-root hover:border-root/30 transition-all"
            >
              {root.primaryText}
            </Link>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/mindmap/MindMap.tsx
git commit -m "feat(ui): add mindmap visualization component (center root + word leaves + related roots)"
```

---

## 阶段 5：行为闭环完善

### Task 11: 微庆祝反馈组件

**Files:**
- Create: `src/components/feedback/MicroCelebrate.tsx`
- Modify: `src/components/root/RootSession.tsx`

- [ ] **Step 1: 实现微庆祝组件**

```typescript
// src/components/feedback/MicroCelebrate.tsx
'use client'

import { useEffect, useState } from 'react'

interface MicroCelebrateProps {
  trigger: number
  message?: string
}

export function MicroCelebrate({ trigger, message = '已看' }: MicroCelebrateProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (trigger === 0) return
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), 800)
    return () => clearTimeout(timer)
  }, [trigger])

  if (!visible) return null

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="px-4 py-2 rounded-full bg-accent/90 text-white text-sm shadow-lg animate-pulse">
        {message}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 在 RootSession 中使用**

修改 `src/components/root/RootSession.tsx`，在文件顶部 import 区添加：

```typescript
import { MicroCelebrate } from '@/components/feedback/MicroCelebrate'
```

在 `RootSession` 组件函数体内，`return` 之前添加（计算 viewedCount）：

```typescript
const viewedCount = useProgressStore(s => s.getViewedCountForRoot(
  rootText,
  words.map((_, i) => i),
  words
))
```

在 `return` 的最外层 `<div>` 闭合标签前添加：

```tsx
      <MicroCelebrate trigger={viewedCount} message={`已看 ${viewedCount}/${words.length}`} />
```

- [ ] **Step 3: 运行验证**

Run: `npm run dev`
访问词根页，点击"下一个"
Expected: 底部出现短暂的"已看 X/Y"提示，0.8 秒后消失

- [ ] **Step 4: 提交**

```bash
git add src/components/feedback/MicroCelebrate.tsx src/components/root/RootSession.tsx
git commit -m "feat(behavior): add micro celebration feedback (Fogg: celebration cements habit)"
```

---

### Task 12: 移除数量暴露，清理旧组件

**Files:**
- Delete: `src/components/search/RootCloud.tsx`

- [ ] **Step 1: 删除 RootCloud 组件**

```bash
git rm src/components/search/RootCloud.tsx
```

- [ ] **Step 2: 验证无残留引用**

Run: 用 Grep 工具搜索 `RootCloud` in `src/`
Expected: 无匹配

- [ ] **Step 3: 验证构建**

Run: `npm run build`
Expected: 成功，无 TypeScript 错误

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "refactor: remove RootCloud (replaced by FocusCard) and clean up count exposure"
```

---

## 阶段 6：验证与文档

### Task 13: 端到端验证

- [ ] **Step 1: 运行所有测试**

Run: `npm run test`
Expected: 全部 PASS

- [ ] **Step 2: 构建验证**

Run: `npm run build`
Expected: 成功，所有 SSG 页面生成

- [ ] **Step 3: Lint 验证**

Run: `npm run lint`
Expected: 无 error

- [ ] **Step 4: 数据完整性验证**

Run: `npm run build:mindmap`
检查输出 stats:
- coreRoots 应该在 25-40 之间
- middleRoots 应该在 80-120 之间
- edgeRoots 应该在 400-550 之间
- mergedGroups 应该 < 613（原词根数）
- totalLinks 应该 > 1000

- [ ] **Step 5: 手动行为验证**

打开浏览器访问 http://localhost:3000：
1. 首页只显示一张焦点卡片，没有词根云和卡片网格
2. 点击"开始看"进入词根会话页
3. 一次只看到一个词，有进度条
4. 点击"下一个"，底部出现微庆祝
5. 看完最后一个，显示完成页
6. 返回首页，焦点卡片显示"继续这个词根"或切换到下一个未完成词根
7. 全程没有"X 个结果"或"还剩 Y 个"的暴露

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "test: end-to-end verification complete"
```

---

### Task 14: 更新重建提示词

**Files:**
- Modify: `REBUILD_PROMPT.md`

- [ ] **Step 1: 在 REBUILD_PROMPT.md 末尾追加新章节**

```markdown
---

## 十一、思维导图与行为设计补充（v2）

### 11.1 数据增强
- 新增 `public/data/enhanced-roots.json`（由 `npm run build:mindmap` 生成）
- 三层结构：core (>=10词) / middle (4-9词) / edge (<4词)
- 同义词根保守合并：meaning 相等 + 首字母相同 + 编辑距离 <= 2
- TF-IDF 共现连接：权重 = 1/频次，阈值 0.1（过滤高频后缀噪声）

### 11.2 行为设计（福格模型）
- 首页改为单点焦点卡片（替代词根云）
- 词根页改为单词会话（替代列表）
- localStorage 持久化已看/已完成状态
- 永不暴露"未完成数量"
- 微庆祝反馈（0.8 秒 toast）

### 11.3 核心原则
- 数据构建只用算法，不用 AI 语义判断
- 宁可漏连，不要错连
- 单次行为 < 3 分钟
- 不引入艾宾浩斯式复习计划
```

- [ ] **Step 2: 提交**

```bash
git add REBUILD_PROMPT.md
git commit -m "docs: update rebuild prompt with mindmap and behavior design (v2)"
```

---

## 总结

### 关键决策回顾

| 决策 | 选择 | 拒绝的方案 | 理由 |
|---|---|---|---|
| 数据构建 | 100% 算法化 | AI 语义判断 | 0 bug 风险 |
| 同义合并 | 保守合并（3 条硬规则） | 激进 AI 合并 | 宁漏不错 |
| 共现连接 | TF-IDF 阈值 | 人工标注 | 可复现可测试 |
| 信息架构 | 思维导图（分层后 31 节点） | 平铺 613 词根 | 避免母组块压迫 |
| 行为模型 | 福格 B=MAP | 艾宾浩斯曲线 | 内在动机驱动 |
| 进度反馈 | 只标记已做 | 倒计时未做 | 避免焦虑 |

### 验收标准

- [ ] `npm run test` 全部通过
- [ ] `npm run build` 成功
- [ ] `npm run build:mindmap` 输出合理的 stats
- [ ] 首页只显示焦点卡片，无数值暴露
- [ ] 词根页为单词会话，有微庆祝
- [ ] 数据构建 0 AI 判断，可复现
