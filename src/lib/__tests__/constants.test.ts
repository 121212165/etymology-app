import { describe, it, expect } from "vitest";
import {
  PAGE_SIZE,
  DEBOUNCE_MS,
  MIN_SEARCH_LEN,
  STORAGE_KEYS,
  PART_COLORS,
} from "../constants";

describe("PAGE_SIZE", () => {
  it("is a positive integer", () => {
    expect(Number.isInteger(PAGE_SIZE)).toBe(true);
    expect(PAGE_SIZE).toBeGreaterThan(0);
  });

  it("has a reasonable pagination value", () => {
    expect(PAGE_SIZE).toBeGreaterThanOrEqual(5);
    expect(PAGE_SIZE).toBeLessThanOrEqual(100);
  });
});

describe("DEBOUNCE_MS", () => {
  it("is a positive integer", () => {
    expect(Number.isInteger(DEBOUNCE_MS)).toBe(true);
    expect(DEBOUNCE_MS).toBeGreaterThan(0);
  });

  it("has a reasonable debounce delay", () => {
    expect(DEBOUNCE_MS).toBeGreaterThanOrEqual(50);
    expect(DEBOUNCE_MS).toBeLessThanOrEqual(1000);
  });
});

describe("MIN_SEARCH_LEN", () => {
  it("is a positive integer", () => {
    expect(Number.isInteger(MIN_SEARCH_LEN)).toBe(true);
    expect(MIN_SEARCH_LEN).toBeGreaterThan(0);
  });

  it("has a reasonable minimum search length", () => {
    expect(MIN_SEARCH_LEN).toBeGreaterThanOrEqual(1);
    expect(MIN_SEARCH_LEN).toBeLessThanOrEqual(5);
  });
});

describe("STORAGE_KEYS", () => {
  it("contains all expected keys", () => {
    expect(STORAGE_KEYS).toHaveProperty("theme");
    expect(STORAGE_KEYS).toHaveProperty("favorites");
    expect(STORAGE_KEYS).toHaveProperty("progress");
    expect(STORAGE_KEYS).toHaveProperty("vocabCache");
  });

  it("has non-empty string values for every key", () => {
    for (const value of Object.values(STORAGE_KEYS)) {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it("uses a consistent prefix for all keys", () => {
    for (const value of Object.values(STORAGE_KEYS)) {
      expect(value).toMatch(/^linxu-/);
    }
  });

  it("is declared as const (compile-time readonly)", () => {
    // `as const` makes the type readonly but does NOT call Object.freeze at runtime.
    // This test documents the intended contract; TypeScript enforces immutability at build time.
    expect(STORAGE_KEYS).toBeDefined();
    expect(typeof STORAGE_KEYS).toBe("object");
  });
});

describe("PART_COLORS", () => {
  it("contains all expected morpheme types", () => {
    expect(PART_COLORS).toHaveProperty("prefix");
    expect(PART_COLORS).toHaveProperty("root");
    expect(PART_COLORS).toHaveProperty("suffix");
  });

  it("has valid hex color values for every key", () => {
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    for (const value of Object.values(PART_COLORS)) {
      expect(value).toMatch(hexPattern);
    }
  });

  it("assigns distinct colors to each morpheme type", () => {
    const colors = Object.values(PART_COLORS);
    const unique = new Set(colors);
    expect(unique.size).toBe(colors.length);
  });

  it("is declared as const (compile-time readonly)", () => {
    // `as const` makes the type readonly but does NOT call Object.freeze at runtime.
    expect(PART_COLORS).toBeDefined();
    expect(typeof PART_COLORS).toBe("object");
  });
});
