"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useAppStore } from "@/store/app-store";
import { useCallback, useRef, useState, useEffect } from "react";
import { DEBOUNCE_MS, PART_COLORS } from "@/lib/constants";
import { quickDecompose, type DecomposeResult } from "@/lib/search-engine";

const MAX_RESULTS = 8;

export function SearchInput() {
  const { query, setQuery, searchIndex, filteredIndices } = useAppStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [decompose, setDecompose] = useState<DecomposeResult | null>(null);
  const [rawInput, setRawInput] = useState(query);

  useEffect(() => {
    if (rawInput.length < 1 || !searchIndex) {
      setDecompose(null);
      return;
    }
    const result = quickDecompose(searchIndex, rawInput);
    setDecompose(result.matched ? result : null);
  }, [rawInput, searchIndex]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setRawInput(value);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setQuery(value), DEBOUNCE_MS);
    },
    [setQuery]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setRawInput("");
    setDecompose(null);
  }, [setQuery]);

  const matched = decompose?.prefix || decompose?.root || decompose?.suffix;

  // 只在用户有输入且已防抖落库的 query 非空时展示结果下拉
  const trimmedQuery = query.trim();
  const showResults =
    trimmedQuery.length > 0 &&
    searchIndex &&
    filteredIndices.length > 0;
  const resultEntries = showResults
    ? filteredIndices
        .slice(0, MAX_RESULTS)
        .map((i) => searchIndex.data[i])
        .filter(Boolean)
    : [];

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
        />
        <input
          type="text"
          value={rawInput}
          onChange={handleChange}
          placeholder="搜索单词、词根或定义..."
          className="w-full h-10 pl-9 pr-8 rounded-full bg-bg-elevated border border-transparent focus:border-accent/50 focus:outline-none text-sm text-text-primary placeholder:text-text-muted transition-all duration-200"
        />
        {rawInput && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {matched && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span
            className="px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: PART_COLORS[matched.type] + "22",
              color: PART_COLORS[matched.type],
            }}
          >
            {matched.type === "prefix" ? "前缀" : matched.type === "root" ? "词根" : "后缀"}: {matched.text}
          </span>
          <span className="text-text-muted">{matched.meaning}</span>
        </div>
      )}
      {showResults && (
        <div className="absolute left-0 right-0 top-full mt-1 max-h-80 overflow-y-auto rounded-lg border border-border bg-bg-surface shadow-lg z-50">
          {resultEntries.length === 0 ? (
            <div className="px-4 py-3 text-sm text-text-muted">
              没有匹配的单词
            </div>
          ) : (
            resultEntries.map((entry) => (
              <Link
                key={entry.word}
                href={`/word/${encodeURIComponent(entry.word)}`}
                onClick={handleClear}
                className="block px-4 py-2 hover:bg-bg-elevated transition-colors"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-text-primary truncate">
                    {entry.word}
                  </span>
                  {entry.parts
                    .filter((p) => p.type === "root")
                    .slice(0, 1)
                    .map((p, i) => (
                      <span
                        key={i}
                        className="text-xs font-mono text-root shrink-0"
                      >
                        {p.text}
                      </span>
                    ))}
                </div>
                <p className="text-xs text-text-secondary truncate mt-0.5">
                  {entry.definition}
                </p>
              </Link>
            ))
          )}
          {filteredIndices.length > MAX_RESULTS && (
            <div className="px-4 py-2 text-xs text-text-muted border-t border-border">
              共 {filteredIndices.length} 个结果，显示前 {MAX_RESULTS} 个
            </div>
          )}
        </div>
      )}
    </div>
  );
}
