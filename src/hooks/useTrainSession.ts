"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { loadSearchIndex, ensureChunksForRoots } from "@/lib/data-loader";
import {
  getWordsForRoots,
  buildGuessQuestions,
  buildDecomposeQuestions,
} from "@/lib/root-network";
import { ROOT_GROUPS, type RootGroupDef } from "@/lib/root-groups";
import type {
  VocabEntry,
  TrainPhase,
  GuessQuestion,
  DecomposeQuestion,
} from "@/lib/types";
import { isDecomposeCorrect } from "@/lib/decompose-scoring";

export function useTrainSession(groupId: string) {
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<TrainPhase>("observe");
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [words, setWords] = useState<VocabEntry[]>([]);
  const [guessQuestions, setGuessQuestions] = useState<GuessQuestion[]>([]);
  const [decomposeQuestions, setDecomposeQuestions] = useState<
    DecomposeQuestion[]
  >([]);
  const [group, setGroup] = useState<RootGroupDef | null>(null);
  const [stats, setStats] = useState({
    observeCount: 0,
    guessCorrect: 0,
    guessTotal: 0,
    decomposeCorrect: 0,
    decomposeTotal: 0,
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const g = ROOT_GROUPS.find((rg) => rg.label === groupId);
    if (!g) return;
    setGroup(g);

    let cancelled = false;
    loadSearchIndex()
      .then((index) => ensureChunksForRoots(g.members).then(() => index))
      .then((index) => {
        if (cancelled) return;
        const w = getWordsForRoots(g.members, index.rootIndex, index.data);
        setWords(w);
        setGuessQuestions(buildGuessQuestions(w, w, Math.min(w.length, 10)));
        setDecomposeQuestions(
          buildDecomposeQuestions(w, g.members, Math.min(w.length, 10))
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const advancePhase = useCallback(() => {
    setPhase((prev) => {
      if (prev === "observe") return "guess";
      if (prev === "guess") return "decompose";
      if (prev === "decompose") return "complete";
      return "complete";
    });
    setPhaseIndex(0);
  }, []);

  const observeNext = useCallback(() => {
    setPhaseIndex((i) => {
      if (i >= words.length - 1) {
        advancePhase();
        return i;
      }
      return i + 1;
    });
    setStats((s) => ({ ...s, observeCount: s.observeCount + 1 }));
  }, [words.length, advancePhase]);

  const submitGuess = useCallback(
    (optionIndex: number) => {
      const q = guessQuestions[phaseIndex];
      const correct =
        q.options[optionIndex] === q.entry.definition;
      setStats((s) => ({
        ...s,
        guessTotal: s.guessTotal + 1,
        guessCorrect: s.guessCorrect + (correct ? 1 : 0),
      }));
      timeoutRef.current = setTimeout(advancePhase, 1500);
      return { correct, correctDef: q.entry.definition };
    },
    [phaseIndex, guessQuestions, advancePhase]
  );

  const submitDecompose = useCallback(
    (selectedRoots: string[]) => {
      const q = decomposeQuestions[phaseIndex];
      const correct = isDecomposeCorrect(selectedRoots, q.correctRoots);
      setStats((s) => ({
        ...s,
        decomposeTotal: s.decomposeTotal + 1,
        decomposeCorrect: s.decomposeCorrect + (correct ? 1 : 0),
      }));
      return { correct, correctRoots: q.correctRoots };
    },
    [phaseIndex, decomposeQuestions]
  );

  const reset = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setPhase("observe");
    setPhaseIndex(0);
    setStats({
      observeCount: 0,
      guessCorrect: 0,
      guessTotal: 0,
      decomposeCorrect: 0,
      decomposeTotal: 0,
    });
  }, []);

  return {
    loading,
    phase,
    phaseIndex,
    words,
    guessQuestions,
    decomposeQuestions,
    group,
    observeNext,
    submitGuess,
    submitDecompose,
    advancePhase,
    reset,
    stats,
  };
}
