// 词根义 ↔ 开源语素义 比对桥表（纯函数）
//
// 说明：开源词源数据（etymwn / etymonline）不提供中文词根释义。为了机判
// 「词库中的中文词根义」与「开源数据给出的英文语素义」是否一致，这里内置一张
// 固定的 root → 英文关键词干 桥表（覆盖校验一抽样的 core 36 + middle 24 词根，
// 形态类词根如 at/as/ition/sion/care 无公认古典语源，不设条目，判 unverified）。
//
// 桥表仅是比对工具，不作为证据写入报告；报告中每条 mismatch/match 均附
// 开源数据原文 gloss，供人工复核。桥表本身可在人工复核流程中修订。

/** 词根 → 语素义英文关键词（词干级，大小写无关） */
export const MEANING_BRIDGE: Record<string, string[]> = {
  // ---- core 36（去掉形态类：at / as / ition / care）----
  act: ['do', 'act', 'deed', 'drive', 'done'],
  cept: ['take', 'seize', 'hold', 'catch', 'receive'],
  ceed: ['go', 'walk', 'cede', 'yield', 'proceed'],
  dict: ['say', 'speak', 'tell', 'proclaim', 'dictate'],
  ver: ['true', 'truth'],
  duce: ['lead', 'guide', 'draw', 'bring', 'conduct'],
  fect: ['do', 'make', 'perform', 'effect'],
  fer: ['carry', 'bear', 'bring', 'confer'],
  fin: ['end', 'limit', 'bound', 'finish', 'final'],
  form: ['form', 'shape', 'mold', 'mould'],
  miss: ['send', 'throw', 'mission', 'dismiss'],
  port: ['carry', 'bear', 'bring', 'transport'],
  pos: ['put', 'place', 'set', 'posit', 'position'],
  manu: ['hand'],
  spect: ['look', 'see', 'watch', 'observe', 'behold', 'view', 'inspect'],
  vis: ['see', 'sight', 'view', 'vision'],
  stit: ['stand', 'establish', 'set up', 'institute'],
  vert: ['turn', 'convert', 'reverse'],
  tain: ['hold', 'keep', 'retain', 'contain'],
  sent: ['feel', 'sense', 'perceive', 'sentiment'],
  her: ['stick', 'cling', 'attach', 'adhere'],
  vent: ['come', 'arrive', 'advent'],
  part: ['part', 'portion', 'divide', 'share'],
  plic: ['fold', 'bend', 'ply', 'double'],
  sign: ['sign', 'mark', 'signal', 'seal'],
  sum: ['take', 'consume', 'assume', 'sumpt'],
  sur: ['sure', 'secure', 'certain'],
  mote: ['move', 'motion', 'remot', 'promot'],
  sid: ['sit', 'settle', 'seat', 'reside'],
  leg: ['read', 'law', 'gather', 'choose', 'depute', 'legacy'],
  mon: ['warn', 'advise', 'remind', 'monitor', 'admonish'],
  serv: ['serve', 'keep', 'save', 'servant', 'preserve'],
  // ---- middle 按 wordCount 前 24（去掉形态类：sion）----
  tend: ['stretch', 'extend', 'tend', 'attention'],
  gen: ['birth', 'beget', 'race', 'kind', 'produce', 'generate'],
  pet: ['seek', 'strive', 'aim', 'request'],
  vail: ['worth', 'value', 'strong', 'avail', 'prevail'],
  clos: ['shut', 'close', 'enclose', 'conclude'],
  min: ['small', 'less', 'minor', 'diminish', 'project', 'eminent'],
  ject: ['throw', 'cast', 'hurl', 'reject'],
  tract: ['draw', 'pull', 'drag', 'attract', 'extract'],
  spir: ['breathe', 'breath', 'spirit', 'inspire'],
  equ: ['equal', 'even', 'equity'],
  struct: ['build', 'pile', 'arrange', 'construct', 'structure'],
  sol: ['sun', 'alone', 'sole', 'whole', 'solid', 'console'],
  pan: ['bread', 'all', 'pantry'],
  log: ['word', 'speak', 'reason', 'study', 'discourse', 'logic'],
  fort: ['strong', 'strength', 'fort', 'chance', 'fortunate'],
  mem: ['mind', 'memory', 'remember', 'mention'],
  ord: ['order', 'row', 'arrange', 'rank', 'ordinary'],
  not: ['know', 'note', 'mark', 'notice', 'notify'],
  terr: ['earth', 'land', 'territory'],
  press: ['press', 'push', 'squeeze'],
  voc: ['call', 'voice', 'name', 'invoke', 'advocate'],
  sci: ['know', 'knowledge', 'science'],
  cent: ['hundred', 'cent', 'percent'],
}

export type MeaningVerdictPure = 'match' | 'mismatch' | 'unverified'

/** 把英文 gloss 拆成词干 token（小写、去标点、保留 ≥3 字母） */
export function glossTokens(gloss: string): string[] {
  return gloss
    .toLowerCase()
    .replace(/[^a-z\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((t) => t.length >= 3)
}

/** 词干级前缀匹配（双向），用于容纳屈折变化（see/seeing、carry/carried） */
export function stemMatch(token: string, keyword: string): boolean {
  if (token === keyword) return true
  if (token.length >= 3 && keyword.length >= 3) {
    return token.startsWith(keyword) || keyword.startsWith(token)
  }
  return false
}

/**
 * 词根义机判：
 * - 无桥表条目或无 gloss → 'unverified'
 * - gloss 词干与关键词有交集 → 'match'
 * - 有 gloss 有条目但无交集 → 'mismatch'
 */
export function verdictMeaning(rootText: string, gloss?: string): MeaningVerdictPure {
  if (!gloss) return 'unverified'
  const keywords = MEANING_BRIDGE[rootText]
  if (!keywords || keywords.length === 0) return 'unverified'
  const tokens = glossTokens(gloss)
  if (tokens.length === 0) return 'unverified'
  for (const t of tokens) {
    for (const k of keywords) {
      // 关键词可能本身含空格（如 "set up"），退化为包含判断
      if (k.includes(' ')) {
        if (gloss.toLowerCase().includes(k)) return 'match'
        continue
      }
      if (stemMatch(t, k)) return 'match'
    }
  }
  return 'mismatch'
}
