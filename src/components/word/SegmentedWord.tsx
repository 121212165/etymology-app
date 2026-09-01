// src/components/word/SegmentedWord.tsx
import type { VocabPart } from "@/lib/types";

/**
 * 词素中心点拆分显示：spec · ial · ize（第二版需求——单词按词素拆开展示，
 * 中间用居中的 · 分隔，各语素沿用前缀/词根/后缀/衔接的既定配色）。
 * 纯展示组件，无 hooks，可安全用于服务端与客户端组件。
 *
 * parts 为空时回退渲染原始单词，避免无拆解数据（parseQuality low）的词显示空白。
 */
export function SegmentedWord({
  parts,
  word,
  dotClassName = "text-text-muted/50",
}: {
  parts: VocabPart[];
  /** parts 为空时的回退文本 */
  word: string;
  /** 分隔点的颜色类，默认弱化灰 */
  dotClassName?: string;
}) {
  const colorClass = (type: VocabPart["type"]) =>
    type === "prefix"
      ? "text-prefix"
      : type === "root"
      ? "text-root"
      : type === "linker"
      ? "text-text-muted"
      : "text-suffix";

  if (parts.length === 0) {
    return <>{word}</>;
  }

  return (
    <>
      {parts.map((part, i) => (
        <span key={i} className="whitespace-nowrap">
          {i > 0 && (
            // 中心点：左右留半字距，视觉居中在两个语素之间
            <span className={`mx-[0.18em] ${dotClassName}`} aria-hidden="true">
              ·
            </span>
          )}
          <span className={colorClass(part.type)}>{part.surface || part.text}</span>
        </span>
      ))}
    </>
  );
}
