import { readFileSync } from "fs";
import { join } from "path";
import Link from "next/link";
import { InlineSpeakButton } from "@/components/ui/InlineSpeakButton";
import { ArrowLeft } from "lucide-react";
import type { VocabEntry, RootIndex } from "@/lib/types";

// Load data at build time
function loadData() {
  const dataDir = join(process.cwd(), "public", "data");
  const vocab: VocabEntry[] = JSON.parse(
    readFileSync(join(dataDir, "vocab.json"), "utf-8")
  );
  const rootIndex: RootIndex = JSON.parse(
    readFileSync(join(dataDir, "roots-index.json"), "utf-8")
  );
  return { vocab, rootIndex };
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
  const { vocab, rootIndex } = loadData();
  const entry = vocab.find((v) => v.word === word);

  if (!entry) {
    return (
      <div className="min-h-screen bg-bg-deep flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-text-primary mb-2">
            未找到单词
          </h1>
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
          if (vocab[idx].word !== word) relatedWords.add(vocab[idx].word);
          if (relatedWords.size >= 20) break;
        }
      }
    }
    if (relatedWords.size >= 20) break;
  }

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

      <main className="max-w-3xl mx-auto p-6 lg:p-10">
        {/* Word header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-text-primary mb-2">
                {entry.word}
              </h1>
              <p className="text-lg text-text-secondary">
                {entry.definition}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <InlineSpeakButton word={entry.word} />
            </div>
          </div>
        </div>

        {/* Part decomposition */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
            词素拆解
          </h2>
          <div className="flex flex-wrap gap-2">
            {entry.parts.map((part, i) => (
              <div
                key={i}
                className={`flex flex-col items-center p-3 rounded-lg border min-w-[80px] ${
                  part.type === "prefix"
                    ? "border-prefix/30 bg-prefix/5"
                    : part.type === "root"
                    ? "border-root/30 bg-root/5"
                    : "border-suffix/30 bg-suffix/5"
                }`}
              >
                <span
                  className={`font-mono text-lg font-semibold mb-1 ${
                    part.type === "prefix"
                      ? "text-prefix"
                      : part.type === "root"
                      ? "text-root"
                      : "text-suffix"
                  }`}
                >
                  {part.text}
                </span>
                <span className="text-xs text-text-muted">{part.type}</span>
                <span className="text-xs text-text-secondary mt-1 text-center">
                  {part.meaning}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Etymology story */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
            词源故事
          </h2>
          <p className="text-text-primary leading-relaxed">
            <span className="text-text-secondary">{entry.word}</span>
            {" "}由{" "}
            {entry.parts.map((part, i) => (
              <span key={i}>
                {i > 0 && i < entry.parts.length - 1 && " + "}
                {i === entry.parts.length - 1 && i > 0 && " + "}
                <span
                  className={`font-mono font-medium ${
                    part.type === "prefix"
                      ? "text-prefix"
                      : part.type === "root"
                      ? "text-root"
                      : "text-suffix"
                  }`}
                >
                  {part.text}
                </span>
                ({part.meaning})
              </span>
            ))}{" "}
            组成，字面意思为&ldquo;
            {entry.parts.map((p) => p.meaning).join(" + ")}
            &rdquo;，引申为&ldquo;{entry.definition}&rdquo;。
          </p>
        </section>

        {/* Related words */}
        {relatedWords.size > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
              同根词 ({relatedWords.size})
            </h2>
            <div className="flex flex-wrap gap-2">
              {[...relatedWords].map((w) => (
                <Link
                  key={w}
                  href={`/word/${encodeURIComponent(w)}`}
                  className="px-3 py-1.5 rounded-lg bg-bg-elevated text-sm text-text-secondary hover:text-accent hover:bg-bg-hover transition-colors"
                >
                  {w}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
