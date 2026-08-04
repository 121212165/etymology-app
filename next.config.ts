import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 5011 个 word 页面 + 613 个 root 页面 SSG，默认 60s 超时在网络不佳时可能不够
  staticPageGenerationTimeout: 300,
};

export default nextConfig;
