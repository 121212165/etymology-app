import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pagination } from "../Pagination";
import type { Mock } from "vitest";

// Mock app-store: intercept the hook so each test controls the state returned
vi.mock("../../../store/app-store", () => ({
  useAppStore: vi.fn(),
}));

vi.mock("lucide-react", () => ({
  ChevronLeft: (props: Record<string, unknown>) => (
    <span data-testid="chevron-left" {...props} />
  ),
  ChevronRight: (props: Record<string, unknown>) => (
    <span data-testid="chevron-right" {...props} />
  ),
}));

import { useAppStore } from "../../../store/app-store";

function setStore(
  overrides: Partial<{
    filteredIndices: number[];
    currentPage: number;
    setCurrentPage: (page: number) => void;
  }> = {}
) {
  (useAppStore as unknown as Mock).mockReturnValue({
    filteredIndices: overrides.filteredIndices ?? Array.from({ length: 80 }, (_, i) => i),
    currentPage: overrides.currentPage ?? 1,
    setCurrentPage: overrides.setCurrentPage ?? vi.fn(),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

describe("Pagination", () => {
  it("returns null when totalPages <= 1", () => {
    setStore({ filteredIndices: [0, 1, 3] }); // 3 items / PAGE_SIZE(20) = 1 page
    const { container } = render(<Pagination />);
    expect(container.innerHTML).toBe("");
  });

  it("renders page buttons when there are multiple pages", () => {
    setStore({ filteredIndices: Array.from({ length: 80 }, (_, i) => i) }); // 4 pages
    render(<Pagination />);
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "4" })).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Current page highlight
  // -----------------------------------------------------------------------

  it("applies accent style to the current page button", () => {
    setStore({
      filteredIndices: Array.from({ length: 80 }, (_, i) => i),
      currentPage: 2,
    });
    render(<Pagination />);
    const current = screen.getByRole("button", { name: "2" });
    expect(current.className).toContain("bg-accent");
  });

  // -----------------------------------------------------------------------
  // Next / previous navigation
  // -----------------------------------------------------------------------

  it("calls setCurrentPage(nextPage) when the next button is clicked", async () => {
    const setCurrentPage = vi.fn();
    setStore({
      filteredIndices: Array.from({ length: 80 }, (_, i) => i),
      currentPage: 2,
      setCurrentPage,
    });
    render(<Pagination />);

    // The next button is the last button (has ChevronRight child)
    const buttons = screen.getAllByRole("button");
    const nextButton = buttons[buttons.length - 1];
    await userEvent.click(nextButton);

    expect(setCurrentPage).toHaveBeenCalledWith(3);
  });

  it("calls setCurrentPage(prevPage) when the previous button is clicked", async () => {
    const setCurrentPage = vi.fn();
    setStore({
      filteredIndices: Array.from({ length: 80 }, (_, i) => i),
      currentPage: 3,
      setCurrentPage,
    });
    render(<Pagination />);

    // The previous button is the first button (has ChevronLeft child)
    const buttons = screen.getAllByRole("button");
    const prevButton = buttons[0];
    await userEvent.click(prevButton);

    expect(setCurrentPage).toHaveBeenCalledWith(2);
  });

  // -----------------------------------------------------------------------
  // Disabled states
  // -----------------------------------------------------------------------

  it("disables the previous button on the first page", () => {
    setStore({
      filteredIndices: Array.from({ length: 80 }, (_, i) => i),
      currentPage: 1,
    });
    render(<Pagination />);

    const buttons = screen.getAllByRole("button");
    const prevButton = buttons[0];
    expect(prevButton).toBeDisabled();
  });

  it("disables the next button on the last page", () => {
    const totalItems = 80; // 4 pages
    setStore({
      filteredIndices: Array.from({ length: totalItems }, (_, i) => i),
      currentPage: 4,
    });
    render(<Pagination />);

    const buttons = screen.getAllByRole("button");
    const nextButton = buttons[buttons.length - 1];
    expect(nextButton).toBeDisabled();
  });

  // -----------------------------------------------------------------------
  // Total pages display
  // -----------------------------------------------------------------------

  it("displays the correct total number of pages", () => {
    const totalItems = 60; // 60 / 20 = 3 pages
    setStore({ filteredIndices: Array.from({ length: totalItems }, (_, i) => i) });
    render(<Pagination />);

    // All page number buttons should be present
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();
    // There should be no page 4 button
    expect(screen.queryByRole("button", { name: "4" })).not.toBeInTheDocument();
  });
});
