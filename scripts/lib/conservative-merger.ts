import { editDistance } from './edit-distance'

export interface MergeInput {
  text: string
  meaning: string
  wordIndices: number[]
}

/**
 * 合并黑名单：命中条目不参与任何合并（始终保持独立组）。
 *
 * 背景：上游 roots-index.json 中 fair（词 affair/fair/unfair）意义被错标为
 * "做"，曾按编辑距离 2 与 fic 合并、再并入 fect，导致 unfair 出现在 fect 组。
 * 黑名单条目即使满足全部合并条件也不合并。
 */
export const MERGE_BLACKLIST: ReadonlySet<string> = new Set(['fair'])

export interface MergeGroup {
  texts: string[]
  meaning: string
  wordIndices: number[]
  primaryText: string  // 主文本（最长的，作为展示名）
}

/**
 * 保守合并规则（全部硬条件，0 AI 语义判断）:
 * 1. 任一条目在合并黑名单中 → 不合并
 * 2. meaning 字符串完全相等
 * 3. 首字母相同
 * 4. 编辑距离 <= 2
 *
 * 设计取舍：宁可漏合并，不要错合并。
 * 注：曾尝试对 <=4 字符词根收紧到距离 1，但会拆散大量合法变体组
 * （ceed/cess、duce/duct、tain/tent、vert/vers、sta/stit…），故保持 2，
 * 错合并（fair→fic）由黑名单精准阻断。
 */
export function shouldMerge(
  a: { text: string; meaning: string },
  b: { text: string; meaning: string }
): boolean {
  if (MERGE_BLACKLIST.has(a.text) || MERGE_BLACKLIST.has(b.text)) return false
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
