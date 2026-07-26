import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg-deep flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-text-primary mb-2">页面未找到</h1>
        <p className="text-text-secondary mb-4 text-sm">您访问的页面不存在</p>
        <Link href="/" className="text-accent hover:underline text-sm">
          返回首页
        </Link>
      </div>
    </div>
  );
}
