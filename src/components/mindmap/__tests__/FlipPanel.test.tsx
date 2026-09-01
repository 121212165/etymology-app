// src/components/mindmap/__tests__/FlipPanel.test.tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { FlipPanel } from "../FlipPanel";

// 3D transform 在 jsdom 不真实渲染，断言翻转状态（data-flipped）、类名与 aria-hidden 即可
afterEach(() => {
  cleanup();
});

function renderFlipPanel(flipped: boolean) {
  return render(
    <FlipPanel
      flipped={flipped}
      front={<div>front-content</div>}
      back={<div>back-content</div>}
    />
  );
}

describe("FlipPanel", () => {
  it("初始显示正面，背面隐藏", () => {
    const { container } = renderFlipPanel(false);

    const panel = screen.getByTestId("flip-panel");
    expect(panel).toHaveAttribute("data-flipped", "false");
    // 未翻面：inner 不带翻转类
    expect(panel.querySelector(".mindmap-flip-inner")).not.toHaveClass(
      "mindmap-flip-inner--flipped"
    );

    // 正面可见（aria-hidden="false"），背面 aria-hidden="true" + inert（不可聚焦/点击）
    const frontFace = container.querySelector(".mindmap-flip-face--front");
    const backFace = container.querySelector(".mindmap-flip-face--back");
    expect(frontFace).toHaveAttribute("aria-hidden", "false");
    expect(backFace).toHaveAttribute("aria-hidden", "true");
    expect(backFace).toHaveAttribute("inert");
    expect(screen.getByText("front-content")).toBeInTheDocument();
    expect(screen.getByText("back-content")).toBeInTheDocument();
  });

  it("翻面后显示背面，正面隐藏", () => {
    const { container } = renderFlipPanel(true);

    const panel = screen.getByTestId("flip-panel");
    expect(panel).toHaveAttribute("data-flipped", "true");
    expect(panel.querySelector(".mindmap-flip-inner")).toHaveClass(
      "mindmap-flip-inner--flipped"
    );

    const frontFace = container.querySelector(".mindmap-flip-face--front");
    const backFace = container.querySelector(".mindmap-flip-face--back");
    expect(frontFace).toHaveAttribute("aria-hidden", "true");
    expect(frontFace).toHaveAttribute("inert");
    expect(backFace).toHaveAttribute("aria-hidden", "false");
    expect(backFace).toHaveClass("mindmap-flip-face--back");
  });

  it("从背面翻回正面", () => {
    const { container, rerender } = renderFlipPanel(true);
    expect(screen.getByTestId("flip-panel")).toHaveAttribute("data-flipped", "true");

    rerender(
      <FlipPanel
        flipped={false}
        front={<div>front-content</div>}
        back={<div>back-content</div>}
      />
    );

    const panel = screen.getByTestId("flip-panel");
    expect(panel).toHaveAttribute("data-flipped", "false");
    expect(container.querySelector(".mindmap-flip-face--front")).toHaveAttribute(
      "aria-hidden",
      "false"
    );
    expect(container.querySelector(".mindmap-flip-face--back")).toHaveAttribute(
      "aria-hidden",
      "true"
    );
  });
});
