import { describe, it, expectTypeOf } from "vitest";
import type {
  VocabPart,
  VocabEntry,
  RootIndexEntry,
  RootIndex,
  SidebarRoot,
  SidebarGroup,
  SearchIndex,
  ViewMode,
  LearnStatus,
  RootProgress,
  ProgressMap,
  TrainPhase,
  GuessQuestion,
  DecomposeQuestion,
  TrainSession,
} from "@/lib/types";

describe("type exports", () => {
  it("exports all required types", () => {
    expectTypeOf<VocabPart>().toBeObject();
    expectTypeOf<VocabEntry>().toBeObject();
    expectTypeOf<RootIndexEntry>().toBeObject();
    expectTypeOf<RootIndex>().toBeObject();
    expectTypeOf<SidebarRoot>().toBeObject();
    expectTypeOf<SidebarGroup>().toBeObject();
    expectTypeOf<SearchIndex>().toBeObject();
    expectTypeOf<ViewMode>().toBeString();
    expectTypeOf<LearnStatus>().toBeString();
    expectTypeOf<RootProgress>().toBeObject();
    expectTypeOf<ProgressMap>().toBeObject();
    expectTypeOf<TrainPhase>().toBeString();
    expectTypeOf<GuessQuestion>().toBeObject();
    expectTypeOf<DecomposeQuestion>().toBeObject();
    expectTypeOf<TrainSession>().toBeObject();
  });
});

describe("type compatibility", () => {
  it("GuessQuestion.options is string[]", () => {
    expectTypeOf<GuessQuestion["options"]>().toEqualTypeOf<string[]>();
  });

  it("DecomposeQuestion.correctRoots is string[]", () => {
    expectTypeOf<DecomposeQuestion["correctRoots"]>().toEqualTypeOf<string[]>();
  });

  it("TrainPhase is observe|guess|decompose|complete", () => {
    expectTypeOf<TrainPhase>().toEqualTypeOf<
      "observe" | "guess" | "decompose" | "complete"
    >();
  });

  it("VocabEntry.parts is VocabPart[]", () => {
    expectTypeOf<VocabEntry["parts"]>().toEqualTypeOf<VocabPart[]>();
  });
});
