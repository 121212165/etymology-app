"use client";

import { Volume2 } from "lucide-react";
import { useSpeak } from "@/hooks/useSpeak";

export function SpeakButton({ word }: { word: string }) {
  const speak = useSpeak();

  return (
    <button
      onClick={() => speak(word)}
      className="w-9 h-9 rounded-lg flex items-center justify-center bg-bg-elevated hover:bg-bg-hover transition-colors"
      aria-label="发音"
    >
      <Volume2 size={18} className="text-text-secondary" />
    </button>
  );
}
