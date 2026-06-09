"use client";

import { Search, X } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { useCallback, useRef } from "react";
import { DEBOUNCE_MS } from "@/lib/constants";

export function SearchInput() {
  const { query, setQuery } = useAppStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setQuery(value), DEBOUNCE_MS);
    },
    [setQuery]
  );

  const handleClear = useCallback(() => {
    setQuery("");
  }, [setQuery]);

  return (
    <div className="relative w-full max-w-md">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
      />
      <input
        type="text"
        defaultValue={query}
        onChange={handleChange}
        placeholder="搜索单词、词根或定义..."
        className="w-full h-10 pl-9 pr-8 rounded-full bg-bg-elevated border border-transparent focus:border-accent/50 focus:outline-none text-sm text-text-primary placeholder:text-text-muted transition-all duration-200"
      />
      {query && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
