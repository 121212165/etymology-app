// src/hooks/__tests__/useReveal.test.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { useReveal } from "../useReveal";

type FakeEntry = { isIntersecting: boolean };

/** 可手动触发的 IntersectionObserver 替身 */
class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: (entries: FakeEntry[], observer: MockIntersectionObserver) => void;
  options: unknown;
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);

  constructor(
    callback: (entries: FakeEntry[], observer: MockIntersectionObserver) => void,
    options?: unknown
  ) {
    this.callback = callback;
    this.options = options;
    MockIntersectionObserver.instances.push(this);
  }

  trigger(isIntersecting: boolean) {
    this.callback([{ isIntersecting }], this);
  }
}

function Probe({ enabled, threshold, rootMargin }: { enabled?: boolean; threshold?: number; rootMargin?: string }) {
  const ref = useReveal<HTMLDivElement>({ enabled, threshold, rootMargin });
  return <div ref={ref} data-testid="probe" />;
}

beforeEach(() => {
  MockIntersectionObserver.instances = [];
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useReveal", () => {
  it("挂载后加 reveal 基类；IO 未触发时不加 reveal--visible", () => {
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    render(<Probe />);

    const el = screen.getByTestId("probe");
    expect(el.classList.contains("reveal")).toBe(true);
    expect(el.classList.contains("reveal--visible")).toBe(false);
    expect(MockIntersectionObserver.instances).toHaveLength(1);
    expect(MockIntersectionObserver.instances[0].observe).toHaveBeenCalledWith(el);
  });

  it("进入视口后加 reveal--visible 且停止观察（一次性）", () => {
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    render(<Probe />);
    const el = screen.getByTestId("probe");
    const io = MockIntersectionObserver.instances[0];

    io.trigger(true);

    expect(el.classList.contains("reveal--visible")).toBe(true);
    expect(io.unobserve).toHaveBeenCalledWith(el);

    // 再触发不重复点亮 / 不重复 unobserve
    io.trigger(true);
    expect(el.classList.contains("reveal--visible")).toBe(true);
    expect(io.unobserve).toHaveBeenCalledTimes(1);
  });

  it("离开视口事件不点亮", () => {
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    render(<Probe />);

    MockIntersectionObserver.instances[0].trigger(false);

    expect(screen.getByTestId("probe").classList.contains("reveal--visible")).toBe(false);
    expect(MockIntersectionObserver.instances[0].unobserve).not.toHaveBeenCalled();
  });

  it("环境无 IntersectionObserver 时直接跳过（内容不加任何类，保持可见）", () => {
    // jsdom 默认没有 IntersectionObserver，且此处不 stub
    render(<Probe />);

    const el = screen.getByTestId("probe");
    expect(el.classList.contains("reveal")).toBe(false);
    expect(el.classList.contains("reveal--visible")).toBe(false);
  });

  it("enabled=false 时不加类、不建观察器", () => {
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    render(<Probe enabled={false} />);

    expect(screen.getByTestId("probe").classList.contains("reveal")).toBe(false);
    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });

  it("内容异步就绪后 enabled 翻真时补挂观察器（首页 loading 门场景）", () => {
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    const { rerender } = render(<Probe enabled={false} />);

    expect(MockIntersectionObserver.instances).toHaveLength(0);

    rerender(<Probe enabled={true} />);

    const el = screen.getByTestId("probe");
    expect(el.classList.contains("reveal")).toBe(true);
    expect(MockIntersectionObserver.instances).toHaveLength(1);
    expect(MockIntersectionObserver.instances[0].observe).toHaveBeenCalledWith(el);
  });

  it("把 threshold/rootMargin 透传给 IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    render(<Probe threshold={0.5} rootMargin="10px" />);

    expect(MockIntersectionObserver.instances[0].options).toEqual({
      threshold: 0.5,
      rootMargin: "10px",
    });
  });
});
