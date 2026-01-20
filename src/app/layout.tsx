'use client';

import { Inter } from "next/font/google";
import { useState, useEffect, createContext, useContext } from "react";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Theme Context
type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

// Sun Icon
function SunIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={1.5} 
      stroke="currentColor" 
      className={className}
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" 
      />
    </svg>
  );
}

// Moon Icon
function MoonIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={1.5} 
      stroke="currentColor" 
      className={className}
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" 
      />
    </svg>
  );
}

// Theme Toggle Button Component
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button 
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
      title={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
    >
      {theme === 'dark' ? (
        <SunIcon className="w-5 h-5" />
      ) : (
        <MoonIcon className="w-5 h-5" />
      )}
    </button>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  // Update document attribute and localStorage when theme changes
  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Prevent flash of wrong theme
  if (!mounted) {
    return (
      <html lang="zh-CN" data-theme="dark">
        <head>
          <title>SunnyCloud - 安全可靠的云端文件存储与分享平台</title>
          <meta name="description" content="基于Cloudflare的高速文件存储与分享服务，支持大文件上传、加密分享、永久存储。免费、安全、快速。" />
          <meta name="keywords" content="文件存储, 云存储, 文件分享, Cloudflare, R2存储, 大文件上传, 加密分享, SunnyCloud" />
          <link rel="icon" href="/YSCC.png" />
        </head>
        <body className={`${inter.variable} antialiased`}>
          <div className="min-h-screen" />
        </body>
      </html>
    );
  }

  return (
    <html lang="zh-CN" data-theme={theme}>
      <head>
        <title>SunnyCloud - 安全可靠的云端文件存储与分享平台</title>
        <meta name="description" content="基于Cloudflare的高速文件存储与分享服务，支持大文件上传、加密分享、永久存储。免费、安全、快速。" />
        <meta name="keywords" content="文件存储, 云存储, 文件分享, Cloudflare, R2存储, 大文件上传, 加密分享, SunnyCloud" />
        <link rel="icon" href="/YSCC.png" />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
          <div className="animated-bg">
            <div className="floating-orb" style={{
              width: '600px',
              height: '600px',
              background: theme === 'dark' 
                ? 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
              top: '-200px',
              left: '-200px',
            }} />
            <div className="floating-orb" style={{
              width: '400px',
              height: '400px',
              background: theme === 'dark'
                ? 'radial-gradient(circle, rgba(34, 211, 238, 0.25) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%)',
              bottom: '-100px',
              right: '-100px',
              animationDelay: '-5s',
            }} />
            <div className="floating-orb" style={{
              width: '300px',
              height: '300px',
              background: theme === 'dark'
                ? 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
              top: '50%',
              right: '20%',
              animationDelay: '-10s',
            }} />
          </div>
          {children}
        </ThemeContext.Provider>
      </body>
    </html>
  );
}
