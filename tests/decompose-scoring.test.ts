import { describe, it, expect } from "vitest";
import { isDecomposeCorrect } from "@/lib/decompose-scoring";

describe("isDecomposeCorrect", () => {
  it("完全正确：selectedRoots === correctRoots（顺序无关）→ true", () => {
    expect(isDecomposeCorrect(["port", "able"], ["port", "able"])).toBe(true);
    expect(isDecomposeCorrect(["able", "port"], ["port", "able"])).toBe(true);
  });

  it("部分正确：selectedRoots 包含部分 correctRoots → false", () => {
    expect(isDecomposeCorrect(["port"], ["port", "able"])).toBe(false);
  });

  it("完全错误：selectedRoots 与 correctRoots 无交集 → false", () => {
    expect(isDecomposeCorrect(["auto", "mobile"], ["port", "able"])).toBe(
      false
    );
  });

  it("空答案：selectedRoots=[] → false", () => {
    expect(isDecomposeCorrect([], ["port", "able"])).toBe(false);
  });

  it("超集：selectedRoots 包含 correctRoots + 额外 → false（严格匹配）", () => {
    expect(
      isDecomposeCorrect(["port", "able", "extra"], ["port", "able"])
    ).toBe(false);
  });
});
