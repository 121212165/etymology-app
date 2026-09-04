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
import { X, Filter } from "lucide-react";

const BATCH = 100;

export default function SpeedPage() {
  const { loading } = useSearch();
  const speak = useSpeak();
  const { searchIndex, filteredIndices, activeRoot, setActiveRoot } =
    useAppStore();

  const [shown, setShown] = useState(BATCH);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
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

  // Lock body scroll when mobile filter is open
  useEffect(() => {
    document.body.style.overflow = mobileFilterOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileFilterOpen]);

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
        {/* Desktop sidebar */}
        <Sidebar groups={sidebarGroups} />

        <main className="flex-1 min-w-0 p-3 lg:p-5">
          {/* Stats bar */}
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-text-secondary">
                速览模式
              </h2>
              {/* Mobile filter toggle */}
              <button
                onClick={() => setMobileFilterOpen(true)}
                className="lg:hidden flex items-center gap-1 text-xs text-text-muted bg-bg-surface border border-border rounded-md px-2 py-1 hover:border-accent/40 transition-colors"
              >
                <Filter size={12} />
                {activeRoot || "词根"}
              </button>
            </div>
            <span className="text-xs text-text-muted">
              {shown} / {filteredIndices.length} 词
              {activeRoot && (
                <span className="ml-2 text-accent">· {activeRoot}</span>
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

      {/* Mobile filter bottom sheet */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-[200] lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileFilterOpen(false)}
          />
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-bg-surface border-t border-border rounded-t-xl max-h-[70vh] flex flex-col">
            {/* Handle */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <span className="text-sm font-semibold text-text-primary">
                词根筛选
              </span>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Clear filter */}
            {activeRoot && (
              <button
                onClick={() => {
                  setActiveRoot(null);
                  setMobileFilterOpen(false);
                }}
                className="mx-4 mt-3 mb-1 text-xs text-accent bg-accent/10 rounded-md px-3 py-2 text-center hover:bg-accent/20 transition-colors"
              >
                清除筛选 · 显示全部
              </button>
            )}

            {/* Root groups list */}
            <div className="overflow-y-auto flex-1 p-2">
              {sidebarGroups.map((group) => (
                <div key={group.label} className="mb-2">
                  <div className="px-2 py-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider">
                    {group.label}
                    <span className="ml-1.5 text-text-muted/60">
                      {group.roots.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 px-1">
                    {group.roots.map((root) => (
                      <button
                        key={root.t}
                        onClick={() => {
                          setActiveRoot(activeRoot === root.t ? null : root.t);
                          setMobileFilterOpen(false);
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                          activeRoot === root.t
                            ? "bg-accent text-white"
                            : "bg-bg-elevated text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                        }`}
                      >
                        <span className="font-mono font-medium">{root.t}</span>
                        <span className="opacity-60">{root.c}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
