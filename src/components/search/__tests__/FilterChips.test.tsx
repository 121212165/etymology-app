import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterChips } from "../FilterChips";

// ---------------------------------------------------------------------------
// Mock app-store
// ---------------------------------------------------------------------------

const mockSetActiveRoot = vi.fn();
const mockSetQuery = vi.fn();

let storeOverrides: Record<string, unknown> = {};

vi.mock("@/store/app-store", () => ({
  useAppStore: () => ({
    activeRoot: null,
    query: "",
    filteredIndices: [0, 1, 2, 3, 4],
    setActiveRoot: mockSetActiveRoot,
    setQuery: mockSetQuery,
    ...storeOverrides,
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setStore(overrides: Record<string, unknown>) {
  storeOverrides = overrides;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FilterChips", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeOverrides = {};
  });

  // ----- Rendering -----

  it("renders result count", () => {
    render(<FilterChips />);
    expect(screen.getByText(/5 个结果/)).toBeDefined();
  });

  it("renders nothing when no filters are active and result count is shown", () => {
    render(<FilterChips />);
    expect(screen.queryByText(/词根:/)).toBeNull();
    expect(screen.queryByText(/搜索:/)).toBeNull();
    expect(screen.queryByText("清除全部")).toBeNull();
  });

  // ----- Active root chip -----

  it("renders active root chip when activeRoot is set", () => {
    setStore({ activeRoot: "vis" });
    render(<FilterChips />);
    expect(screen.getByText("词根: vis")).toBeDefined();
  });

  it("calls setActiveRoot(null) when root chip close button is clicked", async () => {
    setStore({ activeRoot: "vis" });
    const user = userEvent.setup();
    render(<FilterChips />);

    const rootChip = screen.getByText("词根: vis").closest("span")!;
    const closeButton = within(rootChip).getByRole("button");
    await user.click(closeButton);

    expect(mockSetActiveRoot).toHaveBeenCalledWith(null);
  });

  // ----- Query chip -----

  it("renders query chip when query is set", () => {
    setStore({ query: "carry" });
    render(<FilterChips />);
    expect(screen.getByText("搜索: carry")).toBeDefined();
  });

  it("calls setQuery('') when query chip close button is clicked", async () => {
    setStore({ query: "carry" });
    const user = userEvent.setup();
    render(<FilterChips />);

    const queryChip = screen.getByText("搜索: carry").closest("span")!;
    const closeButton = within(queryChip).getByRole("button");
    await user.click(closeButton);

    expect(mockSetQuery).toHaveBeenCalledWith("");
  });

  // ----- Clear all -----

  it("shows clear-all button when activeRoot is set", () => {
    setStore({ activeRoot: "act" });
    render(<FilterChips />);
    expect(screen.getByText("清除全部")).toBeDefined();
  });

  it("shows clear-all button when query is set", () => {
    setStore({ query: "test" });
    render(<FilterChips />);
    expect(screen.getByText("清除全部")).toBeDefined();
  });

  it("calls both setActiveRoot(null) and setQuery('') when clear-all is clicked", async () => {
    setStore({ activeRoot: "vis", query: "see" });
    const user = userEvent.setup();
    render(<FilterChips />);

    await user.click(screen.getByText("清除全部"));

    expect(mockSetActiveRoot).toHaveBeenCalledWith(null);
    expect(mockSetQuery).toHaveBeenCalledWith("");
  });

  // ----- Both chips at once -----

  it("renders both root and query chips when both are active", () => {
    setStore({ activeRoot: "act", query: "ion" });
    render(<FilterChips />);
    expect(screen.getByText("词根: act")).toBeDefined();
    expect(screen.getByText("搜索: ion")).toBeDefined();
    expect(screen.getByText("清除全部")).toBeDefined();
  });

  // ----- Active chip styling -----

  it("applies root-specific styling class to the root chip", () => {
    setStore({ activeRoot: "vis" });
    render(<FilterChips />);
    const chip = screen.getByText("词根: vis").closest("span")!;
    expect(chip.className).toContain("bg-root");
  });

  it("applies accent-specific styling class to the query chip", () => {
    setStore({ query: "test" });
    render(<FilterChips />);
    const chip = screen.getByText("搜索: test").closest("span")!;
    expect(chip.className).toContain("bg-accent");
  });

  // ----- Edge cases -----

  it("renders with empty filteredIndices without crashing", () => {
    setStore({ filteredIndices: [] });
    render(<FilterChips />);
    expect(screen.getByText(/0 个结果/)).toBeDefined();
  });

  it("renders with large result count using locale formatting", () => {
    setStore({ filteredIndices: Array.from({ length: 12345 }, (_, i) => i) });
    render(<FilterChips />);
    expect(screen.getByText(/12,345 个结果/)).toBeDefined();
  });

  it("does not crash when store returns all defaults", () => {
    render(<FilterChips />);
    expect(screen.getByText(/个结果/)).toBeDefined();
  });
});
