# Reconstruction Plan: etymology-app

> First-principles: Users want to look up word origins. Everything that doesn't serve that single act is waste.

---

## Audit Summary

| Category | Current | After | Delta |
|----------|---------|-------|-------|
| Source files (src/) | 47 | 20 | -27 |
| Test files (tests/ + src/__tests__/) | 22 | 2 | -20 |
| Config/build files | 10 | 8 | -2 |
| Data files (public/data/) | 9 | 2 | -7 |
| Other (docs, SVGs) | 6 | 2 | -4 |
| **Total** | **94** | **34** | **-60** |
| Estimated source LOC | ~3200 | ~1100 | -2100 |

---

## Phase 0: DELETE — Cut Everything That Doesn't Serve Lookup

### Pages & Routes (DELETE 4 files)

| File | Why Delete |
|------|-----------|
| `src/app/train/[groupId]/page.tsx` | Training system. Not a lookup tool. |
| `src/app/challenge/page.tsx` | Quiz gamification. Not a lookup tool. |
| `src/app/speed/page.tsx` | Speed browse mode. Not a lookup tool. |
| `src/app/actions/decompose.ts` | Server action for word decomposition analysis. Overengineered for lookup. Client-side `quickDecompose` in search-engine.ts suffices. |

### Components (DELETE 14 files)

| File | Why Delete |
|------|-----------|
| `src/components/train/RootGroupPicker.tsx` | Train mode group picker. Only used on homepage as train entry. |
| `src/components/train/ObservePhase.tsx` | Train observe phase. |
| `src/components/train/GuessPhase.tsx` | Train guess phase. |
| `src/components/train/DecomposePhase.tsx` | Train decompose phase. |
| `src/components/train/TrainComplete.tsx` | Train completion screen. |
| `src/components/train/PhaseProgress.tsx` | Train phase progress bar. |
| `src/components/train/RootNetwork.tsx` | Root word network explorer (used inside ObservePhase). |
| `src/components/train/WordNodeCard.tsx` | Word card in root network (used inside RootNetwork). |
| `src/components/word/SpeedCard.tsx` | Compact card for speed browse mode. |
| `src/components/search/DecomposePanel.tsx` | Animated decomposition overlay. Overengineered. |
| `src/components/stats/StatsBar.tsx` | Learning stats display. SRS feature. |
| `src/components/epiphany/EpiphanyIntro.tsx` | Animated intro splash. Not a lookup feature. |
| `src/components/epiphany/EpiphanyIntro.css` | CSS for intro splash. |
| `src/components/ui/SpeakButton.tsx` | Standalone speak button. `useSpeak` hook + inline button in WordCard suffices. |

### Hooks (DELETE 5 files)

| File | Why Delete |
|------|-----------|
| `src/hooks/useTrainSession.ts` | Train session state machine. |
| `src/hooks/useProgress.ts` | SRS progress tracking. |
| `src/hooks/useChallenge.ts` | Challenge mode state machine. |
| `src/hooks/useAnalytics.ts` | Analytics tracking wrapper. |
| `src/hooks/useFavorites.ts` | Favorites via localStorage. P1 feature, cut for MVP. |

### Lib (DELETE 4 files)

| File | Why Delete |
|------|-----------|
| `src/lib/srs.ts` | Spaced repetition algorithm (SM-2). Overengineered. |
| `src/lib/analytics.ts` | Event tracking + metrics. Not a lookup feature. |
| `src/lib/root-network.ts` | Word network graph + question generators. Train system only. |
| `src/lib/decompose-scoring.ts` | 9-line scoring function. Train system only. |

### Store (DELETE 1 file, MODIFY 1 file)

| File | Action | Why |
|------|--------|-----|
| `src/store/learn-store.ts` | DELETE | Zustand store for SRS progress. Entire SRS feature cut. |
| `src/store/app-store.ts` | MODIFY | Remove viewMode, favorites. Keep search state only. |

### Test Files (DELETE 20 files)

