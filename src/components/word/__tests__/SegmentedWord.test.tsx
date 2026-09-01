// src/components/word/__tests__/SegmentedWord.test.tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { SegmentedWord } from "../SegmentedWord";
import type { VocabPart } from "@/lib/types";

const parts: VocabPart[] = [
  { type: "root", text: "spec", meaning: "看" },
  { type: "suffix", text: "ial", meaning: "...的" },
  { type: "suffix", text: "ize", meaning: "使成为" },
];

describe("SegmentedWord", () => {
  afterEach(cleanup);

  it("renders each part separated by center dots", () => {
    render(<SegmentedWord parts={parts} word="specialize" />);
    expect(screen.getByText("spec")).toBeInTheDocument();
    expect(screen.getByText("ial")).toBeInTheDocument();
    expect(screen.getByText("ize")).toBeInTheDocument();
    // 两个分隔点
    expect(screen.getAllByText("·")).toHaveLength(2);
  });

  it("falls back to the plain word when parts are empty", () => {
    render(<SegmentedWord parts={[]} word="water" />);
    expect(screen.getByText("water")).toBeInTheDocument();
    expect(screen.queryByText("·")).not.toBeInTheDocument();
  });

  it("renders surface form when present (同化前缀)", () => {
    render(
      <SegmentedWord
        parts={[
          { type: "prefix", text: "ob", surface: "of", meaning: "朝" },
          { type: "root", text: "fer", meaning: "携带" },
        ]}
        word="offer"
      />
    );
    expect(screen.getByText("of")).toBeInTheDocument();
    expect(screen.queryByText("ob")).not.toBeInTheDocument();
  });

  it("shows a single part without any dot", () => {
    render(
      <SegmentedWord
        parts={[{ type: "root", text: "act", meaning: "做" }]}
        word="act"
      />
    );
    expect(screen.getByText("act")).toBeInTheDocument();
    expect(screen.queryByText("·")).not.toBeInTheDocument();
  });
});
