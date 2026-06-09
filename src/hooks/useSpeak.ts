"use client";

import { useCallback } from "react";

export function useSpeak() {
  const speak = useCallback((word: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window))
      return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }, []);

  return speak;
}
