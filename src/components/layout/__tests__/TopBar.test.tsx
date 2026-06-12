import { render, screen, fireEvent, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { TopBar } from "../TopBar";

// ---------------------------------------------------------------------------
// Store mock – a lightweight stand-in for useAppStore.
//
// The mock hook reads from a mutable `storeState` variable so each test
// can swap in a fresh instance via `setStore()`.  The actual Zustand
// store actions are replaced with `vi.fn()` spies.
// ---------------------------------------------------------------------------

let mockSetQuery: ReturnType<typeof vi.fn>;
let mockQuery = "";

vi.mock("@/store/app-store", () => ({
  useAppStore: () => ({ query: mockQuery, setQuery: mockSetQuery }),
}));

// ---------------------------------------------------------------------------
// next-themes mock
// ---------------------------------------------------------------------------

let mockTheme = "light";
let mockSetTheme: ReturnType<typeof vi.fn>;

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: mockTheme, setTheme: mockSetTheme }),
}));

// ---------------------------------------------------------------------------
// next/link mock – render as a plain <a> for jsdom
// ---------------------------------------------------------------------------

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function renderTopBar() {
  return render(<TopBar />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TopBar", () => {
  beforeEach(() => {
    mockSetQuery = vi.fn();
    mockSetTheme = vi.fn();
    mockQuery = "";
    mockTheme = "light";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Logo / title
  // -----------------------------------------------------------------------

  it("renders the application title '林序'", () => {
    renderTopBar();
    expect(screen.getByText("林序")).toBeInTheDocument();
  });

  it("logo links to the home page", () => {
    renderTopBar();
    const link = screen.getByText("林序").closest("a");
    expect(link).toHaveAttribute("href", "/");
  });

  // -----------------------------------------------------------------------
  // Search input
  // -----------------------------------------------------------------------

  it("renders the search input with correct placeholder", () => {
    renderTopBar();
    expect(
      screen.getByPlaceholderText("搜索单词、词根或定义...")
    ).toBeInTheDocument();
  });

  it("calls setQuery with the typed value after debounce delay", () => {
    vi.useFakeTimers();

    renderTopBar();

    const input = screen.getByPlaceholderText("搜索单词、词根或定义...");
    fireEvent.change(input, { target: { value: "test" } });

    // setQuery should NOT be called immediately (debounce pending)
    expect(mockSetQuery).not.toHaveBeenCalled();

    // Advance past the DEBOUNCE_MS (200 ms) window
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(mockSetQuery).toHaveBeenCalledWith("test");
  });

  it("debounces rapid keystrokes so only the final value is submitted", () => {
    vi.useFakeTimers();

    renderTopBar();

    const input = screen.getByPlaceholderText("搜索单词、词根或定义...");

    fireEvent.change(input, { target: { value: "a" } });
    fireEvent.change(input, { target: { value: "ab" } });
    fireEvent.change(input, { target: { value: "abc" } });

    act(() => {
      vi.advanceTimersByTime(250);
    });

    // Only the last value should have been dispatched
    expect(mockSetQuery).toHaveBeenCalledTimes(1);
    expect(mockSetQuery).toHaveBeenCalledWith("abc");
  });

  // -----------------------------------------------------------------------
  // Clear button
  // -----------------------------------------------------------------------

  it("renders the clear button when query is non-empty", () => {
    mockQuery = "hello";
    renderTopBar();

    const clearBtn = screen.getByRole("button", { name: /清空/i });
    expect(clearBtn).toBeInTheDocument();
  });

  it("does NOT render the clear button when query is empty", () => {
    mockQuery = "";
    renderTopBar();

    expect(screen.queryByRole("button", { name: /清空/i })).not.toBeInTheDocument();
  });

  it("calls setQuery('') when the clear button is clicked", () => {
    mockQuery = "hello";
    renderTopBar();

    const clearBtn = screen.getByRole("button", { name: /清空/i });
    fireEvent.click(clearBtn);

    expect(mockSetQuery).toHaveBeenCalledWith("");
  });

  // -----------------------------------------------------------------------
  // Theme toggle
  // -----------------------------------------------------------------------

  it("renders the theme toggle button", () => {
    renderTopBar();
    expect(
      screen.getByRole("button", { name: "切换主题" })
    ).toBeInTheDocument();
  });

  it("theme toggle is clickable", () => {
    renderTopBar();
    const btn = screen.getByRole("button", { name: "切换主题" });
    expect(btn).toBeEnabled();
    fireEvent.click(btn);
    // ThemeToggle internally calls setTheme() from next-themes;
    // our mock just records the call. The button should not throw.
  });
});
