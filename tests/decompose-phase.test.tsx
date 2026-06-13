import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { DecomposePhase } from "@/components/train/DecomposePhase";
import type { DecomposeQuestion } from "@/lib/types";

function makeQuestion(overrides: Partial<DecomposeQuestion> = {}): DecomposeQuestion {
  return {
    entry: {
      word: "biology",
      definition: "the study of life",
      parts: [],
    },
    correctRoots: ["bio", "log"],
    rootPool: ["bio", "log", "graph", "phon"],
    ...overrides,
  };
}

function renderPhase(
  questions: DecomposeQuestion[] = [makeQuestion()],
  onComplete: (correct: number, total: number) => void = vi.fn()
) {
  return render(<DecomposePhase questions={questions} onComplete={onComplete} />);
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("DecomposePhase", () => {
  describe("渲染", () => {
    it("显示大号单词", () => {
      renderPhase([makeQuestion({ entry: { word: "telegraph", definition: "far writing", parts: [] } })]);
      expect(screen.getByText("telegraph")).toBeInTheDocument();
    });

    it("显示词根选择池", () => {
      renderPhase();
      expect(screen.getAllByText("bio").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("log").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("graph").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("phon").length).toBeGreaterThanOrEqual(1);
    });

    it("拆解区空态提示", () => {
      renderPhase();
      expect(screen.getByText("点击下方词根来拆解这个词")).toBeInTheDocument();
    });
  });

  describe("选择", () => {
    it("点击词根pill选中（高亮显示在拆解区）", () => {
      renderPhase();
      fireEvent.click(screen.getAllByText("bio")[0]);
      expect(screen.queryByText("点击下方词根来拆解这个词")).not.toBeInTheDocument();
    });

    it("再次点击取消选中", () => {
      renderPhase();
      const pills = screen.getAllByText("bio");
      fireEvent.click(pills[0]);
      fireEvent.click(pills[0]);
      expect(screen.getByText("点击下方词根来拆解这个词")).toBeInTheDocument();
    });

    it("提交按钮disabled当无选择", () => {
      renderPhase();
      expect(screen.getByRole("button", { name: "提交" })).toBeDisabled();
    });
  });

  describe("验证", () => {
    it("正确选择：绿色边框+释义显示", () => {
      renderPhase();
      fireEvent.click(screen.getAllByText("bio")[0]);
      fireEvent.click(screen.getAllByText("log")[0]);
      fireEvent.click(screen.getByRole("button", { name: "提交" }));
      expect(screen.getByText("the study of life")).toBeInTheDocument();
    });

    it("错误选择：正确词根绿+错误词根红", () => {
      renderPhase();
      fireEvent.click(screen.getAllByText("graph")[0]);
      fireEvent.click(screen.getByRole("button", { name: "提交" }));
      expect(screen.getByText(/正确拆解：bio \+ log/)).toBeInTheDocument();
      expect(screen.getByText(/the study of life/)).toBeInTheDocument();
    });

    it("2s自动进入下一题", () => {
      const q1 = makeQuestion({ entry: { word: "biology", definition: "study of life", parts: [] } });
      const q2 = makeQuestion({
        entry: { word: "phonograph", definition: "sound writer", parts: [] },
        correctRoots: ["phon", "graph"],
        rootPool: ["phon", "graph", "bio", "log"],
      });

      renderPhase([q1, q2]);

      fireEvent.click(screen.getAllByText("bio")[0]);
      fireEvent.click(screen.getAllByText("log")[0]);
      fireEvent.click(screen.getByRole("button", { name: "提交" }));

      expect(screen.getByText("biology")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.getByText("phonograph")).toBeInTheDocument();
      expect(screen.getByText("第 2 / 2 题")).toBeInTheDocument();
    });
  });

  describe("完成", () => {
    it("最后一题完成后调用onComplete(correct, total)", () => {
      const onComplete = vi.fn();
      renderPhase([makeQuestion()], onComplete);

      fireEvent.click(screen.getAllByText("bio")[0]);
      fireEvent.click(screen.getAllByText("log")[0]);
      fireEvent.click(screen.getByRole("button", { name: "提交" }));

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onComplete).toHaveBeenCalledWith(1, 1);
    });
  });
});
