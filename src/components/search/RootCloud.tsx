"use client";

import { useMemo } from "react";
import type { RootIndex } from "@/lib/types";
import { useAppStore } from "@/store/app-store";

export function RootCloud({ rootIndex }: { rootIndex: RootIndex }) {
  const { activeRoot, setActiveRoot } = useAppStore();
  const topRoots = useMemo(
    () =>
      Object.entries(rootIndex)
        .map(([t, v]) => ({ t, m: v.m, c: v.w.length }))
        .sort((a, b) => b.c - a.c)
        .slice(0, 30),
    [rootIndex]
  );

  return (
    <div className="flex flex-wrap gap-2">
      {topRoots.map((r) => (
        <button
          key={r.t}
          onClick={() => setActiveRoot(activeRoot === r.t ? null : r.t)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
            activeRoot === r.t
              ? "bg-accent/20 text-accent border border-accent/40"
              : "bg-bg-surface border border-border text-text-secondary hover:text-text-primary hover:border-accent/30"
          }`}
        >
          <span className="font-mono font-medium">{r.t}</span>
          <span className="text-xs text-text-muted">{r.c}</span>
        </button>
      ))}
    </div>
  );
}
