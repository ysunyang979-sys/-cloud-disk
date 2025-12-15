import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "伊苏存储 - 安全可靠的云端文件存储与分享平台",
  description: "基于Cloudflare的高速文件存储与分享服务，支持大文件上传、加密分享、永久存储。免费、安全、快速。",
  keywords: "文件存储, 云存储, 文件分享, Cloudflare, R2存储, 大文件上传, 加密分享",
  authors: [{ name: "伊苏存储" }],
  icons: {
    icon: '/YSCC.png',
    shortcut: '/YSCC.png',
    apple: '/YSCC.png',
  },
  openGraph: {
    title: "伊苏存储 - 云端文件存储与分享",
    description: "基于Cloudflare的高速文件存储与分享服务",
    type: "website",
    locale: "zh_CN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.variable} antialiased`}>
        <div className="animated-bg">
          <div className="floating-orb" style={{
            width: '600px',
            height: '600px',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)',
            top: '-200px',
            left: '-200px',
          }} />
          <div className="floating-orb" style={{
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(34, 211, 238, 0.25) 0%, transparent 70%)',
            bottom: '-100px',
            right: '-100px',
            animationDelay: '-5s',
          }} />
          <div className="floating-orb" style={{
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)',
            top: '50%',
            right: '20%',
            animationDelay: '-10s',
          }} />
        </div>
        {children}
      </body>
    </html>
  );
}
