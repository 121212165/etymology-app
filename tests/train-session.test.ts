import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import * as dataLoader from "@/lib/data-loader";
import * as rootNetwork from "@/lib/root-network";
import type { VocabEntry, GuessQuestion, DecomposeQuestion } from "@/lib/types";

vi.mock("@/lib/data-loader");
vi.mock("@/lib/root-network");
vi.mock("@/lib/root-groups", () => ({
  ROOT_GROUPS: [
    { label: "test-group", icon: "star", members: ["struct", "graph"] },
  ],
}));

const MOCK_WORDS: VocabEntry[] = [
  { word: "structure", definition: "the arrangement of parts", parts: [] },
  { word: "graphic", definition: "relating to visual art", parts: [] },
  { word: "geography", definition: "study of earth features", parts: [] },
];

function makeGuessQuestions(words: VocabEntry[]): GuessQuestion[] {
  return words.map((entry) => ({
    entry,
    options: [
      "wrong answer A",
      entry.definition,
      "wrong answer B",
      "wrong answer C",
    ],
    correctIndex: 1,
  }));
}

function makeDecomposeQuestions(): DecomposeQuestion[] {
  return [
    {
      entry: MOCK_WORDS[0],
      correctRoots: ["struct"],
      rootPool: ["struct", "graph", "phon"],
    },
    {
      entry: MOCK_WORDS[1],
      correctRoots: ["graph"],
      rootPool: ["graph", "struct", "log"],
    },
    {
      entry: MOCK_WORDS[2],
      correctRoots: ["graph"],
      rootPool: ["graph", "struct", "geo"],
    },
  ];
}

function setupMocks() {
  vi.mocked(dataLoader.loadSearchIndex).mockResolvedValue({
    data: MOCK_WORDS,
    rootIndex: {},
    wordSorted: [],
    prefixIndex: {},
    suffixIndex: {},
  } as any);
  vi.mocked(dataLoader.ensureChunksForRoots).mockResolvedValue(undefined as any);
  vi.mocked(rootNetwork.getWordsForRoots).mockReturnValue(MOCK_WORDS);
  vi.mocked(rootNetwork.buildGuessQuestions).mockReturnValue(
    makeGuessQuestions(MOCK_WORDS)
  );
  vi.mocked(rootNetwork.buildDecomposeQuestions).mockReturnValue(
    makeDecomposeQuestions()
  );
}

async function renderSession() {
  const { useTrainSession } = await import("@/hooks/useTrainSession");
  return renderHook(() => useTrainSession("test-group"));
}

