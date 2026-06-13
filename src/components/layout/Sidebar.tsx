"use client";

import { useAppStore } from "@/store/app-store";
import type { LearnStatus, SidebarRoot } from "@/lib/types";
import { Check } from "lucide-react";

interface SidebarProps {
  roots: SidebarRoot[];
  getRootStatus?: (rootText: string) => LearnStatus;
}

export function Sidebar({ roots, getRootStatus }: SidebarProps) {
  const { activeRoot, setActiveRoot } = useAppStore();

  return (
    <aside className="hidden lg:block w-[260px] bg-bg-surface border-r border-border overflow-y-auto h-[calc(100vh-56px)] sticky top-[56px]">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
          词根导航 ({roots.length})
        </h2>
      </div>
      <nav className="py-2">
        {roots.map((root) => (
          <button
            key={root.t}
            onClick={() =>
              setActiveRoot(activeRoot === root.t ? null : root.t)
            }
            className={`root-item w-full text-left ${
              activeRoot === root.t ? "active" : ""
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm text-root truncate">
                  {root.t}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {getRootStatus && (() => {
                    const s = getRootStatus(root.t);
                    if (s === "mastered") {
                      return <Check size={12} className="text-green-500" />;
                    }
                    if (s === "learning" || s === "reviewing") {
                      return <span className="w-2 h-2 rounded-full bg-yellow-400" />;
                    }
                    return null;
                  })()}
                  <span className="text-xs text-text-muted">
                    {root.c}
                  </span>
                </div>
              </div>
              <p className="text-xs text-text-muted truncate mt-0.5">
                {root.m}
              </p>
            </div>
          </button>
        ))}
      </nav>
    </aside>
  );
}
