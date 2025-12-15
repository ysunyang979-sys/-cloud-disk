'use client';

import Link from 'next/link';
import { 
  CloudIcon, 
  ShieldCheckIcon, 
  BoltIcon, 
  GlobeAltIcon,
  ArrowRightIcon,
  CloudArrowUpIcon,
  ShareIcon,
  LockClosedIcon,
  ServerStackIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

const features = [
  {
    icon: CloudArrowUpIcon,
    title: '快速上传',
    description: '支持拖拽上传，单文件最大100MB，上传过程显示实时进度',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: ShareIcon,
    title: '安全分享',
    description: '生成有时效性的分享链接，可设置24小时自动过期',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: LockClosedIcon,
    title: '数据加密',
    description: '采用端到端加密技术，确保您的文件安全无忧',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: BoltIcon,
    title: 'CDN加速',
    description: '基于Cloudflare全球边缘网络，任何地方都能快速访问',
    color: 'from-yellow-500 to-orange-500',
  },
];

const techStack = [
  { name: 'Next.js', desc: '现代前端框架' },
  { name: 'Cloudflare Workers', desc: 'Serverless后端' },
  { name: 'Cloudflare R2', desc: '对象存储' },
  { name: 'Cloudflare D1', desc: 'SQLite数据库' },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4">
        {/* Decorative elements */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        
        <div className="relative text-center max-w-4xl mx-auto">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30 animate-pulse">
              <CloudIcon className="w-14 h-14 text-white" />
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="text-gradient">伊苏存储</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/70 mb-4">
            安全 · 快速 · 可靠的云端文件存储平台
          </p>
          
          <p className="text-lg text-white/50 max-w-2xl mx-auto mb-10">
            基于 Cloudflare 全球边缘网络，为您提供高速稳定的文件存储与分享服务。
            免费注册，即刻享有10GB云端空间。
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/register"
              className="btn-primary text-lg px-8 py-4 flex items-center justify-center gap-2"
            >
              免费注册
              <ArrowRightIcon className="w-5 h-5" />
            </Link>
            <Link 
              href="/login"
              className="btn-secondary text-lg px-8 py-4"
            >
              登录账户
            </Link>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 max-w-md mx-auto">
            <div>
              <p className="text-3xl font-bold text-gradient">10GB</p>
              <p className="text-sm text-white/50">免费空间</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gradient">100MB</p>
              <p className="text-sm text-white/50">单文件上限</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gradient">∞</p>
              <p className="text-sm text-white/50">文件类型</p>
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-white/50 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">强大功能</h2>
            <p className="text-lg text-white/60">一站式文件管理解决方案</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="glass-card p-6 group"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-white/60">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">使用流程</h2>
            <p className="text-lg text-white/60">三步开启云端存储之旅</p>
          </div>
          
          <div className="space-y-8">
            {[
              { step: '01', title: '注册账户', desc: '使用邮箱快速注册，立即获得10GB免费存储空间' },
              { step: '02', title: '上传文件', desc: '拖拽或点击上传，支持任意类型文件，实时显示上传进度' },
              { step: '03', title: '分享管理', desc: '一键生成分享链接，24小时有效期，安全可控' },
            ].map((item, index) => (
              <div key={index} className="glass-card p-6 flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl font-bold">{item.step}</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-1">{item.title}</h3>
                  <p className="text-white/60">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">技术架构</h2>
            <p className="text-lg text-white/60">基于 Cloudflare 现代云原生技术栈</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {techStack.map((tech, index) => (
              <div key={index} className="glass-card p-5 text-center">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-3">
                  <ServerStackIcon className="w-6 h-6 text-indigo-400" />
                </div>
                <p className="font-semibold mb-1">{tech.name}</p>
                <p className="text-sm text-white/50">{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="glass-card p-12 text-center relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
            
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">准备好开始了吗？</h2>
              <p className="text-lg text-white/60 mb-8 max-w-xl mx-auto">
                立即注册，免费获得10GB云端存储空间，体验极速文件分享服务
              </p>
              
              <Link 
                href="/register"
                className="btn-primary text-lg px-10 py-4 inline-flex items-center gap-2"
              >
                立即开始
                <ArrowRightIcon className="w-5 h-5" />
              </Link>
              
              <div className="flex flex-wrap justify-center gap-6 mt-10 text-sm text-white/50">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-400" />
                  <span>无需信用卡</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-400" />
                  <span>即刻可用</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5 text-green-400" />
                  <span>永久免费</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <CloudIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-gradient">伊苏存储</p>
                <p className="text-xs text-white/50">358966.xyz</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-white/50">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="w-4 h-4 text-green-400" />
                <span>安全加密</span>
              </div>
              <div className="flex items-center gap-2">
                <BoltIcon className="w-4 h-4 text-yellow-400" />
                <span>CDN加速</span>
              </div>
              <div className="flex items-center gap-2">
                <GlobeAltIcon className="w-4 h-4 text-blue-400" />
                <span>全球可用</span>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-8 pt-8 border-t border-white/5">
            <p className="text-sm text-white/30">
              © {new Date().getFullYear()} 伊苏存储. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
