"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { PART_COLORS } from "@/lib/constants";

interface DecomposePart {
  type: "prefix" | "root" | "suffix";
  text: string;
  meaning: string;
}

interface DecomposeResult {
  word: string;
  parts: DecomposePart[];
  confidence: number;
  family: string[];
  etymology: string;
}

interface DecomposePanelProps {
  result: DecomposeResult | null;
  loading: boolean;
  onClose: () => void;
  onWordClick: (word: string) => void;
}

export function DecomposePanel({
  result,
  loading,
  onClose,
  onWordClick,
}: DecomposePanelProps) {
  const [visibleParts, setVisibleParts] = useState<number>(0);

  useEffect(() => {
    if (!result) {
      setVisibleParts(0);
      return;
    }
    setVisibleParts(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    result.parts.forEach((_, i) => {
      timers.push(
        setTimeout(() => setVisibleParts(i + 1), 150 * (i + 1))
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [result]);

  if (!result && !loading) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-2 z-50">
      <div className="bg-bg-surface border border-border rounded-xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-6 flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-text-secondary text-sm">分析词根中...</span>
          </div>
        ) : result ? (
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">
                  {result.word}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-bg-hover rounded-full overflow-hidden w-24">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${result.confidence * 100}%`,
                        background:
                          result.confidence >= 0.8
                            ? "#5BB89A"
                            : result.confidence >= 0.5
                              ? "#E8A84C"
                              : "#E87461",
                      }}
                    />
                  </div>
                  <span className="text-xs text-text-muted">
                    {Math.round(result.confidence * 100)}% 置信度
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-text-muted hover:text-text-secondary transition-colors p-1"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {result.parts.map((part, i) => (
                <div
                  key={`${part.type}-${part.text}-${i}`}
                  className="flex items-center gap-1.5 transition-all duration-300"
                  style={{
                    opacity: i < visibleParts ? 1 : 0,
                    transform: i < visibleParts ? "translateY(0)" : "translateY(8px)",
                  }}
                >
                  <span
                    className="part-tag"
                    style={{
                      background: `${PART_COLORS[part.type]}18`,
                      color: PART_COLORS[part.type],
                    }}
                  >
                    {part.text}
                  </span>
                  <span className="text-xs text-text-muted">{part.meaning}</span>
                  {i < result.parts.length - 1 && (
                    <span className="text-text-muted mx-1">+</span>
                  )}
                </div>
              ))}
            </div>

            <p className="text-xs text-text-secondary mb-3 leading-relaxed">
              {result.etymology}
            </p>

            {result.family.length > 0 && (
              <div>
                <p className="text-xs text-text-muted mb-1.5">同根词</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.family.map((w) => (
                    <button
                      key={w}
                      onClick={() => onWordClick(w)}
                      className="px-2 py-0.5 text-xs rounded-full bg-bg-hover text-text-secondary hover:text-accent hover:bg-accent/10 transition-colors"
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
