import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import type { SearchIndex } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("lucide-react", () => {
  const Stub = () => <span />;
  return {
    Eye: Stub,
    MessageSquare: Stub,
    Footprints: Stub,
    Hand: Stub,
    Brain: Stub,
    Building2: Stub,
    RotateCcw: Stub,
    Scale: Stub,
    ArrowRight: Stub,
    ChevronDown: Stub,
  };
});

const mockIndex: SearchIndex = {
  data: [
    {
      word: "conduct",
      definition: "to lead, guide",
      parts: [
        { type: "prefix", text: "con-", meaning: "together", decomposed: false },
        { type: "root", text: "duct", meaning: "lead", decomposed: false },
      ],
    },
    {
      word: "deduct",
      definition: "to take away",
      parts: [
        { type: "prefix", text: "de-", meaning: "away", decomposed: false },
        { type: "root", text: "duct", meaning: "lead", decomposed: false },
      ],
    },
    {
      word: "aqueduct",
      definition: "a channel for water",
      parts: [
        { type: "root", text: "aqua", meaning: "water", decomposed: false },
        { type: "root", text: "duct", meaning: "lead", decomposed: false },
      ],
    },
  ],
  rootIndex: {
    duct: { m: "lead", w: [0, 1, 2] },
    aqua: { m: "water", w: [2] },
  },
  wordSorted: [],
  prefixIndex: {},
  suffixIndex: {},
};

let mockGetCachedIndex: () => SearchIndex | null = () => mockIndex;

vi.mock("@/lib/data-loader", () => ({
  getCachedIndex: () => mockGetCachedIndex(),
}));

vi.mock("@/components/word/PartTags", () => ({
  PartTags: ({ parts }: { parts: Array<{ type: string; text: string; meaning: string }> }) => (
    <div className="flex flex-wrap gap-1.5">
      {parts.map((p, i: number) => (
        <span key={i} className={`part-tag part-tag-${p.type}`}>
          <span className="font-mono text-[0.7rem]">{p.text}</span>
          <span className="opacity-70">{p.meaning}</span>
        </span>
      ))}
    </div>
  ),
}));

vi.mock("@/components/ui/SpeakButton", () => ({
  SpeakButton: () => <button aria-label="发音">Speak</button>,
}));

import { RootGroupPicker } from "@/components/train/RootGroupPicker";
import { RootNetwork } from "@/components/train/RootNetwork";
import { ObservePhase } from "@/components/train/ObservePhase";
import GuessPhase from "@/components/train/GuessPhase";
import { DecomposePhase } from "@/components/train/DecomposePhase";
import type { VocabEntry, GuessQuestion, DecomposeQuestion } from "@/lib/types";

const mockRootIndex: Record<string, { m: string; w: number[] }> = {
  vis: { m: "see", w: [0] },
  dict: { m: "speak", w: [1] },
  ced: { m: "go", w: [0, 1] },
};

const vocabEntry: VocabEntry = {
  word: "test",
  definition: "a test word",
  parts: [{ type: "root", text: "test", meaning: "to test", decomposed: false }],
};

function makeGuessQuestions(n: number): GuessQuestion[] {
  return Array.from({ length: n }, (_, i) => ({
    entry: { ...vocabEntry, word: `word${i}` },
    options: ["option A", "option B", "option C", "option D"],
    correctIndex: 0,
  }));
}

function makeDecomposeQuestion(): DecomposeQuestion {
  return {
    entry: vocabEntry,
    correctRoots: ["test"],
    rootPool: ["test", "other", "extra"],
  };
}

afterEach(() => {
  cleanup();
});

describe("RootGroupPicker - responsive grid classes", () => {
  it("uses grid-cols-1 for small screens", () => {
    const { container } = render(<RootGroupPicker rootIndex={mockRootIndex} />);
    const grid = container.querySelector(".grid");
    expect(grid).toBeInTheDocument();
    expect(grid!.className).toContain("grid-cols-1");
  });

  it("uses md:grid-cols-2 for medium screens", () => {
    const { container } = render(<RootGroupPicker rootIndex={mockRootIndex} />);
    const grid = container.querySelector(".grid")!;
    expect(grid.className).toContain("md:grid-cols-2");
  });

  it("uses lg:grid-cols-3 for large screens", () => {
    const { container } = render(<RootGroupPicker rootIndex={mockRootIndex} />);
    const grid = container.querySelector(".grid")!;
    expect(grid.className).toContain("lg:grid-cols-3");
  });
});

