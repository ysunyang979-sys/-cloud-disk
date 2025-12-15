import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 静态导出用于 Cloudflare Pages
  output: 'export',
  
  // 禁用图片优化（Cloudflare Pages 静态部署不支持）
  images: {
    unoptimized: true,
  },
  
  // 环境变量 - 开发环境使用本地Workers地址
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8787' : 'https://api.358966.xyz'),
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'https://358966.xyz',
  },
  
  // 尾部斜杠设置
  trailingSlash: false,
  
  // 禁用 x-powered-by 头
  poweredByHeader: false,
  
  // 实验性功能
  experimental: {
    // 允许动态路由生成
  },
};

export default nextConfig;
