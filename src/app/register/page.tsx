'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CloudIcon, 
  XCircleIcon,
} from '@heroicons/react/24/outline';

export default function RegisterPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // 倒计时自动跳转
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="floating-orb" style={{
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, transparent 70%)',
          top: '-150px',
          right: '-150px',
        }} />
        <div className="floating-orb" style={{
          width: '450px',
          height: '450px',
          background: 'radial-gradient(circle, rgba(251, 146, 60, 0.15) 0%, transparent 70%)',
          bottom: '-120px',
          left: '-120px',
          animationDelay: '-8s',
        }} />
      </div>

      <div className="glass-card max-w-md w-full p-8 relative text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/30">
            <XCircleIcon className="w-8 h-8 text-white" />
          </div>
        </div>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-red-400 mb-2">注册功能已关闭</h1>
          <p className="text-white/60">此系统仅限邀请用户使用</p>
        </div>

        <div className="mb-8 p-6 rounded-xl bg-red-500/10 border border-red-500/30">
          <p className="text-white/70 mb-4">
            抱歉，当前系统不开放公开注册。
          </p>
          <p className="text-white/50 text-sm">
            如需使用，请联系系统管理员获取邀请。
          </p>
        </div>

        <div className="mb-6">
          <p className="text-white/40 text-sm">
            {countdown} 秒后自动跳转到登录页面...
          </p>
        </div>

        <button
          onClick={() => router.push('/login')}
          className="btn-primary w-full justify-center flex items-center gap-2"
        >
          <CloudIcon className="w-5 h-5" />
          返回登录页面
        </button>
      </div>
    </div>
  );
}
