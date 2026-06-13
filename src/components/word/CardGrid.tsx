"use client";

import type { VocabEntry } from "@/lib/types";
import { WordCard } from "./WordCard";

interface CardGridProps {
  entries: { entry: VocabEntry; index: number }[];
  favorites?: Set<number>;
  onToggleFavorite?: (index: number) => void;
  onSpeak?: (word: string) => void;
  emptyMessage?: string;
  emptyHint?: string;
}

export function CardGrid({
  entries,
  favorites,
  onToggleFavorite,
  onSpeak,
  emptyMessage,
  emptyHint,
}: CardGridProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-muted">
        <p className="text-lg">{emptyMessage || "没有找到匹配的单词"}</p>
        <p className="text-sm mt-2">{emptyHint || "试试其他搜索词或清除筛选"}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
      {entries.map(({ entry, index }) => (
        <WordCard
          key={entry.word}
          entry={entry}
          index={index}
          isFavorite={favorites?.has(index)}
          onToggleFavorite={onToggleFavorite}
          onSpeak={onSpeak}
        />
      ))}
    </div>
  );
}
