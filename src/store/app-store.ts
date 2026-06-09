import { create } from "zustand";
import type { VocabEntry, ViewMode, SearchIndex } from "@/lib/types";
import { executeSearch } from "@/lib/search-engine";

interface AppState {
  // Data
  searchIndex: SearchIndex | null;
  filteredIndices: number[];

  // UI state
  query: string;
  activeRoot: string | null;
  currentPage: number;
  viewMode: ViewMode;

  // Actions
  setSearchIndex: (index: SearchIndex) => void;
  setQuery: (q: string) => void;
  setActiveRoot: (root: string | null) => void;
  setCurrentPage: (page: number) => void;
  setViewMode: (mode: ViewMode) => void;
  applyFilters: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  searchIndex: null,
  filteredIndices: [],
  query: "",
  activeRoot: null,
  currentPage: 1,
  viewMode: "list",

  setSearchIndex: (index) => {
    const state = get();
    set({ searchIndex: index });
    // Apply initial filters with the new index
    const results = executeSearch(index, state.query, state.activeRoot);
    set({ filteredIndices: results, currentPage: 1 });
  },

  setQuery: (query) => {
    set({ query, currentPage: 1 });
    get().applyFilters();
  },

  setActiveRoot: (activeRoot) => {
    set({ activeRoot, currentPage: 1 });
    get().applyFilters();
  },

  setCurrentPage: (currentPage) => set({ currentPage }),

  setViewMode: (viewMode) => set({ viewMode }),

  applyFilters: () => {
    const { searchIndex, query, activeRoot } = get();
    if (!searchIndex) return;
    const results = executeSearch(searchIndex, query, activeRoot);
    set({ filteredIndices: results });
  },
}));
