"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg-deep flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-text-primary mb-2">出错了</h1>
        <p className="text-text-secondary mb-4 text-sm">{error.message}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent-hover transition-colors"
          >
            重试
          </button>
          <Link
            href="/"
            className="text-accent hover:underline text-sm"
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
