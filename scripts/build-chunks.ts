import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

interface VocabEntry {
  word: string;
  definition: string;
  parts: { type: string; text: string; meaning: string; decomposed: boolean }[];
  source?: string;
}

interface RootIndexEntry {
  m: string;
  w: number[];
}

type RootIndex = Record<string, RootIndexEntry>;

const DATA_DIR = join(__dirname, "..", "public", "data");
const CHUNKS_DIR = join(DATA_DIR, "chunks");

const vocab: VocabEntry[] = JSON.parse(
  readFileSync(join(DATA_DIR, "vocab.json"), "utf-8")
);
const rootIndex: RootIndex = JSON.parse(
  readFileSync(join(DATA_DIR, "roots-index.json"), "utf-8")
);

const rootsByFreq = Object.entries(rootIndex)
  .map(([root, entry]) => ({ root, count: entry.w.length }))
  .sort((a, b) => b.count - a.count);

const TIERS = [
  { name: "hot", start: 0, end: 50 },
  { name: "warm", start: 50, end: 200 },
  { name: "cool", start: 200, end: 500 },
  { name: "cold", start: 500, end: Infinity },
] as const;

type TierName = (typeof TIERS)[number]["name"];

const chunkMap: Record<TierName, number[]> = {
  hot: [],
  warm: [],
  cool: [],
  cold: [],
};

const assigned = new Set<number>();

for (let rank = 0; rank < rootsByFreq.length; rank++) {
  const tier = TIERS.find((t) => rank >= t.start && rank < t.end)!;
  const root = rootsByFreq[rank].root;
  for (const idx of rootIndex[root].w) {
    if (!assigned.has(idx)) {
      assigned.add(idx);
      chunkMap[tier.name].push(idx);
    }
  }
}

for (let i = 0; i < vocab.length; i++) {
  if (!assigned.has(i)) {
    chunkMap.cold.push(i);
    assigned.add(i);
  }
}

mkdirSync(CHUNKS_DIR, { recursive: true });

for (const tier of TIERS) {
  const indices = chunkMap[tier.name];
  const entries = indices.map((i) => vocab[i]);

  writeFileSync(
    join(CHUNKS_DIR, `chunk-${tier.name}.json`),
    JSON.stringify({ indices, entries })
  );

  console.log(
    `chunk-${tier.name}: ${indices.length} words`
  );
}

const manifest: Record<string, { roots: string[]; count: number }> = {};
for (const tier of TIERS) {
  const tierRoots = rootsByFreq
    .slice(tier.start, tier.end === Infinity ? rootsByFreq.length : tier.end)
    .map((r) => r.root);
  manifest[tier.name] = { roots: tierRoots, count: chunkMap[tier.name].length };
}

writeFileSync(join(CHUNKS_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`manifest.json written. Total: ${vocab.length} words`);
