"use client";

import type { VocabPart } from "@/lib/types";

export function PartTags({ parts }: { parts: VocabPart[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {parts.map((part, i) => (
        <span
          key={i}
          className={`part-tag part-tag-${part.type}`}
          title={`${part.type}: ${part.meaning}`}
        >
          <span className="font-mono text-[0.7rem]">{part.text}</span>
          <span className="opacity-70">{part.meaning}</span>
        </span>
      ))}
    </div>
  );
}
