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
 * 按实际频次过滤：若某 part（如 ion/ing/ed 等高频后缀）在全库出现 > 10 次，
 * 其权重将低于阈值从而被自动过滤；具体过滤哪些 part 取决于实际数据频次。
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
