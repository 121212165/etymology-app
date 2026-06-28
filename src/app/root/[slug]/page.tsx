import { readFileSync } from "fs";
import { join } from "path";
import Link from "next/link";
import { PartTags } from "@/components/word/PartTags";
import { ArrowLeft } from "lucide-react";
import type { VocabEntry, RootIndex } from "@/lib/types";

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
  const { rootIndex } = loadData();
  return Object.keys(rootIndex).map((slug) => ({ slug }));
}

export default async function RootPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const rootText = decodeURIComponent(slug);
  const { vocab, rootIndex } = loadData();
  const rootEntry = rootIndex[rootText];

  if (!rootEntry) {
    return (
      <div className="min-h-screen bg-bg-deep flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-text-primary mb-2">
            未找到词根
          </h1>
          <p className="text-text-secondary mb-4">{rootText}</p>
          <Link href="/" className="text-accent hover:underline">
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  const words = rootEntry.w.map((idx) => ({ entry: vocab[idx] }));

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

      <main className="max-w-4xl mx-auto p-6 lg:p-10">
        {/* Root header */}
        <div className="mb-8">
          <div className="flex items-baseline gap-3 mb-2">
            <h1 className="text-3xl lg:text-4xl font-bold font-mono text-root">
              {rootText}
            </h1>
            <span className="text-lg text-text-secondary">
              {rootEntry.m}
            </span>
          </div>
          <p className="text-text-muted text-sm">
            共 {words.length} 个包含此词根的单词
          </p>
        </div>

        {/* Word list */}
        <section>
          <div className="grid gap-3">
            {words.map(({ entry }) => (
              <Link
                key={entry.word}
                href={`/word/${encodeURIComponent(entry.word)}`}
                className="block bg-bg-surface border border-border rounded-[10px] p-4 hover:border-root/30 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="text-lg font-semibold text-text-primary group-hover:text-root transition-colors">
                      {entry.word}
                    </span>
                    <p className="text-sm text-text-secondary mt-0.5">
                      {entry.definition}
                    </p>
                  </div>
                  <span className="text-xs text-text-muted shrink-0">
                    {entry.parts.length} 词素
                  </span>
                </div>
                <PartTags parts={entry.parts} />
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