describe("useTrainSession state machine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setupMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("state transitions", () => {
    it("starts in loading state", async () => {
      const { result } = await renderSession();
      expect(result.current.loading).toBe(true);
    });

    it("transitions to observe after data loads", async () => {
      const { result } = await renderSession();
      await act(async () => {
        await vi.runAllTimersAsync();
      });
      expect(result.current.loading).toBe(false);
      expect(result.current.phase).toBe("observe");
    });

    it("observe -> guess via advancePhase", async () => {
      const { result } = await renderSession();
      await act(async () => {
        await vi.runAllTimersAsync();
      });
      act(() => {
        result.current.advancePhase();
      });
      expect(result.current.phase).toBe("guess");
      expect(result.current.phaseIndex).toBe(0);
    });

    it("guess -> decompose via advancePhase", async () => {
      const { result } = await renderSession();
      await act(async () => {
        await vi.runAllTimersAsync();
      });
      act(() => {
        result.current.advancePhase();
      });
      act(() => {
        result.current.advancePhase();
      });
      expect(result.current.phase).toBe("decompose");
    });

    it("decompose -> complete via advancePhase", async () => {
      const { result } = await renderSession();
      await act(async () => {
        await vi.runAllTimersAsync();
      });
      act(() => {
        result.current.advancePhase();
      });
      act(() => {
        result.current.advancePhase();
      });
      act(() => {
        result.current.advancePhase();
      });
      expect(result.current.phase).toBe("complete");
    });
  });

  describe("observe phase", () => {
    it("observeNext increments phaseIndex", async () => {
      const { result } = await renderSession();
      await act(async () => {
        await vi.runAllTimersAsync();
      });
      expect(result.current.phaseIndex).toBe(0);
      act(() => {
        result.current.observeNext();
      });
      expect(result.current.phaseIndex).toBe(1);
    });

    it("observeNext increments observeCount in stats", async () => {
      const { result } = await renderSession();
      await act(async () => {
        await vi.runAllTimersAsync();
      });
      act(() => {
        result.current.observeNext();
      });
      expect(result.current.stats.observeCount).toBe(1);
      act(() => {
        result.current.observeNext();
      });
      expect(result.current.stats.observeCount).toBe(2);
    });

    it("observeNext at last word triggers advancePhase", async () => {
      const { result } = await renderSession();
      await act(async () => {
        await vi.runAllTimersAsync();
      });
      for (let i = 0; i < MOCK_WORDS.length; i++) {
        act(() => {
          result.current.observeNext();
        });
      }
      expect(result.current.phase).toBe("guess");
    });
  });

  describe("guess phase", () => {
    async function enterGuessPhase() {
      const { result } = await renderSession();
      await act(async () => {
        await vi.runAllTimersAsync();
      });
      act(() => {
        result.current.advancePhase();
      });
      return result;
    }

    it("submitGuess returns correct for matching option", async () => {
      const result = await enterGuessPhase();
      let ret: { correct: boolean; correctDef: string } | undefined;
      act(() => {
        ret = result.current.submitGuess(1);
      });
      expect(ret?.correct).toBe(true);
      expect(ret?.correctDef).toBe(MOCK_WORDS[0].definition);
    });

    it("submitGuess returns incorrect for wrong option", async () => {
      const result = await enterGuessPhase();
      let ret: { correct: boolean; correctDef: string } | undefined;
      act(() => {
        ret = result.current.submitGuess(0);
      });
      expect(ret?.correct).toBe(false);
    });

    it("correct guess increments stats.guessCorrect", async () => {
      const result = await enterGuessPhase();
      act(() => {
        result.current.submitGuess(1);
      });
      expect(result.current.stats.guessCorrect).toBe(1);
      expect(result.current.stats.guessTotal).toBe(1);
    });

    it("incorrect guess does not increment guessCorrect", async () => {
      const result = await enterGuessPhase();
      act(() => {
        result.current.submitGuess(0);
      });
      expect(result.current.stats.guessCorrect).toBe(0);
      expect(result.current.stats.guessTotal).toBe(1);
    });

    it("submitGuess auto-advances phase after timeout", async () => {
      const result = await enterGuessPhase();
      act(() => {
        result.current.submitGuess(1);
      });
      expect(result.current.phase).toBe("guess");
      act(() => {
        vi.advanceTimersByTime(1500);
      });
      expect(result.current.phase).toBe("decompose");
    });
  });

  describe("decompose phase", () => {
    async function enterDecomposePhase() {
      const { result } = await renderSession();
      await act(async () => {
        await vi.runAllTimersAsync();
      });
      act(() => {
        result.current.advancePhase();
      });
      act(() => {
        result.current.advancePhase();
      });
      return result;
    }

    it("submitDecompose returns correct for matching roots", async () => {
      const result = await enterDecomposePhase();
      let ret: { correct: boolean; correctRoots: string[] } | undefined;
      act(() => {
        ret = result.current.submitDecompose(["struct"]);
      });
      expect(ret?.correct).toBe(true);
      expect(ret?.correctRoots).toEqual(["struct"]);
    });

    it("submitDecompose returns incorrect for wrong roots", async () => {
      const result = await enterDecomposePhase();
      let ret: { correct: boolean; correctRoots: string[] } | undefined;
      act(() => {
        ret = result.current.submitDecompose(["graph"]);
      });
      expect(ret?.correct).toBe(false);
    });

    it("submitDecompose returns incorrect for extra roots", async () => {
      const result = await enterDecomposePhase();
      let ret: { correct: boolean } | undefined;
      act(() => {
        ret = result.current.submitDecompose(["struct", "graph"]);
      });
      expect(ret?.correct).toBe(false);
    });

    it("correct decompose increments stats.decomposeCorrect", async () => {
      const result = await enterDecomposePhase();
      act(() => {
        result.current.submitDecompose(["struct"]);
      });
      expect(result.current.stats.decomposeCorrect).toBe(1);
      expect(result.current.stats.decomposeTotal).toBe(1);
    });
  });

  describe("reset", () => {
    it("reset returns phase to observe and clears stats", async () => {
      const { result } = await renderSession();
      await act(async () => {
        await vi.runAllTimersAsync();
      });
      act(() => {
        result.current.advancePhase();
      });
      act(() => {
        result.current.submitGuess(0);
      });
      act(() => {
        result.current.reset();
      });
      expect(result.current.phase).toBe("observe");
      expect(result.current.phaseIndex).toBe(0);
      expect(result.current.stats.observeCount).toBe(0);
      expect(result.current.stats.guessCorrect).toBe(0);
      expect(result.current.stats.guessTotal).toBe(0);
      expect(result.current.stats.decomposeCorrect).toBe(0);
      expect(result.current.stats.decomposeTotal).toBe(0);
    });
  });
});
