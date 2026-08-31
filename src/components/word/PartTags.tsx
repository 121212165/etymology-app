"use client";

import type { VocabPart } from "@/lib/types";

export function PartTags({ parts }: { parts: VocabPart[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {parts.map((part, i) =>
        part.type === "linker" ? (
          // 衔接字母：中性裸字母，无词源语义
          <span key={i} className="part-tag part-tag-linker" title={`衔接：${part.meaning}`}>
            <span className="font-mono text-[0.7rem]">{part.text}</span>
          </span>
        ) : (
          <span
            key={i}
            className={`part-tag part-tag-${part.type}`}
            title={part.surface ? `${part.text}（引用形态）：${part.meaning}` : `${part.type}: ${part.meaning}`}
          >
            <span className="font-mono text-[0.7rem]">{part.surface || part.text}</span>
            <span className="opacity-70">{part.meaning}</span>
          </span>
        )
      )}
    </div>
  );
}
