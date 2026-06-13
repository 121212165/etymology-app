import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "../Sidebar";
import type { SidebarGroup } from "@/lib/types";

// ---------------------------------------------------------------------------
// Polyfill localStorage if jsdom doesn't provide it
// ---------------------------------------------------------------------------
const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = String(v); },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { for (const k in store) delete store[k]; },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
};
beforeAll(() => {
  if (typeof window !== "undefined" && !window.localStorage.getItem) {
    Object.defineProperty(window, "localStorage", { value: mockLocalStorage });
  }
});

// ---------------------------------------------------------------------------
// Mock useAppStore
// ---------------------------------------------------------------------------
const mockSetActiveRoot = vi.fn();
let mockActiveRoot: string | null = null;
let mockQuery = "";

vi.mock("@/store/app-store", () => ({
  useAppStore: () => ({
    activeRoot: mockActiveRoot,
    setActiveRoot: mockSetActiveRoot,
    query: mockQuery,
  }),
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
function makeGroups(count: number): SidebarGroup[] {
  return Array.from({ length: count }, (_, gi) => ({
    label: `Group${gi + 1}`,
    icon: `icon-${gi}`,
    roots: Array.from({ length: 2 }, (_, ri) => ({
      t: `root-${gi}-${ri}`,
      m: `meaning-${gi}-${ri}`,
      c: gi * 10 + ri,
    })),
  }));
}

const FIVE_GROUPS = makeGroups(5);
const STORAGE_KEY = "sidebar-collapsed-groups";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("Sidebar", () => {
  beforeEach(() => {
    mockActiveRoot = null;
    mockQuery = "";
    mockSetActiveRoot.mockReset();
    try { window.localStorage.clear(); } catch { /* ignore */ }
  });

  // ---- Rendering ----------------------------------------------------------

  describe("rendering", () => {
    it("renders all group labels", () => {
      render(<Sidebar groups={FIVE_GROUPS} />);

      FIVE_GROUPS.forEach((g) => {
        expect(screen.getByText(g.label)).toBeInTheDocument();
      });
    });

    it("renders root buttons inside expanded groups", () => {
      render(<Sidebar groups={FIVE_GROUPS} />);

      // Only first 3 groups are expanded by default
      FIVE_GROUPS.slice(0, 3).forEach((g) => {
        g.roots.forEach((r) => {
          expect(screen.getByText(r.t)).toBeInTheDocument();
        });
      });
      // Collapsed groups: roots not in DOM
      FIVE_GROUPS.slice(3).forEach((g) => {
        g.roots.forEach((r) => {
          expect(screen.queryByText(r.t)).not.toBeInTheDocument();
        });
      });
    });

    it("displays the total root count in the header", () => {
      render(<Sidebar groups={FIVE_GROUPS} />);
      const total = FIVE_GROUPS.reduce((s, g) => s + g.roots.length, 0);
      expect(
        screen.getByText(new RegExp(`\\(${total}\\)`))
      ).toBeInTheDocument();
    });
  });

  // ---- Collapse / Expand --------------------------------------------------

  describe("collapse / expand", () => {
    it("keeps the first 3 groups expanded by default", () => {
      render(<Sidebar groups={FIVE_GROUPS} />);

      // First 3 groups: roots should be visible
      FIVE_GROUPS.slice(0, 3).forEach((g) => {
        g.roots.forEach((r) => {
          expect(screen.getByText(r.t)).toBeVisible();
        });
      });
    });

    it("collapses groups beyond the first 3 by default", () => {
      render(<Sidebar groups={FIVE_GROUPS} />);

      // Groups 4 & 5: roots not in DOM when collapsed
      FIVE_GROUPS.slice(3).forEach((g) => {
        g.roots.forEach((r) => {
          expect(screen.queryByText(r.t)).not.toBeInTheDocument();
        });
      });
    });

    it("toggles a group when its label is clicked", () => {
      render(<Sidebar groups={FIVE_GROUPS} />);

      // Group 4 is collapsed by default -- click to expand
      const group4Label = screen.getByText("Group4");
      fireEvent.click(group4Label);

      FIVE_GROUPS[3].roots.forEach((r) => {
        expect(screen.getByText(r.t)).toBeInTheDocument();
      });

      // Click again to collapse
      fireEvent.click(group4Label);
      FIVE_GROUPS[3].roots.forEach((r) => {
        expect(screen.queryByText(r.t)).not.toBeInTheDocument();
      });
    });

    it("hides roots when a group is collapsed", () => {
      render(<Sidebar groups={FIVE_GROUPS} />);

      // Collapse Group1 (expanded by default)
      fireEvent.click(screen.getByText("Group1"));

      FIVE_GROUPS[0].roots.forEach((r) => {
        expect(screen.queryByText(r.t)).not.toBeInTheDocument();
      });
    });

    it("shows roots when a group is expanded", () => {
      render(<Sidebar groups={FIVE_GROUPS} />);

      // Group5 is collapsed; expand it
      fireEvent.click(screen.getByText("Group5"));

      FIVE_GROUPS[4].roots.forEach((r) => {
        expect(screen.getByText(r.t)).toBeVisible();
      });
    });
  });

  // ---- localStorage persistence -------------------------------------------

  describe("localStorage persistence", () => {
    it("writes collapsed state to localStorage on change", () => {
      render(<Sidebar groups={FIVE_GROUPS} />);

      // Collapse Group1
      fireEvent.click(screen.getByText("Group1"));

      const stored: string[] = JSON.parse(
        localStorage.getItem(STORAGE_KEY) ?? "[]"
      );
      expect(stored).toContain("Group1");
    });

    it("restores collapsed state from localStorage on mount", () => {
      // Pre-seed: collapse Group1, Group2, Group3
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(["Group1", "Group2", "Group3"])
      );

      render(<Sidebar groups={FIVE_GROUPS} />);

      // Those groups should be collapsed
      ["Group1", "Group2", "Group3"].forEach((label) => {
        const gi = parseInt(label.replace("Group", ""), 10) - 1;
        FIVE_GROUPS[gi].roots.forEach((r) => {
          expect(screen.queryByText(r.t)).not.toBeInTheDocument();
        });
      });

      // Group4 and Group5 were not in stored list, so they should be expanded
      [3, 4].forEach((gi) => {
        FIVE_GROUPS[gi].roots.forEach((r) => {
          expect(screen.getByText(r.t)).toBeVisible();
        });
      });
    });
  });

  // ---- Search behavior ----------------------------------------------------

  describe("search behavior", () => {
    it("does not auto-expand when query is empty", () => {
      mockQuery = "";
      render(<Sidebar groups={FIVE_GROUPS} />);

      // Groups 4 & 5 are collapsed by default
      FIVE_GROUPS.slice(3).forEach((g) => {
        g.roots.forEach((r) => {
          expect(screen.queryByText(r.t)).not.toBeInTheDocument();
        });
      });
    });

    it("expands all groups when query is non-empty", () => {
      mockQuery = "test";
      render(<Sidebar groups={FIVE_GROUPS} />);

      // ALL groups should have their roots visible
      FIVE_GROUPS.forEach((g) => {
        g.roots.forEach((r) => {
          expect(screen.getByText(r.t)).toBeVisible();
        });
      });
    });

    it("expands all groups even when previously collapsed in localStorage", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(["Group1", "Group2", "Group3", "Group4", "Group5"])
      );
      mockQuery = "search";

      render(<Sidebar groups={FIVE_GROUPS} />);

      FIVE_GROUPS.forEach((g) => {
        g.roots.forEach((r) => {
          expect(screen.getByText(r.t)).toBeVisible();
        });
      });
    });
  });

  // ---- Root selection -----------------------------------------------------

  describe("root selection", () => {
    it("calls setActiveRoot with the root text when a root button is clicked", () => {
      render(<Sidebar groups={FIVE_GROUPS} />);

      fireEvent.click(screen.getByText("root-0-0"));
      expect(mockSetActiveRoot).toHaveBeenCalledWith("root-0-0");
    });

    it("calls setActiveRoot(null) when the active root is clicked again", () => {
      mockActiveRoot = "root-0-0";
      render(<Sidebar groups={FIVE_GROUPS} />);

      fireEvent.click(screen.getByText("root-0-0"));
      expect(mockSetActiveRoot).toHaveBeenCalledWith(null);
    });

    it("applies the 'active' CSS class to the active root button", () => {
      mockActiveRoot = "root-1-0";
      render(<Sidebar groups={FIVE_GROUPS} />);

      const activeButton = screen.getByText("root-1-0").closest("button");
      expect(activeButton).toHaveClass("active");
    });

    it("does not apply 'active' class to non-active root buttons", () => {
      mockActiveRoot = "root-1-0";
      render(<Sidebar groups={FIVE_GROUPS} />);

      const otherButton = screen.getByText("root-0-0").closest("button");
      expect(otherButton).not.toHaveClass("active");
    });
  });
});
