"use client";

import { useEffect, useMemo } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { CardGrid } from "@/components/word/CardGrid";
import { FilterChips } from "@/components/search/FilterChips";
import { Pagination } from "@/components/ui/Pagination";
import { useSearch } from "@/hooks/useSearch";
import { useFavorites } from "@/hooks/useFavorites";
import { useSpeak } from "@/hooks/useSpeak";
import { useAppStore } from "@/store/app-store";
import { buildSidebarData } from "@/lib/search-engine";
import { PAGE_SIZE } from "@/lib/constants";
import type { SidebarRoot } from "@/lib/types";

export default function HomePage() {
  const { loading } = useSearch();
  const { favorites, toggle: toggleFav } = useFavorites();
  const speak = useSpeak();

  const {
    searchIndex,
    filteredIndices,
    currentPage,
  } = useAppStore();

  // Build sidebar data from search index
  const sidebarRoots: SidebarRoot[] = useMemo(() => {
    if (!searchIndex) return [];
    return buildSidebarData(searchIndex.rootIndex);
  }, [searchIndex]);

  // Current page entries
  const pageEntries = useMemo(() => {
    if (!searchIndex) return [];
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return filteredIndices.slice(start, end).map((idx) => ({
      entry: searchIndex.data[idx],
      index: idx,
    }));
  }, [searchIndex, filteredIndices, currentPage]);

  // Loading state
  if (loading || !searchIndex) {
    return (
      <div className="min-h-screen bg-bg-deep flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary text-sm">加载数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-deep">
      <TopBar />

      <div className="flex">
        {/* Sidebar */}
        <Sidebar roots={sidebarRoots} />

        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 lg:p-6">
          {/* Filter chips */}
          <div className="mb-4">
            <FilterChips />
          </div>

          {/* Card grid */}
          <CardGrid
            entries={pageEntries}
            favorites={favorites}
            onToggleFavorite={toggleFav}
            onSpeak={speak}
          />

          {/* Pagination */}
          <Pagination />
        </main>
      </div>
    </div>
  );
}
