import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CardGrid } from "../CardGrid";
import type { VocabEntry } from "@/lib/types";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const mockEntries = [
  {
    entry: {
      word: "action",
      definition: "行动",
      parts: [{ type: "root" as const, text: "act", meaning: "做", decomposed: true }],
    },
    index: 0,
  },
  {
    entry: {
      word: "visible",
      definition: "可见的",
      parts: [{ type: "root" as const, text: "vis", meaning: "看", decomposed: true }],
    },
    index: 1,
  },
];

describe("CardGrid", () => {
  it("renders the entries list", () => {
    render(<CardGrid entries={mockEntries} />);

    expect(screen.getByText("action")).toBeInTheDocument();
    expect(screen.getByText("visible")).toBeInTheDocument();
  });

  it("displays word text for each card", () => {
    render(<CardGrid entries={mockEntries} />);

    expect(screen.getByText("action")).toBeVisible();
    expect(screen.getByText("visible")).toBeVisible();
  });

  it("displays definition for each card", () => {
    render(<CardGrid entries={mockEntries} />);

    expect(screen.getByText("行动")).toBeInTheDocument();
    expect(screen.getByText("可见的")).toBeInTheDocument();
  });

  it("renders without crashing when entries is empty", () => {
    render(<CardGrid entries={[]} />);

    expect(screen.getByText("没有找到匹配的单词")).toBeInTheDocument();
    expect(screen.getByText("试试其他搜索词或清除筛选")).toBeInTheDocument();
  });

  it("calls onToggleFavorite when the favorite button is clicked", async () => {
    const onToggleFavorite = vi.fn();
    const user = userEvent.setup();

    render(
      <CardGrid
        entries={mockEntries}
        onToggleFavorite={onToggleFavorite}
      />,
    );

    const buttons = screen.getAllByLabelText("收藏");
    await user.click(buttons[0]);

    expect(onToggleFavorite).toHaveBeenCalledWith(0);
  });

  it("calls onSpeak when the speak button is clicked", async () => {
    const onSpeak = vi.fn();
    const user = userEvent.setup();

    render(
      <CardGrid entries={mockEntries} onSpeak={onSpeak} />,
    );

    const buttons = screen.getAllByLabelText("发音");
    await user.click(buttons[1]);

    expect(onSpeak).toHaveBeenCalledWith("visible");
  });

  it("renders favorite buttons as unfilled when not favorited", () => {
    render(
      <CardGrid
        entries={mockEntries}
        favorites={new Set()}
        onToggleFavorite={vi.fn()}
      />,
    );

    const buttons = screen.getAllByLabelText("收藏");
    // Star icon has fill="none" when not favorited
    expect(buttons[0].querySelector("svg")).toHaveAttribute("fill", "none");
    expect(buttons[1].querySelector("svg")).toHaveAttribute("fill", "none");
  });

  it("renders favorite button as filled when favorited", () => {
    render(
      <CardGrid
        entries={mockEntries}
        favorites={new Set([0])}
        onToggleFavorite={vi.fn()}
      />,
    );

    const buttons = screen.getAllByLabelText("收藏");
    expect(buttons[0].querySelector("svg")).toHaveAttribute("fill", "currentColor");
    expect(buttons[1].querySelector("svg")).toHaveAttribute("fill", "none");
  });

  it("does not render action buttons when callbacks are omitted", () => {
    render(<CardGrid entries={mockEntries} />);

    expect(screen.queryAllByLabelText("收藏")).toHaveLength(0);
    expect(screen.queryAllByLabelText("发音")).toHaveLength(0);
  });
});
