import { readFileSync } from "fs";
import { join } from "path";
import Link from "next/link";
import { SpeakButton } from "@/components/word/SpeakButton";
import { ArrowLeft } from "lucide-react";
import type { VocabEntry, RootIndex } from "@/lib/types";

// 模块级缓存：SSG 时 5011 个 word 页面共享一份数据，避免重复 readFileSync + JSON.parse
// 同时用 Map 索引替代 O(n) find，将页面查找从 O(n) 降到 O(1)
let cachedData: {
  vocab: VocabEntry[];
  rootIndex: RootIndex;
  vocabMap: Map<string, VocabEntry>;
} | null = null;

function loadData() {
  if (cachedData) return cachedData;
  const dataDir = join(process.cwd(), "public", "data");
  const vocab: VocabEntry[] = JSON.parse(
    readFileSync(join(dataDir, "vocab.json"), "utf-8")
  );
  const rootIndex: RootIndex = JSON.parse(
    readFileSync(join(dataDir, "roots-index.json"), "utf-8")
  );
  const vocabMap = new Map<string, VocabEntry>();
  for (const entry of vocab) vocabMap.set(entry.word, entry);
  cachedData = { vocab, rootIndex, vocabMap };
  return cachedData;
}

export function generateStaticParams() {
  const { vocab } = loadData();
  return vocab.map((entry) => ({ slug: entry.word }));
}

export default async function WordPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const word = decodeURIComponent(slug);
  const { vocab, rootIndex, vocabMap } = loadData();
  const entry = vocabMap.get(word);

  if (!entry) {
    return (
      <div className="min-h-screen bg-bg-deep flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-text-primary mb-2">未找到单词</h1>
          <p className="text-text-secondary mb-4">{word}</p>
          <Link href="/" className="text-accent hover:underline">
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  // Find related words (same roots)
  const relatedWords = new Set<string>();
  for (const part of entry.parts) {
    if (part.type === "root") {
      const rootEntry = rootIndex[part.text];
      if (rootEntry) {
        for (const idx of rootEntry.w) {
          // 防御：roots-index.json 可能存在 >= vocab.length 的索引，越界访问会抛错
          if (idx >= vocab.length) continue;
          if (vocab[idx].word !== word) relatedWords.add(vocab[idx].word);
          if (relatedWords.size >= 20) break;
        }
      }
    }
    if (relatedWords.size >= 20) break;
  }

  const partTypeLabel = (type: string) =>
    type === "prefix" ? "前缀" : type === "root" ? "词根" : type === "linker" ? "衔接" : "后缀";

  const partColorClass = (type: string) =>
    type === "prefix"
      ? "text-prefix"
      : type === "root"
      ? "text-root"
      : type === "linker"
      ? "text-text-muted"
      : "text-suffix";

  return (
    <div className="min-h-screen bg-bg-deep">
      {/* Header */}
      <header className="sticky top-0 z-50 h-[56px] bg-bg-surface/95 backdrop-blur-sm border-b border-border flex items-center px-4 lg:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">返回</span>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 lg:py-14">
        {/* ── Word header ── */}
        <div className="mb-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl lg:text-5xl text-text-primary mb-2">
                {entry.word}
              </h1>
              <p className="text-lg text-text-secondary leading-relaxed">
                {entry.definition}
              </p>
            </div>
            <SpeakButton word={entry.word} />
          </div>
        </div>

        <hr className="editorial-divider mb-8" />

        {/* ── 词素拆解 timeline ── */}
        <section className="mb-10">
          <p className="editorial-label mb-4">词素拆解</p>
          <div className="morpheme-timeline">
            {entry.parts.map((part, i) => (
              <div key={i} className="contents">
                {i > 0 && <div className="morpheme-plus">+</div>}
                <div className="morpheme-node">
                  <span className={`font-mono text-xl font-semibold mb-1 ${partColorClass(part.type)}`}>
                    {part.surface || part.text}
                  </span>
                  <span className="text-xs text-text-muted uppercase tracking-wider">
                    {partTypeLabel(part.type)}
                  </span>
                  <span className="text-xs text-text-secondary mt-1 text-center">
                    {part.surface
                      ? `引用形态 ${part.text}，${part.meaning}`
                      : part.meaning}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 词源故事 ── */}
        <section className="mb-10">
          <p className="editorial-label mb-4">词源故事</p>
          <p className="text-text-primary leading-loose text-[15px]">
            <span className="text-text-secondary">{entry.word}</span>
            {" 由 "}
            {entry.parts.map((part, i) =>
              part.type === "linker" ? (
                // 衔接字母：中性裸字母，无括号意义
                <span key={i}>
                  {i > 0 && " + "}
                  <span className="font-mono text-text-muted">{part.text}</span>
                </span>
              ) : (
                <span key={i}>
                  {i > 0 && " + "}
                  <span className={`font-mono font-medium ${partColorClass(part.type)}`}>
                    {part.surface || part.text}
                  </span>
                  <span className="text-text-muted">
                    {part.surface
                      ? `（${part.text}，${part.meaning}）`
                      : `（${part.meaning}）`}
                  </span>
                </span>
              )
            )}
            {" 组成，字面意思为「"}
            <span className="text-text-secondary italic">
              {entry.parts
                .filter((p) => p.type !== "linker")
                .map((p) => p.meaning)
                .join(" + ")}
            </span>
            」，引申为「{entry.definition}」。
          </p>
        </section>

        <hr className="editorial-divider mb-8" />

        {/* ── 同根词 ── */}
        {relatedWords.size > 0 && (
          <section>
            <p className="editorial-label mb-4">
              同根词 · {relatedWords.size}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[...relatedWords].map((w) => (
                <Link
                  key={w}
                  href={`/word/${encodeURIComponent(w)}`}
                  className="root-cloud-item"
                >
                  <span className="text-sm font-medium">{w}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
