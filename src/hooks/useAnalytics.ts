"use client";

import { useCallback, useEffect, useRef } from "react";
import { track, checkRetention } from "@/lib/analytics";

export function useAnalytics(path: string) {
  const loadTime = useRef(Date.now());
  const ttfiTriggered = useRef(false);

  useEffect(() => {
    track("session", { action: "start", path });
    checkRetention();

    return () => {
      const duration = Date.now() - loadTime.current;
      track("session", { action: "end", path, duration });
    };
  }, [path]);

  const trackTTFI = useCallback((word: string) => {
    if (ttfiTriggered.current) return;
    ttfiTriggered.current = true;
    const ttfiMs = Date.now() - loadTime.current;
    track("ttfi", { word, ttfiMs });
  }, []);

  const trackReviewComplete = useCallback((word: string, result: "pass" | "fail", timeSpentMs: number) => {
    track("review_complete", { word, result, timeSpentMs });
  }, []);

  const trackDecomposeUse = useCallback((word: string, partsCount: number) => {
    track("decompose_use", { word, partsCount });
  }, []);

  return {
    track,
    trackTTFI,
    trackReviewComplete,
    trackDecomposeUse,
  };
}
