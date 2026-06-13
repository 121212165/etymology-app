"use client";

import { useChallenge } from "@/hooks/useChallenge";
import { PartTags } from "@/components/word/PartTags";
import { TopBar } from "@/components/layout/TopBar";
import { SwordsIcon, RotateCcwIcon, CheckCircle2Icon, XCircleIcon, TrophyIcon, ClockIcon, TargetIcon } from "lucide-react";

export default function ChallengePage() {
  const { phase, question, round, roundSize, results, selectedOption, startRound, answer } =
    useChallenge();

  const totalCorrect = results.filter((r) => r.correct).length;
  const avgTime =
    results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.timeMs, 0) / results.length / 100) / 10
      : 0;

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-bg-deep">
        <TopBar />
        <div className="flex items-center justify-center" style={{ minHeight: "calc(100vh - 56px)" }}>
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-text-secondary text-sm">加载数据中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "idle") {
    return (
      <div className="min-h-screen bg-bg-deep">
        <TopBar />
        <div className="flex items-center justify-center p-4" style={{ minHeight: "calc(100vh - 56px)" }}>
          <div className="bg-bg-surface border border-border rounded-2xl p-8 max-w-md w-full text-center">
            <SwordsIcon size={48} className="mx-auto mb-4 text-accent" />
            <h2 className="text-2xl font-bold text-text-primary mb-2">词根推理挑战</h2>
            <p className="text-text-secondary text-sm mb-6">
              根据词根词缀推断单词的中文意思。<br />
              每轮 {roundSize} 题，干扰项来自同根词。
            </p>
            <button
              onClick={startRound}
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-medium transition-colors"
            >
              <SwordsIcon size={18} />
              开始挑战
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "results") {
    return (
      <div className="min-h-screen bg-bg-deep">
        <TopBar />
        <div className="flex items-center justify-center p-4" style={{ minHeight: "calc(100vh - 56px)" }}>
          <div className="bg-bg-surface border border-border rounded-2xl p-8 max-w-md w-full text-center">
            <TrophyIcon size={48} className="mx-auto mb-4" style={{ color: "var(--prefix-color)" }} />
            <h2 className="text-2xl font-bold text-text-primary mb-2">挑战完成！</h2>
            <div className="flex justify-center gap-8 my-6">
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5 text-text-secondary text-sm">
                  <TargetIcon size={14} />
                  正确率
                </div>
                <span className="text-3xl font-bold text-accent">
                  {totalCorrect}/{roundSize}
                </span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5 text-text-secondary text-sm">
                  <ClockIcon size={14} />
                  平均用时
                </div>
                <span className="text-3xl font-bold text-text-primary">{avgTime}s</span>
              </div>
            </div>
            <div className="space-y-2 mb-6">
              {results.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-left">
                  {r.correct ? (
                    <CheckCircle2Icon size={16} className="shrink-0" style={{ color: "var(--root-color)" }} />
                  ) : (
                    <XCircleIcon size={16} className="shrink-0" style={{ color: "#E85454" }} />
                  )}
                  <span className="font-mono text-text-primary">{r.word}</span>
                  <span className="text-text-muted">—</span>
                  <span className="text-text-secondary truncate">{r.definition}</span>
                </div>
              ))}
            </div>
            <button
              onClick={startRound}
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-medium transition-colors"
            >
              <RotateCcwIcon size={18} />
              再来一轮
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-deep">
      <TopBar />
      <div className="flex items-center justify-center p-4" style={{ minHeight: "calc(100vh - 56px)" }}>
        <div className="bg-bg-surface border border-border rounded-2xl p-6 md:p-8 max-w-lg w-full">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-text-secondary text-sm">
              <SwordsIcon size={16} />
              第 {round + 1}/{roundSize} 题
            </div>
            <div className="flex gap-1">
              {Array.from({ length: roundSize }, (_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{
                    background:
                      i < results.length
                        ? results[i].correct
                          ? "var(--root-color)"
                          : "#E85454"
                        : "var(--bg-elevated)",
                  }}
                />
              ))}
            </div>
          </div>

          <p className="text-text-secondary text-sm mb-4">根据词根词缀推断这个词的意思：</p>

          {question && (
            <div className="mb-8">
              <PartTags parts={question.entry.parts} />
            </div>
          )}

          <div className="space-y-3">
            {question?.options.map((opt, i) => {
              const isSelected = selectedOption === i;
              const isCorrect = i === question.correctIndex;
              const showResult = phase === "feedback";

              let borderColor = "var(--border)";
              let bg = "var(--bg-elevated)";
              if (showResult && isSelected && isCorrect) {
                borderColor = "var(--root-color)";
                bg = "color-mix(in srgb, var(--root-color) 12%, transparent)";
              } else if (showResult && isSelected && !isCorrect) {
                borderColor = "#E85454";
                bg = "color-mix(in srgb, #E85454 12%, transparent)";
              } else if (showResult && isCorrect) {
                borderColor = "var(--root-color)";
                bg = "color-mix(in srgb, var(--root-color) 8%, transparent)";
              }

              return (
                <button
                  key={i}
                  onClick={() => answer(i)}
                  disabled={phase === "feedback"}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all"
                  style={{
                    border: `1.5px solid ${borderColor}`,
                    background: bg,
                    color: "var(--text-primary)",
                    cursor: phase === "feedback" ? "default" : "pointer",
                  }}
                >
                  <span className="font-mono text-text-muted mr-2">{String.fromCharCode(65 + i)}.</span>
                  {opt}
                  {showResult && isSelected && isCorrect && (
                    <CheckCircle2Icon size={16} className="inline ml-2" style={{ color: "var(--root-color)" }} />
                  )}
                  {showResult && isSelected && !isCorrect && (
                    <XCircleIcon size={16} className="inline ml-2" style={{ color: "#E85454" }} />
                  )}
                </button>
              );
            })}
          </div>

          {phase === "feedback" && question && (
            <div className="mt-6 p-4 rounded-xl" style={{ background: "var(--bg-elevated)" }}>
              {selectedOption === question.correctIndex ? (
                <div>
                  <p className="font-medium mb-1" style={{ color: "var(--root-color)" }}>
                    ✓ 正确！
                  </p>
                  <p className="text-text-secondary text-sm">
                    你用词根推理了一个你从没见过的词！
                  </p>
                  <p className="text-text-primary font-mono mt-2">{question.entry.word}</p>
                </div>
              ) : (
                <div>
                  <p className="font-medium mb-1" style={{ color: "#E85454" }}>
                    ✗ 答错了
                  </p>
                  <p className="text-text-primary font-mono">
                    {question.entry.word} — {question.entry.definition}
                  </p>
                  <div className="mt-2">
                    <PartTags parts={question.entry.parts} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