| File | Why Delete |
|------|-----------|
| `tests/assembler.test.tsx` | Tests deleted feature |
| `tests/coverage.test.ts` | Tests deleted feature |
| `tests/decompose-phase.test.tsx` | Tests deleted train phase |
| `tests/decompose-scoring.test.ts` | Tests deleted scoring |
| `tests/edge-case.test.ts` | Tests deleted feature |
| `tests/edge-case.test.tsx` | Tests deleted feature |
| `tests/existence.test.ts` | Tests deleted feature |
| `tests/export.test.tsx` | Tests deleted feature |
| `tests/keyboard.test.tsx` | Tests deleted train keyboard nav |
| `tests/meaning-guess.test.tsx` | Tests deleted guess phase |
| `tests/mobile.test.tsx` | Tests deleted feature |
| `tests/observer.test.tsx` | Tests deleted observe phase |
| `tests/perf.test.ts` | Tests deleted feature |
| `tests/question-gen.test.ts` | Tests deleted question generator |
| `tests/root-network-data.test.ts` | Tests deleted root network |
| `tests/srs.test.ts` | Tests deleted SRS |
| `tests/train-session.test.ts` | Tests deleted train session |
| `tests/type-safe.test.ts` | Tests deleted feature |
| `tests/data-loader.test.ts` | Tests deleted chunk loader |
| `tests/network/RootNetwork.test.tsx` | Tests deleted root network |

**Keep:**
| File | Why Keep |
|------|----------|
| `tests/search-engine.test.ts` | Core search logic. Trim to search-only tests. |
| `tests/setup.ts` | Test environment setup. |

### Source Test Files (DELETE 13 files)

| File | Why Delete |
|------|-----------|
| `src/lib/__tests__/vocab-quality.test.ts` | Data quality checks for training. |
| `src/lib/__tests__/vocab-quality.mjs` | Standalone data quality script. |
| `src/lib/__tests__/types.test.ts` | Type validation (train types removed). |
| `src/lib/__tests__/root-groups.test.ts` | Root groups data (root-groups.ts deleted). |
| `src/lib/__tests__/constants.test.ts` | Constants test (constants simplified). |
| `src/store/__tests__/app-store.test.ts` | Store tests (store simplified). |
| `src/hooks/__tests__/useSpeak.test.ts` | Speak hook test. |
| `src/hooks/__tests__/useSearch.test.ts` | Search hook test (hook simplified). |
| `src/hooks/__tests__/useFavorites.test.ts` | Favorites test (favorites cut). |
| `src/components/word/__tests__/CardGrid.test.tsx` | CardGrid test. |
| `src/components/search/__tests__/FilterChips.test.tsx` | FilterChips test (component cut). |
| `src/components/ui/__tests__/Pagination.test.tsx` | Pagination test (component cut). |
| `src/components/layout/__tests__/TopBar.test.tsx` | TopBar test (TopBar simplified). |
| `src/components/layout/__tests__/Sidebar.test.tsx` | Sidebar test (Sidebar cut). |

### Data Files (DELETE 7 files)

| File | Why Delete |
|------|-----------|
| `public/data/chunks/` (5 files) | Chunked loading system. Load vocab.json directly. |
| `public/data/sidebar.json` | Pre-built sidebar data. Sidebar cut. |
| `public/data/word-sorted.json` | Pre-sorted word index. Build in memory. |

### Build Scripts (DELETE 1 file)

| File | Why Delete |
|------|-----------|
| `scripts/build-chunks.ts` | Chunk builder. No chunks needed. |

### Config Files (DELETE 1 file)

| File | Why Delete |
|------|-----------|
| `vercel.json` | Only sets `framework: nextjs` and `buildCommand`. Vercel auto-detects Next.js. Redundant. |

### Other Files (DELETE 4 files)

| File | Why Delete |
|------|-----------|
| `README.md` | Default create-next-app boilerplate. Replace with project-specific README. |
| `DEV-SUMMARY.md` | Development history log. Not needed for the app. |
| `public/file.svg` | Default Next.js placeholder SVG. |
| `public/window.svg` | Default Next.js placeholder SVG. |
| `public/globe.svg` | Default Next.js placeholder SVG. |
| `public/vercel.svg` | Default Next.js placeholder SVG. |

**Keep:** `public/next.svg` (used by default Next.js error pages if any).

---

## Phase 1: MODIFY — Simplify Existing Files

### 1.1 `src/lib/types.ts` — Strip to essentials

**Remove:** `SidebarRoot`, `SidebarGroup`, `ViewMode`, `LearnStatus`, `RootProgress`, `ProgressMap`, `TrainPhase`, `GuessQuestion`, `DecomposeQuestion`, `TrainSession`

