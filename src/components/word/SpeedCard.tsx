"use client";

import type { VocabEntry } from "@/lib/types";
import { PartTags } from "@/components/word/PartTags";
import { Volume2 } from "lucide-react";
import Link from "next/link";

interface SpeedCardProps {
  entry: VocabEntry;
  onSpeak?: (word: string) => void;
}

export function SpeedCard({ entry, onSpeak }: SpeedCardProps) {
  return (
    <div className="group relative bg-bg-surface border border-border rounded-lg px-3 py-2.5 hover:border-accent/40 transition-colors">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <Link
          href={`/word/${encodeURIComponent(entry.word)}`}
          className="text-[0.95rem] font-semibold text-text-primary hover:text-accent transition-colors truncate"
        >
          {entry.word}
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          {onSpeak && (
            <button
              onClick={() => onSpeak(entry.word)}
              className="w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-accent opacity-0 group-hover:opacity-100 transition-all"
              aria-label="发音"
            >
              <Volume2 size={13} />
            </button>
          )}
          <span className="text-xs text-text-secondary truncate max-w-[120px]">
            {entry.definition}
          </span>
        </div>
      </div>
      <PartTags parts={entry.parts} />
    </div>
  );
}
