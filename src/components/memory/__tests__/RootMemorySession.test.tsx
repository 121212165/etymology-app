// src/components/memory/__tests__/RootMemorySession.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type React from "react";
import { RootMemorySession } from "../RootMemorySession";
import { useMemoryStore } from "@/store/memory-store";
import { loadMindMapData } from "@/lib/mindmap-loader";
import type { EnhancedRootNode, MindMapData } from "@/lib/mindmap-types";

// next/link 在 jsdom 环境下渲染为普通 <a>
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// SpeakButton 依赖 TTS hook，mock 掉以隔离会话逻辑
vi.mock("@/components/word/SpeakButton", () => ({
  SpeakButton: () => <button data-testid="speak">speak</button>,
}));

vi.mock("@/lib/mindmap-loader", () => ({
  loadMindMapData: vi.fn(),
}));

const loadMock = vi.mocked(loadMindMapData);

const sampleRoots: EnhancedRootNode[] = [
  { primaryText: "act", aliases: ["ag"], meaning: "做，驱动", layer: "core", wordIndices: [0, 1], wordCount: 24 },
  { primaryText: "port", aliases: [], meaning: "搬运", layer: "core", wordIndices: [2], wordCount: 15 },
  { primaryText: "vert", aliases: ["vers"], meaning: "转", layer: "middle", wordIndices: [3], wordCount: 9 },
];

const sampleData: MindMapData = {
  roots: sampleRoots,
  links: [],
  stats: { totalRoots: 3, coreRoots: 2, middleRoots: 1, edgeRoots: 0, mergedGroups: 0, totalLinks: 0 },
};

const revealButton = () => screen.getByRole("button", { name: "点击揭示内容" });
const expectNoRevealButton = () =>
  expect(screen.queryByRole("button", { name: "点击揭示内容" })).not.toBeInTheDocument();

describe("RootMemorySession", () => {
  beforeEach(() => {
    useMemoryStore.setState({ cards: {}, dailyNewCount: 0, dailyReviewDate: "" });
    loadMock.mockResolvedValue(sampleData);
  });

  afterEach(() => {
    cleanup();
  });

  it("加载后显示第一张卡与今日统计，释义默认遮挡且无评分按钮", async () => {
    render(<RootMemorySession />);
    expect(await screen.findByText("act")).toBeInTheDocument();
    expect(screen.getByText(/今日待复习 0 · 新词 3/)).toBeInTheDocument();
    expect(revealButton()).toBeInTheDocument();
    expect(screen.queryByText("良好")).not.toBeInTheDocument();
  });

  it("点击揭示后显示词义、关联词数与评分按钮", async () => {
    render(<RootMemorySession />);
    await screen.findByText("act");
    fireEvent.click(revealButton());
    expectNoRevealButton();
    expect(screen.getByText(/关联 24 个词/)).toBeInTheDocument();
    expect(screen.getByText("忘了")).toBeInTheDocument();
    expect(screen.getByText("困难")).toBeInTheDocument();
    expect(screen.getByText("良好")).toBeInTheDocument();
    expect(screen.getByText("轻松")).toBeInTheDocument();
  });

  it("评分后进入下一张并重新遮挡", async () => {
    render(<RootMemorySession />);
    await screen.findByText("act");
    fireEvent.click(revealButton());
    fireEvent.click(screen.getByText("良好"));
    expect(screen.getByText("port")).toBeInTheDocument();
    expect(revealButton()).toBeInTheDocument();
    expect(screen.queryByText("良好")).not.toBeInTheDocument();
  });

  it("评分写入记忆 store（建卡 + 当日新词计数）", async () => {
    render(<RootMemorySession />);
    await screen.findByText("act");
    fireEvent.click(revealButton());
    fireEvent.click(screen.getByText("轻松"));
    const card = useMemoryStore.getState().cards["act"];
    expect(card).toBeDefined();
    expect(card.state).toBe("Review");
    expect(card.reps).toBe(1);
    expect(useMemoryStore.getState().dailyNewCount).toBe(1);
  });

  it("队空后显示小结与入口，可再来一组", async () => {
    render(<RootMemorySession />);
    await screen.findByText("act");
    for (let i = 0; i < 3; i++) {
      fireEvent.click(revealButton());
      fireEvent.click(screen.getByText("良好"));
    }
    expect(screen.getByText(/复习 0 · 新学 3/)).toBeInTheDocument();
    expect(screen.getByText("再来一组")).toBeInTheDocument();
    expect(screen.getByText("回全部词根")).toHaveAttribute("href", "/roots");
    // 再来一组：三张卡都已建卡且未到期，重建队列为空，回到空小结
    fireEvent.click(screen.getByText("再来一组"));
    expect(screen.getByText(/复习 0 · 新学 0/)).toBeInTheDocument();
    expect(screen.getByText("今日队列已空，休息一下吧")).toBeInTheDocument();
  });

  it("到期卡进入队列，未到期卡被跳过，小结区分复习与新学", async () => {
    const now = Date.now();
    const DAY = 86_400_000;
    useMemoryStore.setState({
      cards: {
        act: { id: "act", state: "Review", stability: 3.7, difficulty: 1, due: now - 1000, lastReview: now - DAY, reps: 1, lapses: 0 },
        port: { id: "port", state: "Review", stability: 3.7, difficulty: 1, due: now + DAY, lastReview: now - DAY, reps: 1, lapses: 0 },
      },
    });
    render(<RootMemorySession />);
    expect(await screen.findByText("act")).toBeInTheDocument();
    // act 到期复习 + vert 新词；port 有卡但未到期，两头都不进队列
    expect(screen.getByText(/今日待复习 1 · 新词 1/)).toBeInTheDocument();
    expect(screen.queryByText("port")).not.toBeInTheDocument();
    // act（复习）→ vert（新学）→ 小结
    fireEvent.click(revealButton());
    fireEvent.click(screen.getByText("良好"));
    expect(screen.getByText("vert")).toBeInTheDocument();
    fireEvent.click(revealButton());
    fireEvent.click(screen.getByText("良好"));
    expect(screen.getByText(/复习 1 · 新学 1/)).toBeInTheDocument();
  });

  it("加载失败显示错误与重试入口，重试成功后出卡", async () => {
    loadMock.mockRejectedValueOnce(new Error("boom"));
    render(<RootMemorySession />);
    expect(await screen.findByText("词根数据加载失败，请重试")).toBeInTheDocument();
    fireEvent.click(screen.getByText("重试"));
    expect(await screen.findByText("act")).toBeInTheDocument();
  });
});
