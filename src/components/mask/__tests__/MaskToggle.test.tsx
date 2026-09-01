// src/components/mask/__tests__/MaskToggle.test.tsx
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MaskToggle } from "../MaskToggle";
import { useMaskStore } from "@/store/mask-store";

describe("MaskToggle", () => {
  beforeEach(() => {
    useMaskStore.setState({ maskLevel: "off" });
  });

  afterEach(() => {
    useMaskStore.setState({ maskLevel: "off" });
    cleanup();
  });

  it("点击在 关 → 遮释义 → 全遮 间循环", () => {
    render(<MaskToggle />);
    const btn = screen.getByRole("button");
    expect(useMaskStore.getState().maskLevel).toBe("off");
    fireEvent.click(btn);
    expect(useMaskStore.getState().maskLevel).toBe("easy");
    fireEvent.click(btn);
    expect(useMaskStore.getState().maskLevel).toBe("hard");
    fireEvent.click(btn);
    expect(useMaskStore.getState().maskLevel).toBe("off");
  });

  it("展示当前档位文案", () => {
    useMaskStore.setState({ maskLevel: "hard" });
    render(<MaskToggle />);
    expect(screen.getByText("全遮")).toBeInTheDocument();
  });
});
