import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import type { SearchIndex } from "@/lib/types";

const mockIndex: SearchIndex = {
  data: [
    {
      word: "conduct",
      definition: "to lead, guide",
      parts: [
        { type: "prefix", text: "con-", meaning: "together", decomposed: false },
        { type: "root", text: "duct", meaning: "lead", decomposed: false },
      ],
    },
    {
      word: "deduct",
      definition: "to take away",
      parts: [
        { type: "prefix", text: "de-", meaning: "away", decomposed: false },
        { type: "root", text: "duct", meaning: "lead", decomposed: false },
      ],
    },
    {
      word: "aqueduct",
      definition: "a channel for water",
      parts: [
        { type: "root", text: "aqua", meaning: "water", decomposed: false },
        { type: "root", text: "duct", meaning: "lead", decomposed: false },
      ],
    },
  ],
  rootIndex: {
    duct: { m: "lead", w: [0, 1, 2] },
    aqua: { m: "water", w: [2] },
  },
  wordSorted: [],
  prefixIndex: {},
  suffixIndex: {},
};

let mockGetCachedIndex: () => SearchIndex | null = () => mockIndex;

vi.mock("@/lib/data-loader", () => ({
  getCachedIndex: () => mockGetCachedIndex(),
}));

import { RootNetwork } from "@/components/train/RootNetwork";

describe("RootNetwork", () => {
  let onClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onClose = vi.fn();
    mockGetCachedIndex = () => mockIndex;
  });

  it("renders root text and meaning", () => {
    render(<RootNetwork rootText="duct" onClose={onClose} />);
    expect(screen.getAllByText("duct").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("lead").length).toBeGreaterThanOrEqual(1);
  });

  it("renders associated words in a grid layout", () => {
    const { container } = render(<RootNetwork rootText="duct" onClose={onClose} />);
    expect(screen.getAllByText("conduct").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("deduct").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("aqueduct").length).toBeGreaterThanOrEqual(1);
    const grids = container.querySelectorAll(".grid");
    expect(grids.length).toBeGreaterThanOrEqual(1);
  });

  it("shows single breadcrumb node initially", () => {
    const { container } = render(<RootNetwork rootText="duct" onClose={onClose} />);
    const breadcrumb = container.querySelector(".flex.flex-wrap.items-center.gap-1");
    expect(breadcrumb).not.toBeInTheDocument();
  });

  it("adds breadcrumb node when clicking a root in an expanded card", async () => {
    const { container } = render(<RootNetwork rootText="duct" onClose={onClose} />);

    const conductCard = container.querySelector('[class*="bg-bg-surface"]')!;
    act(() => { fireEvent.click(conductCard); });

    await waitFor(() => {
      expect(container.querySelector('[class*="part-tag-root"]')).not.toBeNull();
    });

    const rootSpan = container.querySelector('[class*="part-tag-root"]')!;
    act(() => { fireEvent.click(rootSpan); });

    const breadcrumb = container.querySelector(".flex.flex-wrap.items-center.gap-1");
    expect(breadcrumb).toBeInTheDocument();
    const breadcrumbButtons = breadcrumb!.querySelectorAll("button");
    expect(breadcrumbButtons.length).toBe(2);
    expect(breadcrumbButtons[0].textContent).toBe("duct");
    expect(breadcrumbButtons[1].textContent).toBe("duct");
  });

  it("navigates back when clicking a breadcrumb node", async () => {
    const { container } = render(<RootNetwork rootText="duct" onClose={onClose} />);

    const conductCard = container.querySelector('[class*="bg-bg-surface"]')!;
    act(() => { fireEvent.click(conductCard); });

    await waitFor(() => {
      expect(container.querySelector('[class*="part-tag-root"]')).not.toBeNull();
    });

    const rootSpan = container.querySelector('[class*="part-tag-root"]')!;
    act(() => { fireEvent.click(rootSpan); });

    const breadcrumb = container.querySelector(".flex.flex-wrap.items-center.gap-1");
    const breadcrumbButtons = breadcrumb!.querySelectorAll("button");

    act(() => { fireEvent.click(breadcrumbButtons[0]); });

    const updatedBreadcrumb = container.querySelector(".flex.flex-wrap.items-center.gap-1");
    expect(updatedBreadcrumb).not.toBeInTheDocument();
    expect(screen.getAllByText("conduct").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("deduct").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("aqueduct").length).toBeGreaterThanOrEqual(1);
  });

  it("calls onClose when clicking the close button", () => {
    const { container } = render(<RootNetwork rootText="duct" onClose={onClose} />);
    const closeBtn = container.querySelector('[aria-label="关闭"]') as HTMLButtonElement;
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("returns null when getCachedIndex returns null", () => {
    mockGetCachedIndex = () => null;
    const { container } = render(<RootNetwork rootText="duct" onClose={onClose} />);
    expect(container.innerHTML).toBe("");
  });

  it("returns null when root is not found in index", () => {
    const { container } = render(<RootNetwork rootText="unknown" onClose={onClose} />);
    expect(container.innerHTML).toBe("");
  });
});