describe("RootNetwork - responsive grid classes", () => {
  beforeEach(() => {
    mockGetCachedIndex = () => mockIndex;
  });

  it("uses grid-cols-2 for small screens", () => {
    const { container } = render(<RootNetwork rootText="duct" onClose={vi.fn()} />);
    const grid = container.querySelector(".grid");
    expect(grid).toBeInTheDocument();
    expect(grid!.className).toContain("grid-cols-2");
  });

  it("uses md:grid-cols-3 for medium screens", () => {
    const { container } = render(<RootNetwork rootText="duct" onClose={vi.fn()} />);
    const grid = container.querySelector(".grid")!;
    expect(grid.className).toContain("md:grid-cols-3");
  });

  it("uses lg:grid-cols-4 for large screens", () => {
    const { container } = render(<RootNetwork rootText="duct" onClose={vi.fn()} />);
    const grid = container.querySelector(".grid")!;
    expect(grid.className).toContain("lg:grid-cols-4");
  });
});

describe("Touch targets - all buttons min-h-[44px]", () => {
  it("ObservePhase action button has min-h-[44px]", () => {
    const words: VocabEntry[] = [vocabEntry];
    render(<ObservePhase words={words} currentIndex={0} onNext={vi.fn()} onPhaseEnd={vi.fn()} />);
    const btn = screen.getByText("进入猜词义 →");
    expect(btn.className).toContain("min-h-[44px]");
  });

  it("GuessPhase option buttons have min-h-[44px]", () => {
    render(<GuessPhase questions={makeGuessQuestions(2)} onComplete={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    for (const btn of buttons) {
      expect(btn.className).toContain("min-h-[44px]");
    }
  });

  it("DecomposePhase submit button has min-h-[44px]", () => {
    render(<DecomposePhase questions={[makeDecomposeQuestion()]} onComplete={vi.fn()} />);
    const btn = screen.getByText("提交");
    expect(btn.className).toContain("min-h-[44px]");
  });

  it("RootNetwork close button has min-h-[44px]", () => {
    mockGetCachedIndex = () => mockIndex;
    const { container } = render(<RootNetwork rootText="duct" onClose={vi.fn()} />);
    const closeBtn = container.querySelector('[aria-label="关闭"]') as HTMLElement;
    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn.className).toContain("min-h-[44px]");
  });
});

describe("Viewport 375px - no horizontal overflow", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", { value: 375, writable: true, configurable: true });
  });

  it("RootGroupPicker grid does not cause overflow at 375px", () => {
    const { container } = render(<RootGroupPicker rootIndex={mockRootIndex} />);
    const grid = container.querySelector(".grid")!;
    expect(grid.scrollWidth).toBeLessThanOrEqual(grid.clientWidth + 1);
  });

  it("RootNetwork grid does not cause overflow at 375px", () => {
    mockGetCachedIndex = () => mockIndex;
    const { container } = render(<RootNetwork rootText="duct" onClose={vi.fn()} />);
    const grid = container.querySelector(".grid")!;
    expect(grid.scrollWidth).toBeLessThanOrEqual(grid.clientWidth + 1);
  });

  it("ObservePhase layout does not cause overflow at 375px", () => {
    const words: VocabEntry[] = [vocabEntry];
    const { container } = render(
      <ObservePhase words={words} currentIndex={0} onNext={vi.fn()} onPhaseEnd={vi.fn()} />
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
  });

  it("GuessPhase layout does not cause overflow at 375px", () => {
    const { container } = render(
      <GuessPhase questions={makeGuessQuestions(3)} onComplete={vi.fn()} />
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
  });

  it("DecomposePhase layout does not cause overflow at 375px", () => {
    const { container } = render(
      <DecomposePhase questions={[makeDecomposeQuestion()]} onComplete={vi.fn()} />
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
  });
});