**Keep:** `VocabPart`, `VocabEntry`, `RootIndexEntry`, `RootIndex`, `SearchIndex`

**Simplify `SearchIndex`:** Remove `wordSorted` (no binary search needed for 5K items). Keep `data`, `rootIndex`, `prefixIndex`, `suffixIndex`.

**Simplify `VocabPart`:** Remove `decomposed` field (only used by build-chunks).

Final types.ts (~30 lines):
```ts
export interface VocabPart {
  type: "prefix" | "root" | "suffix";
  text: string;
  meaning: string;
}

export interface VocabEntry {
  word: string;
  definition: string;
  parts: VocabPart[];
}

export interface RootIndexEntry {
  m: string;
  w: number[];
}

export type RootIndex = Record<string, RootIndexEntry>;

export interface SearchIndex {
  data: VocabEntry[];
  rootIndex: RootIndex;
  prefixIndex: Record<string, string>;
  suffixIndex: Record<string, string>;
}
```

### 1.2 `src/lib/data-loader.ts` — Replace chunk system with direct load

**Remove:** All chunk loading logic (manifest, ChunkLevel, loadChunkFile, ensureChunksForRoots, getRootChunkLevel, getLoadedChunkLevels, getLoadedIndices, isIndexLoaded).

**Replace with:** Load `vocab.json` + `roots-index.json` directly. Build SearchIndex in memory. ~50 lines.

```ts
// Conceptual new implementation:
export async function loadSearchIndex(): Promise<SearchIndex> {
  if (cachedIndex) return cachedIndex;
  const [vocab, rootIndex] = await Promise.all([
    fetchJSON<VocabEntry[]>("/data/vocab.json"),
    fetchJSON<RootIndex>("/data/roots-index.json"),
  ]);
  const [prefixIndex, suffixIndex] = buildPrefixSuffixIndices(vocab);
  cachedIndex = { data: vocab, rootIndex, prefixIndex, suffixIndex };
  return cachedIndex;
}
```

### 1.3 `src/lib/search-engine.ts` — Simplify search

**Remove:** `lowerBound`, `buildWordSorted`, `buildSidebarGroups`, `buildSidebarData`, `buildRootIndex` (all unused or train/sidebar-specific).

**Simplify `executeSearch`:** Replace binary search with linear filter on `data[].word`. For 5K items, `startsWith` on a filtered array is sub-millisecond.

**Keep:** `executeSearch` (simplified), `quickDecompose` (used by SearchInput).

Final search-engine.ts (~60 lines):
```ts
export function executeSearch(index: SearchIndex, query: string, activeRoot: string | null): number[] {
  if (activeRoot) {
    return index.rootIndex[activeRoot]?.w.filter(i => i < index.data.length) ?? [];
  }
  const q = query.trim().toLowerCase();
  if (!q) return index.data.map((_, i) => i);
  const results: number[] = [];
  for (let i = 0; i < index.data.length; i++) {
    if (index.data[i].word.toLowerCase().startsWith(q)) results.push(i);
  }
  // Also search roots
  for (const rootText in index.rootIndex) {
    if (rootText.includes(q)) {
      for (const idx of index.rootIndex[rootText].w) {
        if (!results.includes(idx)) results.push(idx);
      }
    }
  }
  return results;
}
```

### 1.4 `src/lib/constants.ts` — Trim

**Remove:** `PAGE_SIZE`, `MIN_SEARCH_LEN`, `STORAGE_KEYS` (unused after cuts). `PART_COLORS` stays (used by SearchInput and WordCard).

Final constants.ts (~6 lines):
```ts
export const DEBOUNCE_MS = 200;
export const PART_COLORS = {
  prefix: "#E8A84C",
  root: "#5BB89A",
  suffix: "#9B8EC4",
} as const;
```

### 1.5 `src/store/app-store.ts` — Simplify state

**Remove:** `viewMode`, `currentPage`, `setCurrentPage`, `setViewMode`. Keep `searchIndex`, `query`, `activeRoot`, `filteredIndices`.

Final app-store.ts (~40 lines).

### 1.6 `src/app/page.tsx` — Rewrite homepage

**Remove:** RootGroupPicker, train/challenge/speed links, FilterChips.

**Keep:** TopBar, search results → CardGrid with pagination (simple "Load More" button).

