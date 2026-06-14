"use client";

import { Volume2 } from "lucide-react";

export function InlineSpeakButton({ word }: { word: string }) {
  return (
    <button
      onClick={() => {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(word);
          u.lang = "en-US";
          u.rate = 0.9;
          window.speechSynthesis.speak(u);
        }
      }}
      className="w-9 h-9 rounded-lg flex items-center justify-center bg-bg-elevated hover:bg-bg-hover transition-colors"
      aria-label="发音"
    >
      <Volume2 size={18} className="text-text-secondary" />
    </button>
  );
}
