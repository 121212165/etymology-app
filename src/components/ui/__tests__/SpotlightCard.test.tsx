// src/components/ui/__tests__/SpotlightCard.test.tsx
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { SpotlightCard } from "../SpotlightCard";

afterEach(cleanup);

function getCard(container: HTMLElement) {
  // SpotlightCard 的根节点即容器的唯一子元素
  return container.firstElementChild as HTMLElement;
}

describe("SpotlightCard", () => {
  it("渲染子内容并合并外部类名", () => {
    const { container } = render(
      <SpotlightCard className="editorial-card">正文</SpotlightCard>
    );

    expect(getCard(container)).toHaveClass("spotlight-card", "editorial-card");
  });

  it("mousemove 把指针位置写入 --spot-x / --spot-y（jsdom 矩形为 0，即指针坐标）", () => {
    const { container } = render(<SpotlightCard>正文</SpotlightCard>);
    const card = getCard(container);

    fireEvent.mouseMove(card, { clientX: 120, clientY: 80 });

    expect(card.style.getPropertyValue("--spot-x")).toBe("120px");
    expect(card.style.getPropertyValue("--spot-y")).toBe("80px");
  });

  it("以 mouseenter 缓存的卡片矩形计算指针相对位置", () => {
    const { container } = render(<SpotlightCard>正文</SpotlightCard>);
    const card = getCard(container);
    vi.spyOn(card, "getBoundingClientRect").mockReturnValue({
      left: 10,
      top: 20,
      width: 300,
      height: 200,
      right: 310,
      bottom: 220,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    } as DOMRect);

    fireEvent.mouseEnter(card);
    fireEvent.mouseMove(card, { clientX: 110, clientY: 70 });

    expect(card.style.getPropertyValue("--spot-x")).toBe("100px");
    expect(card.style.getPropertyValue("--spot-y")).toBe("50px");
  });

  it("mousemove 用被动监听，且卸载时移除监听", () => {
    const addSpy = vi.spyOn(HTMLElement.prototype, "addEventListener");
    const removeSpy = vi.spyOn(HTMLElement.prototype, "removeEventListener");
    const { unmount } = render(<SpotlightCard>正文</SpotlightCard>);

    expect(addSpy).toHaveBeenCalledWith(
      "mousemove",
      expect.any(Function),
      { passive: true }
    );

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