**New layout:**
- TopBar with search
- When no query: show root cloud (top 20 roots by frequency as clickable chips)
- When query: show CardGrid of matching words
- Simple "Load More" at bottom (show 50 at a time, click to show more)

Final page.tsx (~70 lines).

### 1.7 `src/app/layout.tsx` — Minor cleanup

**Remove:** `next-themes` ThemeProvider (dark mode only for MVP — the design system has dark as default). Remove Noto_Sans_SC font (not needed for an English etymology tool). Keep Inter + JetBrains Mono.

### 1.8 `src/components/layout/TopBar.tsx` — Simplify

**Remove:** Challenge/Speed nav links.

**Keep:** Logo, SearchInput, ThemeToggle (if theme toggle kept) or remove ThemeToggle too.

Final TopBar.tsx (~25 lines).

### 1.9 `src/components/word/WordCard.tsx` — Simplify

**Remove:** `learnStatus` prop and badge, `onToggleFavorite` and star button.

**Keep:** Word link, definition, PartTags, speak button (inline, not SpeakButton component).

Final WordCard.tsx (~50 lines).

### 1.10 `src/components/word/CardGrid.tsx` — Simplify

**Remove:** `favorites`, `onToggleFavorite` props.

**Keep:** `entries`, `onSpeak`, `emptyMessage`, `emptyHint`.

Final CardGrid.tsx (~30 lines).

### 1.11 `src/app/word/[slug]/page.tsx` — Minor cleanup

**Keep as-is.** This is the best file in the codebase. SSG, clean decomposition display, related words. Maybe remove `source` from the entry destructuring since we're dropping that field.

### 1.12 `src/app/root/[slug]/page.tsx` — Minor cleanup

**Keep as-is.** Clean root detail page with word list.

### 1.13 `src/components/search/SearchInput.tsx` — Minor cleanup

**Keep as-is.** The quickDecompose hint on typing is lightweight and useful.

### 1.14 `src/app/globals.css` — Trim

**Remove:** Flashcard 3D flip styles, skeleton loading, root-item styles (sidebar cut), status-dot styles.

**Keep:** Design system variables, base styles, scrollbar, part-tag styles, reduced motion.

Final globals.css (~130 lines).

### 1.15 `vitest.config.ts` — Update setup path

Point to `tests/setup.ts` (already correct). No change needed.

### 1.16 `tests/search-engine.test.ts` — Trim

**Remove:** Tests for `buildWordSorted`, `buildSidebarGroups`, `buildSidebarData`, `buildRootIndex`, `lowerBound`.

**Keep:** Tests for `executeSearch`, `quickDecompose`.

### 1.17 `package.json` — Remove unused dependencies

**Remove:** `next-themes` (if dark-only), `lucide-react` icons that are now unused (Swords, Zap, etc. — but keep the package, just tree-shake).

Actually, keep all dependencies — tree-shaking handles unused icons, and `next-themes` is small. Just remove the `build:chunks` script.

**Change:**
```json
"build": "next build"
```

---

## Phase 2: CREATE — Fill Gaps

### 2.1 `src/components/search/RootCloud.tsx` (NEW, ~35 lines)

A simple grid of the top ~30 root chips, sorted by word count. Clicking a root sets `activeRoot` in the store. This replaces the RootGroupPicker as the homepage's "browse by root" feature.

```tsx
// Conceptual:
export function RootCloud({ rootIndex }: { rootIndex: RootIndex }) {
  const { activeRoot, setActiveRoot } = useAppStore();
  const topRoots = Object.entries(rootIndex)
    .map(([t, v]) => ({ t, m: v.m, c: v.w.length }))
    .sort((a, b) => b.c - a.c)
    .slice(0, 30);

  return (
    <div className="flex flex-wrap gap-2">
      {topRoots.map(r => (
        <button key={r.t} onClick={() => setActiveRoot(activeRoot === r.t ? null : r.t)}
          className={activeRoot === r.t ? "active-chip" : "chip"}>
          <span className="font-mono">{r.t}</span>
          <span className="text-muted">{r.c}</span>
        </button>
      ))}
    </div>
  );
}
```

### 2.2 `README.md` (NEW, ~20 lines)

Project-specific README: what it is, how to run, data format.

---

## Phase 3: VERIFY

1. `npm run build` — ensure Next.js builds cleanly
2. `npm run test` — ensure remaining tests pass
3. `npm run lint` — ensure no lint errors
4. Manual: search for a word, click through to word detail, click a root, browse root detail page

