import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import GuessPhase from "@/components/train/GuessPhase";
import type { GuessQuestion, VocabEntry } from "@/lib/types";

const baseEntry: VocabEntry = {
  word: "biology",
  definition: "the study of life",
  parts: [
    { type: "root", text: "bio", meaning: "life", decomposed: false },
    { type: "root", text: "log", meaning: "study", decomposed: false },
  ],
};

function makeQuestions(count = 1, correctIndex = 0): GuessQuestion[] {
  return Array.from({ length: count }, (_, i) => ({
    entry: { ...baseEntry, word: `word${i}` },
    options: ["correct answer", "wrong B", "wrong C", "wrong D"],
    correctIndex,
  }));
}

afterEach(() => {
  cleanup();
});

describe("Meaning-Guess: 答案选择", () => {
  it("点击正确选项 → 绿色高亮", () => {
    render(<GuessPhase questions={makeQuestions()} onComplete={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);

    const updated = screen.getAllByRole("button");
    expect(updated[0]).toHaveClass("bg-green-500/10");
    expect(updated[0]).toHaveClass("border-green-500");
  });

  it("点击错误选项 → 红色高亮 + 正确选项变绿", () => {
    render(<GuessPhase questions={makeQuestions()} onComplete={vi.fn()} />);
    fireEvent.click(screen.getAllByRole("button")[1]);

    const buttons = screen.getAllByRole("button");
    expect(buttons[1]).toHaveClass("bg-red-500/10");
    expect(buttons[1]).toHaveClass("border-red-500");
    expect(buttons[0]).toHaveClass("bg-green-500/10");
    expect(buttons[0]).toHaveClass("border-green-500");
  });

  it("未选选项变半透明", () => {
    render(<GuessPhase questions={makeQuestions()} onComplete={vi.fn()} />);
    fireEvent.click(screen.getAllByRole("button")[2]);

    const buttons = screen.getAllByRole("button");
    expect(buttons[3]).toHaveClass("opacity-50");
  });

  it("作答后按钮disabled", () => {
    render(<GuessPhase questions={makeQuestions()} onComplete={vi.fn()} />);
    fireEvent.click(screen.getAllByRole("button")[0]);

    screen.getAllByRole("button").forEach((btn) => expect(btn).toBeDisabled());
  });

  it("作答后显示正确释义", () => {
    render(<GuessPhase questions={makeQuestions()} onComplete={vi.fn()} />);
    fireEvent.click(screen.getAllByRole("button")[0]);

    expect(screen.getByText(/正确释义/)).toBeInTheDocument();
  });
});

describe("Meaning-Guess: 自动前进", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("选择后1.5s自动进入下一题", () => {
    render(<GuessPhase questions={makeQuestions(2)} onComplete={vi.fn()} />);

    expect(screen.getByText("第 1 / 2 题")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button")[0]);

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.getByText("第 2 / 2 题")).toBeInTheDocument();
  });

  it("1.5s内不会提前前进", () => {
    render(<GuessPhase questions={makeQuestions(2)} onComplete={vi.fn()} />);

    fireEvent.click(screen.getAllByRole("button")[0]);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText("第 1 / 2 题")).toBeInTheDocument();
  });
});

describe("Meaning-Guess: 键盘操作", () => {
  it("按1选择第一个选项（正确）", () => {
    render(<GuessPhase questions={makeQuestions()} onComplete={vi.fn()} />);
    fireEvent.keyDown(window, { key: "1" });

    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveClass("bg-green-500/10");
  });

  it("按4选择第四个选项（错误）", () => {
    render(<GuessPhase questions={makeQuestions()} onComplete={vi.fn()} />);
    fireEvent.keyDown(window, { key: "4" });

    const buttons = screen.getAllByRole("button");
    expect(buttons[3]).toHaveClass("bg-red-500/10");
    expect(buttons[0]).toHaveClass("bg-green-500/10");
  });

  it("按2选择错误选项", () => {
    render(<GuessPhase questions={makeQuestions()} onComplete={vi.fn()} />);
    fireEvent.keyDown(window, { key: "2" });

    const buttons = screen.getAllByRole("button");
    expect(buttons[1]).toHaveClass("bg-red-500/10");
  });

  it("无效按键不响应", () => {
    render(<GuessPhase questions={makeQuestions()} onComplete={vi.fn()} />);
    fireEvent.keyDown(window, { key: "5" });
    fireEvent.keyDown(window, { key: "a" });
    fireEvent.keyDown(window, { key: "Enter" });
    fireEvent.keyDown(window, { key: "0" });

    screen.getAllByRole("button").forEach((btn) => {
      expect(btn).not.toHaveClass("bg-green-500/10");
      expect(btn).not.toHaveClass("bg-red-500/10");
    });
  });

  it("作答后键盘不再响应", () => {
    render(<GuessPhase questions={makeQuestions()} onComplete={vi.fn()} />);
    fireEvent.keyDown(window, { key: "1" });
    fireEvent.keyDown(window, { key: "2" });

    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveClass("bg-green-500/10");
    expect(buttons[1]).not.toHaveClass("bg-red-500/10");
  });
});

describe("Meaning-Guess: 完成回调", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("全部答完调用onComplete(correct, total)", () => {
    const onComplete = vi.fn();
    render(<GuessPhase questions={makeQuestions(1)} onComplete={onComplete} />);

    fireEvent.click(screen.getAllByRole("button")[0]);

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(onComplete).toHaveBeenCalledWith(1, 1);
  });

  it("correct计数准确：全对", () => {
    const onComplete = vi.fn();
    render(<GuessPhase questions={makeQuestions(2, 0)} onComplete={onComplete} />);

    fireEvent.keyDown(window, { key: "1" });
    act(() => { vi.advanceTimersByTime(1500); });

    fireEvent.keyDown(window, { key: "1" });
    act(() => { vi.advanceTimersByTime(1500); });

    expect(onComplete).toHaveBeenCalledWith(2, 2);
  });

  it("correct计数准确：全错", () => {
    const onComplete = vi.fn();
    render(<GuessPhase questions={makeQuestions(2, 0)} onComplete={onComplete} />);

    fireEvent.keyDown(window, { key: "2" });
    act(() => { vi.advanceTimersByTime(1500); });

    fireEvent.keyDown(window, { key: "3" });
    act(() => { vi.advanceTimersByTime(1500); });

    expect(onComplete).toHaveBeenCalledWith(0, 2);
  });

  it("correct计数准确：对一错一", () => {
    const onComplete = vi.fn();
    render(<GuessPhase questions={makeQuestions(2, 0)} onComplete={onComplete} />);

    fireEvent.keyDown(window, { key: "1" });
    act(() => { vi.advanceTimersByTime(1500); });

    fireEvent.keyDown(window, { key: "4" });
    act(() => { vi.advanceTimersByTime(1500); });

    expect(onComplete).toHaveBeenCalledWith(1, 2);
  });
});
