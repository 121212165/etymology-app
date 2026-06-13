import React from "react";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { vi, describe, it, expect, afterEach } from "vitest";
import { ObservePhase } from "@/components/train/ObservePhase";
import GuessPhase from "@/components/train/GuessPhase";
import { DecomposePhase } from "@/components/train/DecomposePhase";
import type { VocabEntry, GuessQuestion, DecomposeQuestion } from "@/lib/types";

vi.mock("@/components/ui/SpeakButton", () => ({
  SpeakButton: () => <button aria-label="发音">Speak</button>,
}));

vi.mock("@/components/train/RootNetwork", () => ({
  RootNetwork: () => <div data-testid="root-network" />,
}));

vi.mock("@/components/word/PartTags", () => ({
  PartTags: ({ parts }: { parts: Array<{ type: string; text: string; meaning: string }> }) => (
    <div>
      {parts.map((p, i: number) => (
        <span key={i}>{p.text}</span>
      ))}
    </div>
  ),
}));

const vocabEntry: VocabEntry = {
  word: "test",
  definition: "a test word",
  parts: [{ type: "root", text: "test", meaning: "to test", decomposed: false }],
};

const makeGuessQuestions = (count: number): GuessQuestion[] =>
  Array.from({ length: count }, (_, i) => ({
    entry: { ...vocabEntry, word: `word${i}` },
    options: ["optA", "optB", "optC", "optD"],
    correctIndex: 0,
  }));

const makeDecomposeQuestion = (): DecomposeQuestion => ({
  entry: vocabEntry,
  correctRoots: ["test"],
  rootPool: ["test", "other", "extra"],
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("ObservePhase keyboard", () => {
  it("spacebar calls onNext when not on the last word", () => {
    const onNext = vi.fn();
    const onPhaseEnd = vi.fn();
    const words: VocabEntry[] = [vocabEntry, { ...vocabEntry, word: "second" }];

    render(<ObservePhase words={words} currentIndex={0} onNext={onNext} onPhaseEnd={onPhaseEnd} />);
    fireEvent.keyDown(window, { code: "Space" });

    expect(onNext).toHaveBeenCalledOnce();
    expect(onPhaseEnd).not.toHaveBeenCalled();
  });

  it("spacebar calls onPhaseEnd on the last word", () => {
    const onNext = vi.fn();
    const onPhaseEnd = vi.fn();
    const words: VocabEntry[] = [vocabEntry];

    render(<ObservePhase words={words} currentIndex={0} onNext={onNext} onPhaseEnd={onPhaseEnd} />);
    fireEvent.keyDown(window, { code: "Space" });

    expect(onPhaseEnd).toHaveBeenCalledOnce();
    expect(onNext).not.toHaveBeenCalled();
  });
});

describe("GuessPhase keyboard", () => {
  it("pressing 1 selects the first option", () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    render(<GuessPhase questions={makeGuessQuestions(2)} onComplete={onComplete} />);
    act(() => { fireEvent.keyDown(window, { key: "1" }); });

    expect(screen.getByText("optA").closest("button")).toHaveClass("bg-green-500/10");
  });

  it("pressing 2 selects the second option", () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    render(<GuessPhase questions={makeGuessQuestions(2)} onComplete={onComplete} />);
    act(() => { fireEvent.keyDown(window, { key: "2" }); });

    expect(screen.getByText("optB").closest("button")).toHaveClass("bg-red-500/10");
  });

  it("pressing 3 selects the third option", () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    render(<GuessPhase questions={makeGuessQuestions(2)} onComplete={onComplete} />);
    act(() => { fireEvent.keyDown(window, { key: "3" }); });

    expect(screen.getByText("optC").closest("button")).toHaveClass("bg-red-500/10");
  });

  it("pressing 4 selects the fourth option", () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    render(<GuessPhase questions={makeGuessQuestions(2)} onComplete={onComplete} />);
    act(() => { fireEvent.keyDown(window, { key: "4" }); });

    expect(screen.getByText("optD").closest("button")).toHaveClass("bg-red-500/10");
  });

  it("other keys do not trigger selection", () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    render(<GuessPhase questions={makeGuessQuestions(2)} onComplete={onComplete} />);
    fireEvent.keyDown(window, { key: "5" });
    fireEvent.keyDown(window, { key: "a" });
    fireEvent.keyDown(window, { key: "Enter" });

    const buttons = screen.getAllByRole("button");
    buttons.forEach((btn) => {
      expect(btn).not.toHaveClass("bg-green-500/10");
      expect(btn).not.toHaveClass("bg-red-500/10");
    });
  });

  it("keyboard does not re-trigger after an answer is selected", () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    render(<GuessPhase questions={makeGuessQuestions(2)} onComplete={onComplete} />);
    act(() => { fireEvent.keyDown(window, { key: "1" }); });

    fireEvent.keyDown(window, { key: "2" });
    fireEvent.keyDown(window, { key: "3" });

    expect(screen.getByText("optA").closest("button")).toHaveClass("bg-green-500/10");
  });
});

describe("DecomposePhase keyboard", () => {
  it("Enter submits when roots are selected", () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    const { container } = render(<DecomposePhase questions={[makeDecomposeQuestion()]} onComplete={onComplete} />);

    const rootPool = container.querySelectorAll(".part-tag-root.transition-opacity");
    fireEvent.click(rootPool[0]);
    act(() => { fireEvent.keyDown(window, { key: "Enter" }); });

    expect(screen.getByText("a test word")).toBeInTheDocument();
  });

  it("Enter does not submit when no roots are selected", () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    render(<DecomposePhase questions={[makeDecomposeQuestion()]} onComplete={onComplete} />);

    fireEvent.keyDown(window, { key: "Enter" });

    expect(screen.queryByText("提交")).toBeDisabled();
  });
});
