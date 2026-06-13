import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSpeak } from "../useSpeak";

// Mock SpeechSynthesisUtterance
const mockUtterance = {
  lang: "",
  rate: 1,
  text: "",
};

beforeEach(() => {
  vi.restoreAllMocks();

  // Reset mock utterance state
  mockUtterance.lang = "";
  mockUtterance.rate = 1;
  mockUtterance.text = "";

  // Stub SpeechSynthesisUtterance constructor
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    vi.fn((text: string) => {
      mockUtterance.text = text;
      return mockUtterance;
    })
  );

  // Stub window.speechSynthesis
  vi.stubGlobal("speechSynthesis", {
    cancel: vi.fn(),
    speak: vi.fn(),
  });
});

describe("useSpeak", () => {
  it("returns a speak function", () => {
    const { result } = renderHook(() => useSpeak());
    expect(typeof result.current).toBe("function");
  });

  it("creates a SpeechSynthesisUtterance with the given word", () => {
    const { result } = renderHook(() => useSpeak());

    act(() => {
      result.current("hello");
    });

    expect(SpeechSynthesisUtterance).toHaveBeenCalledWith("hello");
  });

  it("sets the language to en-US", () => {
    const { result } = renderHook(() => useSpeak());

    act(() => {
      result.current("test");
    });

    expect(mockUtterance.lang).toBe("en-US");
  });

  it("sets the rate to 0.9", () => {
    const { result } = renderHook(() => useSpeak());

    act(() => {
      result.current("test");
    });

    expect(mockUtterance.rate).toBe(0.9);
  });

  it("calls speechSynthesis.speak with the utterance", () => {
    const { result } = renderHook(() => useSpeak());

    act(() => {
      result.current("world");
    });

    expect(window.speechSynthesis.speak).toHaveBeenCalledWith(mockUtterance);
  });

  it("calls speechSynthesis.cancel before speaking", () => {
    const { result } = renderHook(() => useSpeak());

    act(() => {
      result.current("reset");
    });

    expect(window.speechSynthesis.cancel).toHaveBeenCalledBefore(
      window.speechSynthesis.speak as ReturnType<typeof vi.fn>
    );
  });

  it("does not crash when speechSynthesis is not available", () => {
    // Delete speechSynthesis from window so "speechSynthesis" in window is false
    const win = window as Record<string, unknown>;
    delete win.speechSynthesis;

    const { result } = renderHook(() => useSpeak());

    expect(() => {
      act(() => {
        result.current("hello");
      });
    }).not.toThrow();
  });
});
