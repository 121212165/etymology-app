import { create } from "zustand";
import type { SearchIndex } from "@/lib/types";
import { executeSearch } from "@/lib/search-engine";

interface AppState {
  searchIndex: SearchIndex | null;
  filteredIndices: number[];
  query: string;
  activeRoot: string | null;

  setSearchIndex: (index: SearchIndex) => void;
  setQuery: (q: string) => void;
  setActiveRoot: (root: string | null) => void;
  applyFilters: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  searchIndex: null,
  filteredIndices: [],
  query: "",
  activeRoot: null,

  setSearchIndex: (index) => {
    const state = get();
    set({ searchIndex: index });
    const results = executeSearch(index, state.query, state.activeRoot);
    set({ filteredIndices: results });
  },

  setQuery: (query) => {
    set({ query });
    get().applyFilters();
  },

  setActiveRoot: (activeRoot) => {
    set({ activeRoot });
    get().applyFilters();
  },

  applyFilters: () => {
    const { searchIndex, query, activeRoot } = get();
    if (!searchIndex) return;
    const results = executeSearch(searchIndex, query, activeRoot);
    set({ filteredIndices: results });
  },
}));
