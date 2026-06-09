"use client";

import { useAppStore } from "@/store/app-store";
import type { SidebarRoot } from "@/lib/types";

interface SidebarProps {
  roots: SidebarRoot[];
}

export function Sidebar({ roots }: SidebarProps) {
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
                <span className="text-xs text-text-muted shrink-0">
                  {root.c}
                </span>
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
