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
