"use client";

import type { VocabEntry } from "@/lib/types";
import { PartTags } from "./PartTags";
import { Volume2 } from "lucide-react";
import Link from "next/link";

interface WordCardProps {
  entry: VocabEntry;
  onSpeak?: (word: string) => void;
}

export function WordCard({ entry, onSpeak }: WordCardProps) {
  return (
    <div className="relative bg-bg-surface border border-border rounded-[10px] p-4 hover:border-accent/30 hover:-translate-y-0.5 transition-all duration-200 group">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <Link
            href={`/word/${encodeURIComponent(entry.word)}`}
            className="text-lg font-semibold text-text-primary hover:text-accent transition-colors truncate block"
          >
            {entry.word}
          </Link>
          <p className="text-sm text-text-secondary mt-0.5 truncate">
            {entry.definition}
          </p>
        </div>

        {onSpeak && (
          <button
            onClick={() => onSpeak(entry.word)}
            className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-accent hover:bg-bg-elevated transition-colors shrink-0"
            aria-label="发音"
          >
            <Volume2 size={14} />
          </button>
        )}
      </div>

      <PartTags parts={entry.parts} />
    </div>
  );
}
