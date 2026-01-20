import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SunnyCloud - 安全可靠的云端文件存储与分享平台",
  description: "基于Cloudflare的高速文件存储与分享服务，支持大文件上传、加密分享、永久存储。免费、安全、快速。",
  keywords: "文件存储, 云存储, 文件分享, Cloudflare, R2存储, 大文件上传, 加密分享, SunnyCloud",
  authors: [{ name: "SunnyCloud" }],
  icons: {
    icon: '/YSCC.png',
    shortcut: '/YSCC.png',
    apple: '/YSCC.png',
  },
  openGraph: {
    title: "SunnyCloud - 云端文件存储与分享",
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
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
