import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { PartTags } from "@/components/word/PartTags";
import GuessPhase from "@/components/train/GuessPhase";
import type { GuessQuestion, VocabPart } from "@/lib/types";

afterEach(cleanup);

const partsWithAllTypes: VocabPart[] = [
  { type: "prefix", text: "pre-", meaning: "前", decomposed: true },
  { type: "root", text: "duct", meaning: "引导", decomposed: true },
  { type: "suffix", text: "-tion", meaning: "名词后缀", decomposed: true },
];

const entry = {
  word: "production",
  definition: "生产",
  parts: partsWithAllTypes,
};

const questions: GuessQuestion[] = [
  {
    entry,
    options: ["生产", "消费", "教育", "引导"],
    correctIndex: 0,
  },
];

describe("PartTags", () => {
  it("renders prefix, root, and suffix tags", () => {
    render(<PartTags parts={partsWithAllTypes} />);
    expect(screen.getByText("pre-")).toBeInTheDocument();
    expect(screen.getByText("duct")).toBeInTheDocument();
    expect(screen.getByText("-tion")).toBeInTheDocument();
  });

  it("applies correct color class for each part type", () => {
    const { container } = render(<PartTags parts={partsWithAllTypes} />);
    const tags = container.querySelectorAll(".part-tag");
    expect(tags[0]).toHaveClass("part-tag-prefix");
    expect(tags[1]).toHaveClass("part-tag-root");
    expect(tags[2]).toHaveClass("part-tag-suffix");
  });

  it("displays part meanings", () => {
    render(<PartTags parts={partsWithAllTypes} />);
    expect(screen.getByText("前")).toBeInTheDocument();
    expect(screen.getByText("引导")).toBeInTheDocument();
    expect(screen.getByText("名词后缀")).toBeInTheDocument();
  });
});

describe("GuessPhase - definition hiding", () => {
  it("does not show entry.definition before answering", () => {
    render(<GuessPhase questions={questions} onComplete={vi.fn()} />);
    expect(screen.queryByText(/正确释义：/)).not.toBeInTheDocument();
  });

  it("shows PartTags instead of definition", () => {
    render(<GuessPhase questions={questions} onComplete={vi.fn()} />);
    expect(screen.getByText("pre-")).toBeInTheDocument();
    expect(screen.getByText("duct")).toBeInTheDocument();
    expect(screen.getByText("-tion")).toBeInTheDocument();
  });

  it("reveals definition after answering", () => {
    render(<GuessPhase questions={questions} onComplete={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    expect(screen.getByText(/正确释义：/)).toBeInTheDocument();
  });
});

describe("GuessPhase - options rendering", () => {
  it("renders 4 option buttons", () => {
    render(<GuessPhase questions={questions} onComplete={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(4);
  });

  it("displays Chinese definitions as option text", () => {
    render(<GuessPhase questions={questions} onComplete={vi.fn()} />);
    expect(screen.getByText("消费")).toBeInTheDocument();
    expect(screen.getByText("教育")).toBeInTheDocument();
    expect(screen.getAllByText("生产").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("引导").length).toBeGreaterThanOrEqual(1);
  });
});
