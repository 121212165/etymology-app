import { describe, it, expect } from "vitest";
import { ROOT_GROUPS } from "../root-groups";

// Collect all members across groups for cross-group checks
const allMembers = ROOT_GROUPS.flatMap((g) => g.members);
const uniqueMembers = new Set(allMembers);

describe("ROOT_GROUPS 结构完整性", () => {
  it("ROOT_GROUPS 是非空数组", () => {
    expect(Array.isArray(ROOT_GROUPS)).toBe(true);
    expect(ROOT_GROUPS.length).toBeGreaterThan(0);
  });

  it("每个 group 有 label, icon, members 字段", () => {
    for (const group of ROOT_GROUPS) {
      expect(group).toHaveProperty("label");
      expect(group).toHaveProperty("icon");
      expect(group).toHaveProperty("members");
    }
  });

  it("label 和 icon 是非空字符串", () => {
    for (const group of ROOT_GROUPS) {
      expect(typeof group.label).toBe("string");
      expect(group.label.length).toBeGreaterThan(0);
      expect(typeof group.icon).toBe("string");
      expect(group.icon.length).toBeGreaterThan(0);
    }
  });

  it("members 是非空字符串数组", () => {
    for (const group of ROOT_GROUPS) {
      expect(Array.isArray(group.members)).toBe(true);
      expect(group.members.length).toBeGreaterThan(0);
      for (const member of group.members) {
        expect(typeof member).toBe("string");
        expect(member.length).toBeGreaterThan(0);
      }
    }
  });

  it("总词根数量 >= 150", () => {
    expect(uniqueMembers.size).toBeGreaterThanOrEqual(150);
  });
});

describe("无重复词根", () => {
  it("所有 group 的 members 合并后无重复（跨组去重是设计意图）", () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const group of ROOT_GROUPS) {
      for (const member of group.members) {
        if (seen.has(member)) {
          duplicates.push(member);
        } else {
          seen.add(member);
        }
      }
    }

    expect(duplicates).toEqual([]);
  });
});

describe("词根质量 — 不应包含的普通英文单词", () => {
  const excludedWords = [
    "the", "but", "have", "like", "wear", "work", "home", "good", "feel",
    "friend", "fish", "fix", "file", "fool", "follow", "gain", "gather",
    "guard", "hunt", "kill", "king", "know", "land", "learn", "lie",
    "meet", "mean", "new", "night", "open", "pain", "paint", "park", "pay",
    "peace", "pen", "plant", "pot", "power", "rage", "rich", "roll", "search",
    "secret", "self", "settle", "short", "think", "train", "turn", "warn",
    "weak", "wire", "wit", "call", "card", "care", "cast", "certain",
    "change", "charge", "class", "cloth", "dark", "doubt", "draw", "fail",
    "faith", "farm", "fashion", "favor", "fellow", "market", "mass", "method",
    "music", "owner", "pack", "poison", "pop", "public", "second", "success",
    "suit", "teach", "ach", "ast", "bank", "bat", "cell", "dam", "fur", "ill",
    "joy", "line", "mom", "van",
  ];

  it.each(excludedWords)("%s 不应出现在任何 group 的 members 中", (word) => {
    expect(allMembers).not.toContain(word);
  });
});

describe("词根质量 — 必须包含的核心词根", () => {
  const coreRoots = [
    "vis", "spect", "dict", "scribe", "ced", "cess", "fer", "port", "duct",
    "mit", "cap", "cept", "struct", "form", "vert", "gen", "sci", "sent",
    "cred", "leg", "jur", "sign", "pre", "re", "dis", "con", "ex", "sub",
    "super",
  ];

  it.each(coreRoots)("%s 是核心词根，必须存在", (root) => {
    expect(uniqueMembers.has(root)).toBe(true);
  });
});

describe("分组合理性", () => {
  const findByLabel = (label: string) =>
    ROOT_GROUPS.find((g) => g.label === label);

  it(`"前缀与方向"组的 members 数量 >= 30`, () => {
    const group = findByLabel("前缀与方向");
    expect(group).toBeDefined();
    expect(group!.members.length).toBeGreaterThanOrEqual(30);
  });

  it(`"看与观察"组包含 vis 和 spect`, () => {
    const group = findByLabel("看与观察");
    expect(group).toBeDefined();
    expect(group!.members).toContain("vis");
    expect(group!.members).toContain("spect");
  });

  it(`"说与语言"组包含 dict`, () => {
    const group = findByLabel("说与语言");
    expect(group).toBeDefined();
    expect(group!.members).toContain("dict");
  });

  it(`"行走与移动"组包含 ced 和 fer`, () => {
    const group = findByLabel("行走与移动");
    expect(group).toBeDefined();
    expect(group!.members).toContain("ced");
    expect(group!.members).toContain("fer");
  });
});

describe("数据格式验证", () => {
  const lowercaseOnly = /^[a-z]+$/;

  it("每个 member 只包含小写字母（无数字、无大写、无特殊字符）", () => {
    for (const group of ROOT_GROUPS) {
      for (const member of group.members) {
        expect(member).toMatch(lowercaseOnly);
      }
    }
  });
});
