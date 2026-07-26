export default function Loading() {
  return (
    <div className="min-h-screen bg-bg-deep flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-text-secondary text-sm">加载中...</p>
      </div>
    </div>
  );
}
