"use client";

import { useEffect, useState, useCallback } from "react";
import { loadSearchIndex } from "@/lib/data-loader";
import { useAppStore } from "@/store/app-store";

export function useSearch() {
  const { searchIndex, setSearchIndex } = useAppStore();
  const [loading, setLoading] = useState(!searchIndex);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    loadSearchIndex()
      .then((index) => {
        setSearchIndex(index);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load search index:", err);
        setError("数据加载失败，请检查网络连接");
        setLoading(false);
      });
  }, [setSearchIndex]);

  useEffect(() => {
    if (searchIndex) return;
    load();
  }, [searchIndex, load]);

  return { loading, error, retry: load, ready: !!searchIndex };
}