---

## Execution Order

```
Step 1: DELETE — all files listed in Phase 0
Step 2: MODIFY — types.ts first (other files depend on it)
Step 3: MODIFY — data-loader.ts (new load strategy)
Step 4: MODIFY — search-engine.ts (simplified search)
Step 5: MODIFY — constants.ts, app-store.ts
Step 6: MODIFY — components (TopBar, WordCard, CardGrid)
Step 7: MODIFY — pages (page.tsx, layout.tsx)
Step 8: MODIFY — globals.css
Step 9: CREATE — RootCloud.tsx
Step 10: MODIFY — package.json (remove build:chunks)
Step 11: MODIFY — tests/search-engine.test.ts
Step 12: VERIFY — build, test, lint
```

---

## Final File Inventory (34 files)

### Root Config (8)
- `package.json`
- `tsconfig.json`
- `next.config.ts`
- `postcss.config.mjs`
- `eslint.config.mjs`
- `vitest.config.ts`
- `CLAUDE.md`
- `AGENTS.md`

### Source — App (5)
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/globals.css`
- `src/app/word/[slug]/page.tsx`
- `src/app/root/[slug]/page.tsx`

### Source — Components (6)
- `src/components/layout/TopBar.tsx`
- `src/components/word/WordCard.tsx`
- `src/components/word/CardGrid.tsx`
- `src/components/word/PartTags.tsx`
- `src/components/search/SearchInput.tsx`
- `src/components/search/RootCloud.tsx` ← NEW

### Source — Lib (4)
- `src/lib/types.ts`
- `src/lib/data-loader.ts`
- `src/lib/search-engine.ts`
- `src/lib/constants.ts`

### Source — Store (1)
- `src/store/app-store.ts`

### Source — Hooks (2)
- `src/hooks/useSearch.ts`
- `src/hooks/useSpeak.ts`

### Data (2)
- `public/data/vocab.json`
- `public/data/roots-index.json`

### Tests (2)
- `tests/search-engine.test.ts`
- `tests/setup.ts`

### Docs (2)
- `README.md`
- `RECONSTRUCTION-PLAN.md`

### Static (1)
- `public/next.svg`
- `src/app/favicon.ico`

**Total: ~34 files, ~1100 lines of source code**

---

## Dependency Changes

### Remove from package.json
- `next-themes` — dark-only MVP (optional, could keep)

### Keep
- `next`, `react`, `react-dom` — framework
- `zustand` — state management (lightweight)
- `lucide-react` — icons (tree-shakes unused)
- `tailwindcss`, `@tailwindcss/postcss` — styling
- `typescript`, `tsx` — tooling
- `vitest`, `jsdom`, `@testing-library/*` — testing
- `eslint`, `eslint-config-next` — linting

---

## What Survives (Musk's Razor Test)

| Feature | One-sentence justification | Ships? |
|---------|---------------------------|--------|
| Word search | User types word, sees etymology. Core value. | ✅ |
| Etymology display (parts breakdown) | Shows prefix/root/suffix decomposition. Core value. | ✅ |
| Related words (same root) | Shows linguistic connections. P0 from first-principles doc. | ✅ |
| Root browsing | Click a root to see all its words. Discovery mechanism. | ✅ |
| Quick decompose hint | Type a morpheme, see its meaning inline. Zero-cost UX. | ✅ |
| Dark/light theme | ThemeToggle exists. Low cost to keep. | ✅ |
| Text-to-speech | 17 lines. Helps pronunciation. Near-zero cost. | ✅ |
| Train mode | Quiz system. Not a lookup tool. | ❌ |
| Challenge mode | Gamification. Not a lookup tool. | ❌ |
| Speed browse | Scrolling grid. Not a lookup tool. | ❌ |
| SRS (spaced repetition) | Learning system. Not a lookup tool. | ❌ |
| Analytics | Event tracking. Not a lookup tool. | ❌ |
| Favorites | Bookmarking. P1, not MVP. | ❌ |
| Epiphany intro | Animated splash. Not a lookup tool. | ❌ |
| Chunked data loading | Optimization for a problem that doesn't exist at 5K items. | ❌ |
| Pagination | Only needed if showing all results. "Load More" is simpler. | ❌ |
| Sidebar navigation | Redundant with root chips + search. | ❌ |
