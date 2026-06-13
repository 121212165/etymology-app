import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useSearch } from "../useSearch";
import type { SearchIndex } from "@/lib/types";

// Mock data-loader
vi.mock("@/lib/data-loader", () => ({
  loadSearchIndex: vi.fn(),
}));

// Mock app-store
const mockSetSearchIndex = vi.fn();
let mockStoreState: { searchIndex: SearchIndex | null; setSearchIndex: typeof mockSetSearchIndex };

vi.mock("@/store/app-store", () => ({
  useAppStore: vi.fn(() => mockStoreState),
}));

import { loadSearchIndex } from "@/lib/data-loader";
import { useAppStore } from "@/store/app-store";

const fakeIndex: SearchIndex = {
  data: [
    { word: "abandon", definition: "to give up", parts: [], source: "test" },
  ],
  rootIndex: { "-band-": { m: "to bind", w: [0] } },
  wordSorted: [{ w: "abandon", i: 0 }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockStoreState = {
    searchIndex: null,
    setSearchIndex: mockSetSearchIndex,
  };
  (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStoreState);
  (loadSearchIndex as ReturnType<typeof vi.fn>).mockResolvedValue(fakeIndex);
});

describe("useSearch", () => {
  it("returns loading=true initially when searchIndex is null", () => {
    const { result } = renderHook(() => useSearch());
    expect(result.current.loading).toBe(true);
    expect(result.current.ready).toBe(false);
  });

  it("sets loading to false after loadSearchIndex resolves", async () => {
    const { result } = renderHook(() => useSearch());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.ready).toBe(false); // store mock still has null searchIndex
  });

  it("calls setSearchIndex with the loaded index", async () => {
    renderHook(() => useSearch());

    await waitFor(() => {
      expect(mockSetSearchIndex).toHaveBeenCalledWith(fakeIndex);
    });
  });

  it("returns ready=true when searchIndex already exists in store", () => {
    mockStoreState.searchIndex = fakeIndex;

    const { result } = renderHook(() => useSearch());

    expect(result.current.loading).toBe(false);
    expect(result.current.ready).toBe(true);
    expect(loadSearchIndex).not.toHaveBeenCalled();
  });

  it("sets loading to false on fetch failure without crashing", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (loadSearchIndex as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error")
    );

    const { result } = renderHook(() => useSearch());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.ready).toBe(false);
    expect(mockSetSearchIndex).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to load search index:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});
