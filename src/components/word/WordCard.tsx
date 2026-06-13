"use client";

import type { LearnStatus, VocabEntry } from "@/lib/types";
import { PartTags } from "./PartTags";
import { Check, Star, Volume2 } from "lucide-react";
import Link from "next/link";

interface WordCardProps {
  entry: VocabEntry;
  index: number;
  isFavorite?: boolean;
  onToggleFavorite?: (index: number) => void;
  onSpeak?: (word: string) => void;
  learnStatus?: LearnStatus;
}

export function WordCard({
  entry,
  index,
  isFavorite = false,
  onToggleFavorite,
  onSpeak,
  learnStatus,
}: WordCardProps) {
  return (
    <div className="relative bg-bg-surface border border-border rounded-[10px] p-4 hover:border-accent/30 hover:-translate-y-0.5 transition-all duration-200 group">
      {learnStatus && learnStatus !== "unseen" && (
        <span
          className={`absolute top-2 right-2 flex items-center justify-center w-4 h-4 rounded-full text-[10px] ${
            learnStatus === "learning"
              ? "bg-yellow-400/20 text-yellow-500"
              : learnStatus === "reviewing"
              ? "bg-green-400/20 text-green-500"
              : "bg-green-500/20 text-green-500"
          }`}
          title={learnStatus}
        >
          {learnStatus === "mastered" ? (
            <Check size={10} strokeWidth={3} />
          ) : (
            <span className="w-2 h-2 rounded-full bg-current" />
          )}
        </span>
      )}
      {/* Header: word + definition */}
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

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {onSpeak && (
            <button
              onClick={() => onSpeak(entry.word)}
              className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-accent hover:bg-bg-elevated transition-colors"
              aria-label="发音"
            >
              <Volume2 size={14} />
            </button>
          )}
          {onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(index)}
              className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                isFavorite
                  ? "text-prefix"
                  : "text-text-muted hover:text-prefix hover:bg-bg-elevated"
              }`}
              aria-label="收藏"
            >
              <Star size={14} fill={isFavorite ? "currentColor" : "none"} />
            </button>
          )}
        </div>
      </div>

      {/* Part tags */}
      <PartTags parts={entry.parts} />
    </div>
  );
}
