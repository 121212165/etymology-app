import { VocabEntry, RootIndex, GuessQuestion, DecomposeQuestion } from "./types";
import { RootGroupDef } from "./root-groups";

export function getWordsForRoots(
  rootTexts: string[],
  rootIndex: RootIndex,
  vocab: VocabEntry[]
): VocabEntry[] {
  const seen = new Set<number>();
  for (const root of rootTexts) {
    const entry = rootIndex[root];
    if (entry) {
      for (const idx of entry.w) {
        seen.add(idx);
      }
    }
  }
  return Array.from(seen)
    .map((i) => vocab[i])
    .filter(Boolean)
    .sort((a, b) => a.parts.length - b.parts.length);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

export function buildGuessQuestions(
  words: VocabEntry[],
  allGroupWords: VocabEntry[],
  count: number
): GuessQuestion[] {
  const selected = pickRandom(words, count);
  const distractorPool = allGroupWords.filter(
    (w) => !words.some((sw) => sw.word === w.word)
  );

  return selected.map((entry) => {
    const correctIndex = Math.floor(Math.random() * 4);
    const distractors = pickRandom(
      distractorPool.filter((d) => d.definition !== entry.definition),
      3
    );
    const options: string[] = [];
    let dIdx = 0;
    for (let i = 0; i < 4; i++) {
      if (i === correctIndex) {
        options.push(entry.definition);
      } else {
        options.push(distractors[dIdx]?.definition ?? `(${dIdx + 1})`);
        dIdx++;
      }
    }
    const shuffled = shuffle(options);
    const newCorrectIndex = shuffled.indexOf(entry.definition);
    return { entry, options: shuffled, correctIndex: newCorrectIndex };
  });
}

export function buildDecomposeQuestions(
  words: VocabEntry[],
  groupMembers: string[],
  count: number
): DecomposeQuestion[] {
  const selected = pickRandom(words, count);

  return selected.map((entry) => {
    const correctRoots = entry.parts
      .filter((p) => p.type === "root")
      .map((p) => p.text);
    const distractors = groupMembers.filter(
      (m) => !correctRoots.includes(m)
    );
    const distractorCount = Math.max(0, Math.floor(Math.random() * 5) + 8 - correctRoots.length);
    const pickedDistractors = pickRandom(distractors, distractorCount);
    const rootPool = shuffle([...correctRoots, ...pickedDistractors]);
    return { entry, correctRoots, rootPool };
  });
}
