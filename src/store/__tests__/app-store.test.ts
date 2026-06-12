import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock executeSearch so setSearchIndex / applyFilters don't require real data
vi.mock("@/lib/search-engine", () => ({
  executeSearch: vi.fn((_index: unknown, query: string, activeRoot: string | null) => {
    // Return deterministic stub results based on arguments
    if (activeRoot) return [0, 1];
    if (query) return [2, 3];
    return [0, 1, 2, 3, 4];
  }),
}));

import { useAppStore } from "../app-store";
import { executeSearch } from "@/lib/search-engine";
import type { SearchIndex } from "@/lib/types";

const mockSearchIndex: SearchIndex = {
  data: [],
  rootIndex: {},
  wordSorted: [],
};

function resetStore() {
  useAppStore.setState({
    query: "",
    activeRoot: null,
    currentPage: 1,
    searchIndex: null,
    filteredIndices: [],
    viewMode: "list",
  });
}

describe("app-store", () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  // ── Initial state ──────────────────────────────────────────────────────

  describe("initial state", () => {
    it("query defaults to empty string", () => {
      expect(useAppStore.getState().query).toBe("");
    });

    it("activeRoot defaults to null", () => {
      expect(useAppStore.getState().activeRoot).toBeNull();
    });

    it("currentPage defaults to 1", () => {
      expect(useAppStore.getState().currentPage).toBe(1);
    });

    it("searchIndex defaults to null", () => {
      expect(useAppStore.getState().searchIndex).toBeNull();
    });

    it("filteredIndices defaults to empty array", () => {
      expect(useAppStore.getState().filteredIndices).toEqual([]);
    });
  });

  // ── setQuery ───────────────────────────────────────────────────────────

  describe("setQuery", () => {
    it("sets query value", () => {
      useAppStore.getState().setQuery("test");
      expect(useAppStore.getState().query).toBe("test");
    });

    it("resets currentPage to 1", () => {
      useAppStore.setState({ currentPage: 5 });
      useAppStore.getState().setQuery("new");
      expect(useAppStore.getState().currentPage).toBe(1);
    });

    it("calls applyFilters after setting query", () => {
      useAppStore.setState({ searchIndex: mockSearchIndex });
      useAppStore.getState().setQuery("hello");
      expect(executeSearch).toHaveBeenCalledWith(mockSearchIndex, "hello", null);
    });

    it("updates filteredIndices via applyFilters", () => {
      useAppStore.setState({ searchIndex: mockSearchIndex });
      useAppStore.getState().setQuery("ca");
      expect(useAppStore.getState().filteredIndices).toEqual([2, 3]);
    });
  });

  // ── setActiveRoot ──────────────────────────────────────────────────────

  describe("setActiveRoot", () => {
    it("sets activeRoot", () => {
      useAppStore.getState().setActiveRoot("duct");
      expect(useAppStore.getState().activeRoot).toBe("duct");
    });

    it("clears activeRoot when set to null", () => {
      useAppStore.setState({ activeRoot: "duct" });
      useAppStore.getState().setActiveRoot(null);
      expect(useAppStore.getState().activeRoot).toBeNull();
    });

    it("resets currentPage to 1", () => {
      useAppStore.setState({ currentPage: 3 });
      useAppStore.getState().setActiveRoot("port");
      expect(useAppStore.getState().currentPage).toBe(1);
    });

    it("calls applyFilters with the new root", () => {
      useAppStore.setState({ searchIndex: mockSearchIndex });
      useAppStore.getState().setActiveRoot("ject");
      expect(executeSearch).toHaveBeenCalledWith(mockSearchIndex, "", "ject");
    });
  });

  // ── setCurrentPage ─────────────────────────────────────────────────────

  describe("setCurrentPage", () => {
    it("sets page number", () => {
      useAppStore.getState().setCurrentPage(5);
      expect(useAppStore.getState().currentPage).toBe(5);
    });

    it("accepts page 1 (lower boundary)", () => {
      useAppStore.getState().setCurrentPage(1);
      expect(useAppStore.getState().currentPage).toBe(1);
    });

    it("accepts large page numbers", () => {
      useAppStore.getState().setCurrentPage(9999);
      expect(useAppStore.getState().currentPage).toBe(9999);
    });

    it("accepts negative values (no guard in store)", () => {
      useAppStore.getState().setCurrentPage(-1);
      expect(useAppStore.getState().currentPage).toBe(-1);
    });

    it("accepts zero (no guard in store)", () => {
      useAppStore.getState().setCurrentPage(0);
      expect(useAppStore.getState().currentPage).toBe(0);
    });
  });

  // ── setSearchIndex ─────────────────────────────────────────────────────

  describe("setSearchIndex", () => {
    it("sets searchIndex", () => {
      useAppStore.getState().setSearchIndex(mockSearchIndex);
      expect(useAppStore.getState().searchIndex).toBe(mockSearchIndex);
    });

    it("calls executeSearch with the new index", () => {
      useAppStore.getState().setSearchIndex(mockSearchIndex);
      expect(executeSearch).toHaveBeenCalledWith(mockSearchIndex, "", null);
    });

    it("updates filteredIndices from executeSearch results", () => {
      useAppStore.getState().setSearchIndex(mockSearchIndex);
      expect(useAppStore.getState().filteredIndices).toEqual([0, 1, 2, 3, 4]);
    });

    it("resets currentPage to 1", () => {
      useAppStore.setState({ currentPage: 7 });
      useAppStore.getState().setSearchIndex(mockSearchIndex);
      expect(useAppStore.getState().currentPage).toBe(1);
    });
  });

  // ── setFilteredIndices ─────────────────────────────────────────────────

  describe("filteredIndices", () => {
    it("can be set directly via setState", () => {
      useAppStore.setState({ filteredIndices: [10, 20, 30] });
      expect(useAppStore.getState().filteredIndices).toEqual([10, 20, 30]);
    });

    it("is overwritten when applyFilters runs", () => {
      useAppStore.setState({ searchIndex: mockSearchIndex, filteredIndices: [99] });
      useAppStore.getState().applyFilters();
      expect(useAppStore.getState().filteredIndices).toEqual([0, 1, 2, 3, 4]);
    });
  });

  // ── applyFilters ───────────────────────────────────────────────────────

  describe("applyFilters", () => {
    it("does nothing when searchIndex is null", () => {
      useAppStore.setState({ filteredIndices: [99] });
      useAppStore.getState().applyFilters();
      expect(useAppStore.getState().filteredIndices).toEqual([99]);
      expect(executeSearch).not.toHaveBeenCalled();
    });

    it("passes current query and activeRoot to executeSearch", () => {
      useAppStore.setState({
        searchIndex: mockSearchIndex,
        query: "test",
        activeRoot: "root",
      });
      useAppStore.getState().applyFilters();
      expect(executeSearch).toHaveBeenCalledWith(mockSearchIndex, "test", "root");
    });
  });
});
