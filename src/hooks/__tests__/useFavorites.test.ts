import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFavorites } from "../useFavorites";
import { STORAGE_KEYS } from "@/lib/constants";

// Mock localStorage
const store: Record<string, string> = {};

beforeEach(() => {
  // Clear the store before each test
  for (const key in store) delete store[key];

  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        for (const key in store) delete store[key];
      }),
    },
    writable: true,
  });
});

describe("useFavorites", () => {
  it("初始状态为空数组（空 Set）", () => {
    const { result } = renderHook(() => useFavorites());

    expect(result.current.favorites.size).toBe(0);
  });

  it("toggle 添加收藏", () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.toggle(5);
    });

    expect(result.current.favorites.has(5)).toBe(true);
    expect(result.current.isFav(5)).toBe(true);
  });

  it("toggle 再次调用移除收藏", () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.toggle(5);
    });
    expect(result.current.favorites.has(5)).toBe(true);

    act(() => {
      result.current.toggle(5);
    });
    expect(result.current.favorites.has(5)).toBe(false);
    expect(result.current.isFav(5)).toBe(false);
  });

  it("多个收藏的添加和移除", () => {
    const { result } = renderHook(() => useFavorites());

    // Add multiple
    act(() => {
      result.current.toggle(1);
      result.current.toggle(2);
      result.current.toggle(3);
    });

    expect(result.current.favorites.size).toBe(3);
    expect(result.current.isFav(1)).toBe(true);
    expect(result.current.isFav(2)).toBe(true);
    expect(result.current.isFav(3)).toBe(true);

    // Remove one
    act(() => {
      result.current.toggle(2);
    });

    expect(result.current.favorites.size).toBe(2);
    expect(result.current.isFav(1)).toBe(true);
    expect(result.current.isFav(2)).toBe(false);
    expect(result.current.isFav(3)).toBe(true);
  });

  it("收藏后写入 localStorage", () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.toggle(10);
    });

    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.favorites,
      expect.any(String)
    );

    const written = JSON.parse(store[STORAGE_KEYS.favorites]);
    expect(written).toContain(10);
  });

  it("加载时从 localStorage 恢复收藏", () => {
    // Pre-populate localStorage
    store[STORAGE_KEYS.favorites] = JSON.stringify([7, 13, 42]);

    const { result } = renderHook(() => useFavorites());

    // The effect runs after initial render, so favorites should be loaded
    expect(result.current.favorites.size).toBe(3);
    expect(result.current.isFav(7)).toBe(true);
    expect(result.current.isFav(13)).toBe(true);
    expect(result.current.isFav(42)).toBe(true);
  });

  it("无效 localStorage 数据不崩溃，回退为空 Set", () => {
    // Store invalid JSON
    store[STORAGE_KEYS.favorites] = "not-valid-json{{{" ;

    const { result } = renderHook(() => useFavorites());

    expect(result.current.favorites.size).toBe(0);
    expect(result.current.isFav(0)).toBe(false);
  });

  it("localStorage 为空时回退为空 Set", () => {
    // store is empty by default (after beforeEach)
    const { result } = renderHook(() => useFavorites());

    expect(result.current.favorites.size).toBe(0);
  });
});
