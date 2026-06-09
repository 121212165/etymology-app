"use client";

import { Volume2 } from "lucide-react";

export function SpeakButton({ word }: { word: string }) {
  const handleSpeak = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(word);
      u.lang = "en-US";
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    }
  };

  return (
    <button
      onClick={handleSpeak}
      className="w-10 h-10 rounded-lg flex items-center justify-center bg-bg-elevated hover:bg-bg-hover text-text-secondary transition-colors"
      aria-label="发音"
    >
      <Volume2 size={18} />
    </button>
  );
}
