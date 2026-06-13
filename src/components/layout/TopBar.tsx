"use client";

import { SearchInput } from "@/components/search/SearchInput";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { TreesIcon, SwordsIcon } from "lucide-react";
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
          href="/challenge"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
        >
          <SwordsIcon size={18} />
          <span className="hidden sm:inline">挑战</span>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
