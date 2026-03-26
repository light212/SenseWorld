"use client";

/**
 * 落地页/首页
 */

import { Mic, Video, Zap, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* 导航栏 */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 backdrop-blur-md bg-slate-900/50 border-b border-white/5">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Mic className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold text-lg">SenseWorld</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              登录
            </Link>
            <Link
              href="/login?register=true"
              className="px-4 py-2 bg-white text-slate-900 rounded-lg font-medium text-sm hover:bg-gray-100 transition-colors"
            >
              开始使用
            </Link>
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* 标题 */}
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            用声音和视频，
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              与 AI 自然对话
            </span>
          </h1>
          
          {/* 副标题 */}
          <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
            开口即聊，拍视频问 AI，实时语音响应
            <br className="hidden md:block" />
            像与真人对话一样自然
          </p>
          
          {/* CTA 按钮 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
            <Link
              href="/login?register=true"
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
            >
              <Mic className="w-5 h-5" />
              开始语音对话
            </Link>
            <Link
              href="/login?register=true"
              className="px-8 py-4 bg-white/10 backdrop-blur text-white rounded-xl font-medium text-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2 border border-white/10"
            >
              <Video className="w-5 h-5" />
              试试视频理解
            </Link>
          </div>

          {/* 特性卡片 */}
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Mic className="w-6 h-6" />}
              title="语音对话"
              description="开口即聊，无需打字。语音识别 + 实时 TTS，像打电话一样自然。"
            />
            <FeatureCard
              icon={<Video className="w-6 h-6" />}
              title="视频理解"
              description="拍视频让 AI 看见世界。多模态理解，视觉 + 语言融合。"
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="实时响应"
              description="流式播放，边生成边听。毫秒级延迟，对话流畅。"
            />
          </div>
        </div>
      </main>

      {/* 底部 */}
      <footer className="py-8 px-6 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-gray-500 text-sm">
          <span>© 2026 SenseWorld</span>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-gray-400 transition-colors">隐私政策</Link>
            <Link href="/terms" className="hover:text-gray-400 transition-colors">服务条款</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-white/5 backdrop-blur border border-white/10 hover:border-white/20 transition-colors text-left">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-blue-400 mb-4">
        {icon}
      </div>
      <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}