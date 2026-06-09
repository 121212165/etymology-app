"use client";

import { useAppStore } from "@/store/app-store";
import { X } from "lucide-react";

export function FilterChips() {
  const { activeRoot, query, setActiveRoot, setQuery, filteredIndices } =
    useAppStore();

  const hasFilters = activeRoot || query;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Result count */}
      <span className="text-sm text-text-muted">
        {filteredIndices.length.toLocaleString()} 个结果
      </span>

      {/* Active root chip */}
      {activeRoot && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-root/15 text-root text-xs font-medium">
          词根: {activeRoot}
          <button
            onClick={() => setActiveRoot(null)}
            className="hover:opacity-70"
          >
            <X size={12} />
          </button>
        </span>
      )}

      {/* Query chip */}
      {query && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/15 text-accent text-xs font-medium">
          搜索: {query}
          <button
            onClick={() => setQuery("")}
            className="hover:opacity-70"
          >
            <X size={12} />
          </button>
        </span>
      )}

      {/* Clear all */}
      {hasFilters && (
        <button
          onClick={() => {
            setActiveRoot(null);
            setQuery("");
          }}
          className="text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          清除全部
        </button>
      )}
    </div>
  );
}
