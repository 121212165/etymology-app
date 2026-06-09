"use client";

import { useEffect, useState } from "react";
import { loadSearchIndex } from "@/lib/data-loader";
import { useAppStore } from "@/store/app-store";

export function useSearch() {
  const { searchIndex, setSearchIndex } = useAppStore();
  const [loading, setLoading] = useState(!searchIndex);

  useEffect(() => {
    if (searchIndex) return;
    loadSearchIndex()
      .then((index) => {
        setSearchIndex(index);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load search index:", err);
        setLoading(false);
      });
  }, [searchIndex, setSearchIndex]);

  return { loading, ready: !!searchIndex };
}
