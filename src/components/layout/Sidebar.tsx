"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/store/app-store";
import type { SidebarGroup } from "@/lib/types";

const STORAGE_KEY = "sidebar-collapsed-groups";
const DEFAULT_EXPAND_COUNT = 3;

interface SidebarProps {
  groups: SidebarGroup[];
}

function loadCollapsedFromStorage(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveCollapsedToStorage(collapsed: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...collapsed]));
  } catch {
    // silently ignore storage errors
  }
}

export function Sidebar({ groups }: SidebarProps) {
  const { activeRoot, setActiveRoot, query } = useAppStore();

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    const stored = loadCollapsedFromStorage();
    if (stored.size > 0) return stored;
    // Default: collapse groups beyond the first N
    const toCollapse = new Set<string>();
    groups.slice(DEFAULT_EXPAND_COUNT).forEach((g) => toCollapse.add(g.label));
    return toCollapse;
  });

  // Persist collapsed state to localStorage whenever it changes
  useEffect(() => {
    saveCollapsedToStorage(collapsedGroups);
  }, [collapsedGroups]);

  // When search is active, expand all groups
  const isSearching = !!query && query.trim().length > 0;

  const toggleGroup = useCallback((label: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }, []);

  const totalRootCount = groups.reduce((sum, g) => sum + g.roots.length, 0);

  return (
    <aside className="hidden lg:block w-[260px] bg-bg-surface border-r border-border overflow-y-auto h-[calc(100vh-56px)] sticky top-[56px]">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
          词根导航 ({totalRootCount})
        </h2>
      </div>
      <nav className="py-2">
        {groups.map((group) => {
          const isCollapsed = !isSearching && collapsedGroups.has(group.label);

          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className="w-full text-left px-4 py-2 flex items-center justify-between hover:bg-bg-hover transition-colors"
              >
                <span className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
                  {group.label}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">{group.roots.length}</span>
                  <span className="text-xs text-text-muted">
                    {isCollapsed ? "▶" : "▼"}
                  </span>
                </span>
              </button>
              {!isCollapsed &&
                group.roots.map((root) => (
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
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
