"use client";

import { useState, useEffect, useCallback } from "react";
import "./EpiphanyIntro.css";

type Phase = "word" | "split" | "meaning" | "tagline" | "ready";

const STORAGE_KEY = "linxu-seen-intro";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function EpiphanyIntro({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("word");
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const t1 = setTimeout(() => setPhase("split"), reduced ? 200 : 1000);
    const t2 = setTimeout(() => setPhase("meaning"), reduced ? 400 : 2500);
    const t3 = setTimeout(() => setPhase("tagline"), reduced ? 600 : 4000);
    const t4 = setTimeout(() => setPhase("ready"), reduced ? 800 : 5000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  const handleStart = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {}
      onDone();
    }, 400);
  }, [onDone]);

  return (
    <div className={`epiphany-overlay ${exiting ? "epiphany-exit" : ""}`}>
      {phase === "word" && (
        <div className="epiphany-word epiphany-enter">understand</div>
      )}

      {phase === "split" && (
        <div className="epiphany-word-split epiphany-enter">
          <span className="part-prefix">under</span>
          <span className="part-root">stand</span>
        </div>
      )}

      {(phase === "meaning" || phase === "tagline" || phase === "ready") && (
        <>
          <div className="epiphany-word-split">
            <span className="part-prefix">under</span>
            <span className="part-root">stand</span>
          </div>
          <div className="epiphany-meaning epiphany-enter">
            <span className="line-prefix">under = 在下方</span>
            <span className="line-root">stand = 站立</span>
            <span className="line-conclusion">
              站在事物之下去观察 → 理解
            </span>
          </div>
        </>
      )}

      {(phase === "tagline" || phase === "ready") && (
        <div className="epiphany-tagline epiphany-enter">
          这不是又一个词典。这是一把钥匙。
        </div>
      )}

      {phase === "ready" && (
        <button className="epiphany-btn epiphany-enter" onClick={handleStart}>
          开始探索
        </button>
      )}
    </div>
  );
}

export function hasSeenIntro(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
