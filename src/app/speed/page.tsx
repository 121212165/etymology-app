"use client";

import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { SpeedCard } from "@/components/word/SpeedCard";
import { useSearch } from "@/hooks/useSearch";
import { useSpeak } from "@/hooks/useSpeak";
import { useAppStore } from "@/store/app-store";
import { buildSidebarGroups } from "@/lib/search-engine";
import type { SidebarGroup } from "@/lib/types";

const BATCH = 100;

export default function SpeedPage() {
  const { loading } = useSearch();
  const speak = useSpeak();
  const { searchIndex, filteredIndices, activeRoot } = useAppStore();

  const [shown, setShown] = useState(BATCH);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const sidebarGroups: SidebarGroup[] = useMemo(() => {
    if (!searchIndex) return [];
    return buildSidebarGroups(searchIndex.rootIndex);
  }, [searchIndex]);

  const entries = useMemo(() => {
    if (!searchIndex) return [];
    return filteredIndices.slice(0, shown).map((idx) => ({
      entry: searchIndex.data[idx],
      index: idx,
    }));
  }, [searchIndex, filteredIndices, shown]);

  // Reset shown count when filter changes
  useEffect(() => {
    setShown(BATCH);
  }, [activeRoot, filteredIndices.length]);

  // Infinite scroll via IntersectionObserver
  const loadMore = useCallback(() => {
    setShown((prev) => Math.min(prev + BATCH, filteredIndices.length));
  }, [filteredIndices.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && shown < filteredIndices.length) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [shown, filteredIndices.length, loadMore]);

  if (loading || !searchIndex) {
    return (
      <div className="min-h-screen bg-bg-deep flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary text-sm">加载词源数据…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-deep">
      <TopBar />

      <div className="flex">
        <Sidebar groups={sidebarGroups} />

        <main className="flex-1 min-w-0 p-3 lg:p-5">
          {/* Stats bar */}
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-semibold text-text-secondary">
              速览模式
            </h2>
            <span className="text-xs text-text-muted">
              {shown} / {filteredIndices.length} 词
              {activeRoot && (
                <span className="ml-2 text-accent">· 词根 {activeRoot}</span>
              )}
            </span>
          </div>

          {/* Dense grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {entries.map(({ entry, index }) => (
              <SpeedCard key={index} entry={entry} onSpeak={speak} />
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-8" />

          {shown >= filteredIndices.length && filteredIndices.length > 0 && (
            <p className="text-center text-xs text-text-muted py-6">
              全部 {filteredIndices.length} 词已加载
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
