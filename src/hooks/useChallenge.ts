"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadSearchIndex, getLoadedIndices, isIndexLoaded } from "@/lib/data-loader";
import type { VocabEntry, RootIndex, SearchIndex } from "@/lib/types";

const ROUND_SIZE = 10;
const FEEDBACK_MS = 2000;

export interface ChallengeQuestion {
  entry: VocabEntry;
  options: string[];
  correctIndex: number;
}

export interface RoundResult {
  correct: boolean;
  timeMs: number;
  word: string;
  definition: string;
}

type Phase = "loading" | "idle" | "playing" | "feedback" | "results";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickDistractors(
  entry: VocabEntry,
  rootIndex: RootIndex,
  data: (VocabEntry | null)[],
  count: number
): string[] {
  const sameRootIndices = new Set<number>();
  for (const part of entry.parts) {
    const root = rootIndex[part.text];
    if (root) {
      for (const idx of root.w) {
        if (isIndexLoaded(idx) && data[idx]!.word !== entry.word) {
          sameRootIndices.add(idx);
        }
      }
    }
  }

  const loaded = getLoadedIndices();
  const pool =
    sameRootIndices.size >= count
      ? shuffle([...sameRootIndices]).slice(0, count)
      : [
          ...sameRootIndices,
          ...shuffle(
            loaded.filter((i) => data[i]!.word !== entry.word && !sameRootIndices.has(i))
          ).slice(0, count - sameRootIndices.size),
        ];

  const seen = new Set<string>();
  const result: string[] = [];
  for (const idx of pool) {
    if (result.length >= count) break;
    const def = data[idx]!.definition;
    if (def !== entry.definition && !seen.has(def)) {
      seen.add(def);
      result.push(def);
    }
  }

  while (result.length < count) {
    const loadedArr = getLoadedIndices();
    const idx = loadedArr[Math.floor(Math.random() * loadedArr.length)];
    const def = data[idx]!.definition;
    if (def !== entry.definition && !seen.has(def)) {
      seen.add(def);
      result.push(def);
    }
  }

  return result;
}

function buildQuestion(
  entry: VocabEntry,
  rootIndex: RootIndex,
  data: (VocabEntry | null)[]
): ChallengeQuestion {
  const distractors = pickDistractors(entry, rootIndex, data, 3);
  const options = shuffle([entry.definition, ...distractors]);
  return { entry, options, correctIndex: options.indexOf(entry.definition) };
}

export function useChallenge() {
  const indexRef = useRef<SearchIndex | null>(null);
  const roundRef = useRef(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [question, setQuestion] = useState<ChallengeQuestion | null>(null);
  const [round, setRound] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const questionStartRef = useRef(0);

  const nextQuestion = useCallback(() => {
    const idx = indexRef.current;
    if (!idx) return;
    const loaded = getLoadedIndices();
    const entry = idx.data[loaded[Math.floor(Math.random() * loaded.length)]];
    setQuestion(buildQuestion(entry, idx.rootIndex, idx.data));
    setSelectedOption(null);
    questionStartRef.current = Date.now();
  }, []);

  const startRound = useCallback(() => {
    roundRef.current = 0;
    setRound(0);
    setResults([]);
    setPhase("playing");
    nextQuestion();
  }, [nextQuestion]);

  const answer = useCallback(
    (optionIndex: number) => {
      if (phase !== "playing" || !question) return;
      const timeMs = Date.now() - questionStartRef.current;
      setSelectedOption(optionIndex);
      const correct = optionIndex === question.correctIndex;
      setResults((prev) => [
        ...prev,
        { correct, timeMs, word: question.entry.word, definition: question.entry.definition },
      ]);
      setPhase("feedback");
      setTimeout(() => {
        const next = roundRef.current + 1;
        roundRef.current = next;
        if (next >= ROUND_SIZE) {
          setPhase("results");
        } else {
          setRound(next);
          setPhase("playing");
          nextQuestion();
        }
      }, FEEDBACK_MS);
    },
    [phase, question, nextQuestion]
  );

  useEffect(() => {
    loadSearchIndex().then((idx) => {
      indexRef.current = idx;
      setPhase("idle");
    });
  }, []);

  return {
    phase,
    question,
    round,
    roundSize: ROUND_SIZE,
    results,
    selectedOption,
    startRound,
    answer,
  };
}
