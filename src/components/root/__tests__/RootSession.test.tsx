// src/components/root/__tests__/RootSession.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type React from "react";
import { RootSession } from "../RootSession";
import { useProgressStore } from "@/store/progress-store";
import type { VocabEntry } from "@/lib/types";

// next/link 在 jsdom 环境下渲染为普通 <a>
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// RootSession 用 useRouter 做完成后的自动跳转；测试中记录 push 调用即可
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// SpeakButton / PartTags / MindMap / MicroCelebrate 都是子组件，mock 掉以隔离 RootSession 逻辑
vi.mock("@/components/word/SpeakButton", () => ({
  SpeakButton: () => <button data-testid="speak">speak</button>,
}));
vi.mock("@/components/word/PartTags", () => ({
  PartTags: () => <div data-testid="parts" />,
}));
vi.mock("@/components/mindmap/MindMap", () => ({
  MindMap: () => <div data-testid="mindmap" />,
}));
vi.mock("@/components/feedback/MicroCelebrate", () => ({
  MicroCelebrate: ({ message }: { message?: string }) => (
    <div data-testid="celebrate">{message ?? ""}</div>
  ),
}));
// 懒加载 mindmap 数据：测试中不触发
vi.mock("@/lib/mindmap-loader", () => ({
  loadMindMapData: vi.fn().mockResolvedValue(null),
}));

const sampleWords: VocabEntry[] = [
  {
    word: "act",
    definition: "to do",
    parts: [{ type: "root", text: "act", meaning: "做" }],
  },
  {
    word: "action",
    definition: "something done",
    parts: [
      { type: "root", text: "act", meaning: "做" },
      { type: "suffix", text: "ion", meaning: "行为" },
    ],
  },
  {
    word: "active",
    definition: "characterized by action",
    parts: [
      { type: "root", text: "act", meaning: "做" },
      { type: "suffix", text: "ive", meaning: "倾向" },
    ],
  },
];

describe("RootSession", () => {
  beforeEach(() => {
    // 每个用例前重置 store，避免相互污染
    useProgressStore.setState({
      viewedWords: [],
      viewedWordSet: {},
      completedRoots: [],
      currentRoot: null,
      quizResults: {},
    });
    pushMock.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders first word and root title on mount", () => {
    render(
      <RootSession
        rootText="act"
        rootMeaning="做"
        words={sampleWords}
      />
    );
    // 词根标题用 heading level 1，单词用 heading level 2
    expect(screen.getByRole("heading", { level: 1, name: "act" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "act" })).toBeInTheDocument();
    expect(screen.getByText("to do")).toBeInTheDocument();
    expect(screen.getByText("下一个")).toBeInTheDocument();
  });

  it("marks word as viewed in progress store on mount", () => {
    render(
      <RootSession rootText="act" rootMeaning="做" words={sampleWords} />
    );
    expect(useProgressStore.getState().isWordViewed("act")).toBe(true);
  });

  it("advances to next word on clicking '下一个'", () => {
    render(
      <RootSession rootText="act" rootMeaning="做" words={sampleWords} />
    );
    fireEvent.click(screen.getByText("下一个"));
    // 第二个词：heading level 2 是单词标题
    expect(screen.getByRole("heading", { level: 2, name: "action" })).toBeInTheDocument();
    expect(screen.getByText("something done")).toBeInTheDocument();
    expect(useProgressStore.getState().isWordViewed("action")).toBe(true);
  });

  it("marks root completed and shows celebration page after last word", () => {
    render(
      <RootSession rootText="act" rootMeaning="做" words={sampleWords} />
    );
    // 走到最后一个词
    fireEvent.click(screen.getByText("下一个")); // -> action
    fireEvent.click(screen.getByText("下一个")); // -> active
    // 最后一个词的按钮文本应为"完成"
    expect(screen.getByText("完成")).toBeInTheDocument();
    fireEvent.click(screen.getByText("完成"));

    expect(useProgressStore.getState().isRootCompleted("act")).toBe(true);
    // 完成页文案（"看完" 和词根文本 "act" 被分别包裹在不同元素中）
    expect(screen.getByText(/看完/)).toBeInTheDocument();
    expect(screen.getByText("act")).toBeInTheDocument();
  });

  it("disables '上一个' on first word", () => {
    render(
      <RootSession rootText="act" rootMeaning="做" words={sampleWords} />
    );
    const prevButton = screen.getByText("上一个").closest("button");
    expect(prevButton).toBeDisabled();
  });

  it("can go back to previous word", () => {
    render(
      <RootSession rootText="act" rootMeaning="做" words={sampleWords} />
    );
    fireEvent.click(screen.getByText("下一个")); // -> action
    fireEvent.click(screen.getByText("上一个")); // -> act
    expect(screen.getByText("to do")).toBeInTheDocument();
  });

  it("renders empty state when words array is empty", () => {
    render(
      <RootSession rootText="act" rootMeaning="做" words={[]} />
    );
    expect(screen.getByText("这组词还没有内容")).toBeInTheDocument();
  });

  it("sets currentRoot in store on mount", () => {
    render(
      <RootSession rootText="act" rootMeaning="做" words={sampleWords} />
    );
    expect(useProgressStore.getState().currentRoot).toBe("act");
  });

  it("falls back to first word when currentIndex goes out of bounds", () => {
    // 边界保护：词根切换时若上层未通过 key 重挂载，currentIndex 可能越过新 words 的长度。
    // 此处验证 render 阶段的兜底，避免读取 undefined.word 崩溃。
    // 正常词根切换的重置由 page 层 key={displayRootText} 保证，这里只测防御层。
    const { rerender } = render(
      <RootSession rootText="act" rootMeaning="做" words={sampleWords} />
    );
    // 浏览到 act 的最后一个词 (index=2)
    fireEvent.click(screen.getByText("下一个")); // -> action
    fireEvent.click(screen.getByText("下一个")); // -> active
    expect(screen.getByRole("heading", { level: 2, name: "active" })).toBeInTheDocument();

    // 切换到词根 port（只有 2 词，index=2 越界），同实例 rerender 模拟未加 key
    const portWords: VocabEntry[] = [
      { word: "port", definition: "carry", parts: [{ type: "root", text: "port", meaning: "运" }] },
      { word: "export", definition: "send out", parts: [{ type: "root", text: "port", meaning: "运" }] },
    ];
    rerender(
      <RootSession rootText="port" rootMeaning="运" words={portWords} />
    );
    // 不应崩溃，且回退到首词
    expect(screen.getByRole("heading", { level: 2, name: "port" })).toBeInTheDocument();
    expect(screen.getByText("carry")).toBeInTheDocument();
  });
});
