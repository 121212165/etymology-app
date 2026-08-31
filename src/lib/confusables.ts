// src/lib/confusables.ts
// 易混词根对比：手工整理的形近/义近词根对（覆盖 core 层常见混淆）。
// 键为词根 primaryText，值为需要对比展示的「其他词根」；两侧互为条目，
// 词根页/学习会话据此渲染对比条，帮助区分（如 cid 切 vs sid 坐）。

export interface ConfusableEntry {
  text: string;
  meaning: string;
  /** 代表词（2 个），辅助建立直觉 */
  sample: [string, string];
}

export const CONFUSABLE_ROOTS: Record<string, ConfusableEntry[]> = {
  cept: [{ text: "ceive", meaning: "拿", sample: ["receive", "perceive"] }],
  ceive: [{ text: "cept", meaning: "拿", sample: ["concept", "accept"] }],
  ceed: [{ text: "gress", meaning: "走", sample: ["progress", "aggressive"] }],
  gress: [{ text: "ceed", meaning: "走", sample: ["proceed", "succeed"] }],
  pens: [{ text: "pend", meaning: "悬挂", sample: ["suspend", "pension"] }],
  pend: [{ text: "pens", meaning: "支付", sample: ["expense", "compensate"] }],
  struct: [{ text: "stit", meaning: "建立", sample: ["institute", "constitute"] }],
  stit: [{ text: "struct", meaning: "建造", sample: ["construct", "structure"] }],
  dict: [{ text: "log", meaning: "说", sample: ["dialogue", "apology"] }],
  log: [{ text: "dict", meaning: "说", sample: ["predict", "verdict"] }],
  lect: [{ text: "leg", meaning: "法律", sample: ["legal", "privilege"] }],
  leg: [{ text: "lect", meaning: "选择", sample: ["elect", "select"] }],
  tract: [{ text: "tact", meaning: "触摸", sample: ["contact", "tactful"] }],
  tact: [{ text: "tract", meaning: "拉", sample: ["extract", "attract"] }],
  cid: [{ text: "sid", meaning: "坐", sample: ["reside", "president"] }],
  sid: [{ text: "cid", meaning: "切", sample: ["incident", "decide"] }],
  gen: [{ text: "nat", meaning: "出生", sample: ["native", "nature"] }],
  nat: [{ text: "gen", meaning: "产生", sample: ["generate", "genetic"] }],
};
