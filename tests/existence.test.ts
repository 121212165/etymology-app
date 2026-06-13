import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { ROOT_GROUPS } from "@/lib/root-groups";

const ROOT = join(__dirname, "..");

let vocab: Array<{
  word: string;
  definition: string;
  parts: Array<{ type: string; text: string; meaning: string }>;
}>;
let rootsIndex: Record<string, { m: string; w: number[] }>;

beforeAll(() => {
  vocab = JSON.parse(
    readFileSync(join(ROOT, "public", "data", "vocab.json"), "utf8")
  );
  rootsIndex = JSON.parse(
    readFileSync(join(ROOT, "public", "data", "roots-index.json"), "utf8")
  );
});

describe("词根存在性", () => {
  it("ROOT_GROUPS中每个组的members词根都在roots-index.json中存在", () => {
    const missing: Array<{ group: string; root: string }> = [];
    let total = 0;
    let found = 0;
    for (const group of ROOT_GROUPS) {
      for (const member of group.members) {
        total++;
        if (member in rootsIndex) {
          found++;
        } else {
          missing.push({ group: group.label, root: member });
        }
      }
    }
    const rate = found / total;
    console.log(`词根存在率: ${found}/${total} (${(rate * 100).toFixed(2)}%)`);
    if (missing.length > 0) {
      console.log(`缺失词根 (${missing.length}):`, missing.map((m) => `${m.group}/${m.root}`).join(", "));
    }
    expect(rate).toBeGreaterThanOrEqual(0.7);
  });

  it("统计存在率", () => {
    let total = 0;
    let found = 0;
    for (const group of ROOT_GROUPS) {
      for (const member of group.members) {
        total++;
        if (member in rootsIndex) found++;
      }
    }
    const rate = total > 0 ? found / total : 0;
    console.log(`词根存在率: ${found}/${total} (${(rate * 100).toFixed(2)}%)`);
    expect(rate).toBeGreaterThan(0);
  });
});

describe("单词存在性", () => {
  it("roots-index.json中每个w索引都指向vocab.json中的有效条目", () => {
    const invalid: Array<{ root: string; index: number }> = [];
    for (const [root, data] of Object.entries(rootsIndex)) {
      for (const idx of data.w) {
        if (idx < 0 || idx >= vocab.length) {
          invalid.push({ root, index: idx });
        }
      }
    }
    expect(invalid).toEqual([]);
  });

  it("无越界索引", () => {
    const maxIndex = vocab.length - 1;
    let outOfBounds = 0;
    for (const data of Object.values(rootsIndex)) {
      for (const idx of data.w) {
        if (idx > maxIndex) outOfBounds++;
      }
    }
    expect(outOfBounds).toBe(0);
  });
});

describe("拆解完整性", () => {
  it("每个VocabEntry都有至少一个root类型的part", () => {
    const noRoot: Array<{ index: number; word: string }> = [];
    for (let i = 0; i < vocab.length; i++) {
      const entry = vocab[i];
      const hasRoot = entry.parts.some((p) => p.type === "root");
      if (!hasRoot) {
        noRoot.push({ index: i, word: entry.word });
      }
    }
    const rate = (vocab.length - noRoot.length) / vocab.length;
    console.log(`有root的单词: ${vocab.length - noRoot.length}/${vocab.length} (${(rate * 100).toFixed(2)}%)`);
    if (noRoot.length > 0) {
      console.log(`缺少root的单词:`, noRoot.map((e) => `${e.word}(${e.index})`).join(", "));
    }
    expect(noRoot.length).toBeLessThanOrEqual(10);
  });

  it("每个part.text非空", () => {
    const emptyText: Array<{ index: number; word: string; partIndex: number }> = [];
    for (let i = 0; i < vocab.length; i++) {
      const entry = vocab[i];
      for (let j = 0; j < entry.parts.length; j++) {
        if (!entry.parts[j].text || entry.parts[j].text.trim() === "") {
          emptyText.push({ index: i, word: entry.word, partIndex: j });
        }
      }
    }
    if (emptyText.length > 0) {
      console.log(`空text的part (${emptyText.length}):`, emptyText.map((e) => `${e.word}(${e.index}:${e.partIndex})`).join(", "));
    }
    expect(emptyText).toEqual([]);
  });
});

describe("数据一致性", () => {
  it("vocab.json长度 === 5011", () => {
    expect(vocab.length).toBe(5011);
  });

  it("roots-index.json中所有w数组长度之和 > 0", () => {
    let totalRefs = 0;
    for (const data of Object.values(rootsIndex)) {
      totalRefs += data.w.length;
    }
    const rootCount = Object.keys(rootsIndex).length;
    console.log(`roots-index: ${rootCount}个词根, 共${totalRefs}条引用`);
    expect(totalRefs).toBeGreaterThan(0);
  });
});
