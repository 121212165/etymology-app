// src/components/mindmap/__tests__/MindMap.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type React from "react";
import { MindMap } from "../MindMap";
import { useProgressStore } from "@/store/progress-store";
import type { VocabEntry } from "@/lib/types";
import type { MindMapData, EnhancedRootNode } from "@/lib/mindmap-types";

// next/link 在 jsdom 环境下渲染为普通 <a>
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// 4 词 fixture：variants = [ceed, cess, cede]，impress 的词根 press 无命中（应排面板末尾）。
// wordIndices 顺序刻意不按聚簇序，用于验证排序。
const vocab: VocabEntry[] = [
  {
    word: "success",
    definition: "accomplishment",
    parts: [
      { type: "prefix", text: "suc", meaning: "下" },
      { type: "root", text: "cess", meaning: "走" },
    ],
  },
  {
    word: "exceed",
    definition: "go beyond",
    parts: [
      { type: "prefix", text: "ex", meaning: "出" },
      { type: "root", text: "ceed", meaning: "走" },
    ],
  },
  {
    word: "recede",
    definition: "go back",
    parts: [
      { type: "prefix", text: "re", meaning: "回" },
      { type: "root", text: "cede", meaning: "走" },
    ],
  },
  {
    word: "impress",
    definition: "leave a mark",
    parts: [
      { type: "prefix", text: "im", meaning: "进入" },
      { type: "root", text: "press", meaning: "压" },
    ],
  },
];

const centerRoot: EnhancedRootNode = {
  primaryText: "ceed",
  aliases: ["cess", "cede"],
  meaning: "走",
  layer: "core",
  wordIndices: [0, 1, 2, 3],
  wordCount: 4,
};

const data: MindMapData = {
  roots: [centerRoot],
  links: [],
  stats: {
    totalRoots: 1,
    coreRoots: 1,
    middleRoots: 0,
    edgeRoots: 0,
    mergedGroups: 0,
    totalLinks: 0,
  },
};

function renderMindMap(props: { currentWord?: string } = {}) {
  return render(<MindMap data={data} vocab={vocab} centerRoot={centerRoot} {...props} />);
}

describe("MindMap", () => {
  beforeEach(() => {
    // 每个用例前重置 store，避免相互污染
    useProgressStore.setState({
      viewedWords: [],
      viewedWordSet: {},
      completedRoots: [],
      currentRoot: null,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders two panels with leaves clustered by variant", () => {
    const { container } = renderMindMap();
    const panels = container.querySelectorAll(".mindmap-panel");
    expect(panels).toHaveLength(2);

    // 左面板：ceed 簇在前（字母序 exceed < 无关），cess 簇在后——输入顺序是 success 在前
    const leftLeaves = Array.from(panels[0].querySelectorAll("a.mindmap-leaf")).map(
      (a) => a.textContent
    );
    expect(leftLeaves).toEqual(["exceed", "success"]);

    // 右面板：cede 簇在前，无命中变体的 impress 排末尾
    const rightLeaves = Array.from(panels[1].querySelectorAll("a.mindmap-leaf")).map(
      (a) => a.textContent
    );
    expect(rightLeaves).toEqual(["recede", "impress"]);

    // 中心 chip 下方显示 aliases（两个面板各一处）
    expect(screen.getAllByText("cess · cede")).toHaveLength(2);
  });

  it("highlights the current word leaf and dims the panel without it", () => {
    const { container } = renderMindMap({ currentWord: "success" });

    // 命中叶子：高亮类名 + aria-current
    const currentLeaf = screen.getByText("success");
    expect(currentLeaf).toHaveClass("mindmap-leaf--current");
    expect(currentLeaf).toHaveAttribute("aria-current", "true");

    // 其余叶子弱化
    expect(screen.getByText("exceed")).toHaveClass("mindmap-leaf--muted");
    expect(screen.getByText("recede")).toHaveClass("mindmap-leaf--muted");
    expect(screen.getByText("impress")).toHaveClass("mindmap-leaf--muted");

    // success 在左面板：左面板保持原样，右面板整体弱化
    const panels = container.querySelectorAll(".mindmap-panel");
    expect(panels[0]).not.toHaveClass("mindmap-panel--dimmed");
    expect(panels[1]).toHaveClass("mindmap-panel--dimmed");
  });

  it("does not highlight or dim when currentWord is not provided", () => {
    const { container } = renderMindMap();

    expect(container.querySelector(".mindmap-leaf--current")).toBeNull();
    expect(container.querySelector("[aria-current]")).toBeNull();
    expect(container.querySelector(".mindmap-leaf--muted")).toBeNull();
    expect(container.querySelector(".mindmap-panel--dimmed")).toBeNull();
  });

  it("ignores focus styling when currentWord is not in the map", () => {
    // 词不在导图中：不做高亮/弱化，避免整图降透明度
    const { container } = renderMindMap({ currentWord: "nonexistent" });

    expect(container.querySelector(".mindmap-leaf--current")).toBeNull();
    expect(container.querySelector(".mindmap-leaf--muted")).toBeNull();
    expect(container.querySelector(".mindmap-panel--dimmed")).toBeNull();
  });
});
