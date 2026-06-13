"use client";

interface StatsBarProps {
  learned: number;
  mastered: number;
  dueToday: number;
  coveragePercent: number;
}

export function StatsBar({ learned, mastered, dueToday, coveragePercent }: StatsBarProps) {
  if (learned === 0 && mastered === 0 && dueToday === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-semibold text-text-primary">{learned}</span>
          <span className="text-text-muted">已学</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-semibold text-text-primary">{mastered}</span>
          <span className="text-text-muted">已掌握</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-semibold text-text-primary">{dueToday}</span>
          <span className="text-text-muted">待复习</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-semibold text-accent">{coveragePercent}%</span>
          <span className="text-text-muted">覆盖</span>
        </div>
      </div>
      <div className="mt-1.5 h-1 w-full rounded-full bg-bg-surface overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent/60 to-accent transition-all duration-300"
          style={{ width: `${Math.min(coveragePercent, 100)}%` }}
        />
      </div>
    </div>
  );
}
