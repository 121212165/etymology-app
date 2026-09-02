"use client";

import { SearchInput } from "@/components/search/SearchInput";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { MaskToggle } from "@/components/mask/MaskToggle";
import { AuthMenu } from "@/components/auth/AuthMenu";
import { Brain, TreesIcon } from "lucide-react";
import Link from "next/link";

export function TopBar() {
  return (
    <header className="sticky top-0 z-50 h-[56px] bg-bg-surface/95 backdrop-blur-sm border-b border-border flex items-center gap-4 px-4 lg:px-6">
      <Link href="/" className="flex items-center gap-2 shrink-0">
        <TreesIcon size={22} className="text-accent" />
        <span className="text-lg font-semibold text-text-primary hidden sm:block">
          林序
        </span>
      </Link>

      <div className="flex-1 flex justify-center">
        <SearchInput />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/roots/memory"
          title="词根记忆"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
        >
          <Brain size={16} />
          <span className="text-sm">记忆</span>
        </Link>
        <MaskToggle />
        <AuthMenu />
        <ThemeToggle />
      </div>
    </header>
  );
}
