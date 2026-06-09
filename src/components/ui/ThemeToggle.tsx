"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button className="w-9 h-9 rounded-lg flex items-center justify-center bg-bg-elevated">
        <Moon size={18} className="text-text-secondary" />
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="w-9 h-9 rounded-lg flex items-center justify-center bg-bg-elevated hover:bg-bg-hover transition-colors duration-200"
      aria-label="切换主题"
    >
      {theme === "dark" ? (
        <Sun size={18} className="text-text-secondary" />
      ) : (
        <Moon size={18} className="text-text-secondary" />
      )}
    </button>
  );
}
