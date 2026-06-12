"use client";

import { SearchInput } from "@/components/search/SearchInput";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { TreesIcon } from "lucide-react";
import Link from "next/link";

export function TopBar() {
  return (
    <header className="sticky top-0 z-50 h-[56px] bg-bg-surface/95 backdrop-blur-sm border-b border-border flex items-center gap-4 px-4 lg:px-6">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 shrink-0">
        <TreesIcon size={22} className="text-accent" />
        <span className="text-lg font-semibold text-text-primary hidden sm:block">
          林序
        </span>
      </Link>

      {/* Search */}
      <div className="flex-1 flex justify-center">
        <SearchInput />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/speed"
          className="text-xs text-text-muted hover:text-accent transition-colors px-2 py-1 rounded hover:bg-bg-elevated"
        >
          速览
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
