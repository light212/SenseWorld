# SenseWorld 完整 UX 设计方案

**项目**: SenseWorld
**日期**: 2026-03-26
**版本**: v3（完整用户旅程设计）

---

## 零、设计理念

### 0.1 产品定位

| 维度 | 定义 |
|------|------|
| **核心价值** | 语音+视频多模态 AI 对话 |
| **目标用户** | 企业客户 + 个人用户 |
| **差异化** | 开口即聊、拍视频问 AI、流式实时响应 |

### 0.2 品牌感知

**关键词**：现代 · 专业 · 科技感 · 自然

**视觉风格**：
- 深色/渐变背景（科技感）
- 流动的动效（语音波形、AI 思考）
- 简洁的卡片（专业感）
- 温暖的强调色（亲和力）

### 0.3 用户旅程

```
触达 → 了解产品 → 注册/登录 → 首次使用 → 核心操作 → 留存
 │        │           │           │           │         │
首页    落地页     登录/注册    引导流程    聊天交互   空状态
```

---

## 一、首页/落地页设计

### 1.1 当前问题

用户打开网站看到：
```
┌──────────────────────────────────────┐
│                                      │
│         SenseWorld                   │
│         加载中...                    │
│                                      │
└──────────────────────────────────────┘
```

**问题**：
- 用户不知道产品是什么
- 没有价值传递
- 没有品牌感

### 1.2 新设计：品牌落地页

**桌面端**：

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                      导航栏                             │  │
│  │  🎤 SenseWorld                    [登录] [开始使用]    │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                                                         │  │
│  │           用声音和视频，与 AI 自然对话                  │  │
│  │                                                         │  │
│  │         开口即聊，拍视频问 AI，实时语音响应             │  │
│  │                                                         │  │
│  │              [ 🎤 开始语音对话 ]                       │  │
│  │              [ 📹 试试视频理解 ]                       │  │
│  │                                                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                      产品特性                          │  │
│  │                                                         │  │
│  │   🎤 语音对话        📹 视频理解        ⚡ 实时响应    │  │
│  │   开口即聊          拍视频问 AI        边生成边听      │  │
│  │   无需打字          多模态理解         流式播放        │  │
│  │                                                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                      底部                              │  │
│  │            © 2026 SenseWorld · 隐私政策 · 服务条款     │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**视觉风格**：
- 背景：深蓝渐变 `from-slate-900 via-slate-800 to-slate-900`
- 标题：白色，大字号，渐变效果
- 按钮：主按钮发光效果，次按钮半透明
- 动效：背景有微弱的光点流动

### 1.3 移动端

```
┌──────────────────────────┐
│  🎤 SenseWorld           │
├──────────────────────────┤
│                          │
│   用声音和视频，         │
│   与 AI 自然对话         │
│                          │
│   开口即聊               │
│   拍视频问 AI            │
│                          │
│   ┌──────────────────┐   │
│   │ 🎤 开始语音对话  │   │
│   └──────────────────┘   │
│                          │
│   ┌──────────────────┐   │
│   │ 📹 试试视频理解  │   │
│   └──────────────────┘   │
│                          │
│   ─────── 特性 ───────   │
│                          │
│   🎤 语音对话            │
│   开口即聊，无需打字     │
│                          │
│   📹 视频理解            │
│   拍视频让 AI 理解画面   │
│                          │
│   ⚡ 实时响应            │
│   边生成边听             │
│                          │
├──────────────────────────┤
│  已有账号？[登录]        │
└──────────────────────────┘
```

### 1.4 代码实现

```tsx
// app/page.tsx - 落地页
"use client";

import { Mic, Video, Zap, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* 导航栏 */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 backdrop-blur-md bg-slate-900/50">
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
              className="text-gray-400 hover:text-white transition-colors"
            >
              登录
            </Link>
            <Link
              href="/login?register=true"
              className="px-4 py-2 bg-white text-slate-900 rounded-lg font-medium hover:bg-gray-100 transition-colors"
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
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
            开口即聊，拍视频问 AI，实时语音响应
            <br />
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
              className="px-8 py-4 bg-white/10 backdrop-blur text-white rounded-xl font-medium text-lg hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
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
            <Link href="/privacy" className="hover:text-gray-400">隐私政策</Link>
            <Link href="/terms" className="hover:text-gray-400">服务条款</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-white/5 backdrop-blur border border-white/10 hover:border-white/20 transition-colors">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-blue-400 mb-4">
        {icon}
      </div>
      <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
```

---

## 二、登录/注册页设计

### 2.1 当前问题

```
┌──────────────────────────────────────┐
│          SenseWorld                  │
│      声视界 - 多模态 AI 对话        │
│                                      │
│      ┌────────────────────────┐     │
│      │ [登录] [注册]          │     │
│      ├────────────────────────┤     │
│      │ 邮箱                   │     │
│      │ 密码                   │     │
│      │ [登录]                 │     │
│      └────────────────────────┘     │
│                                      │
└──────────────────────────────────────┘
```

**问题**：
- 白色卡片在浅蓝背景上，缺乏设计感
- 没有品牌展示
- 没有价值传递

### 2.2 新设计：分屏布局

**桌面端**：

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐│
│  │                         │  │                             ││
│  │     品牌展示区          │  │        登录表单区           ││
│  │                         │  │                             ││
│  │  🎤 SenseWorld          │  │     欢迎回来               ││
│  │                         │  │                             ││
│  │  语音+视频              │  │  ┌─────────────────────┐   ││
│  │  多模态 AI 对话         │  │  │ 邮箱                │   ││
│  │                         │  │  └─────────────────────┘   ││
│  │  ─────────────────      │  │                             ││
│  │                         │  │  ┌─────────────────────┐   ││
│  │  ✓ 开口即聊             │  │  │ 密码          👁️  │   ││
│  │  ✓ 拍视频问 AI          │  │  └─────────────────────┘   ││
│  │  ✓ 实时语音响应         │  │                             ││
│  │                         │  │  ┌─────────────────────┐   ││
│  │  ─────────────────      │  │  │      登录           │   ││
│  │                         │  │  └─────────────────────┘   ││
│  │  "像打电话一样          │  │                             ││
│  │   和 AI 自然交流"       │  │  ── 或者 ──               ││
│  │                         │  │                             ││
│  │                         │  │  [Google] [GitHub] [微信]  ││
│  │                         │  │                             ││
│  │                         │  │  没有账号？立即注册        ││
│  │                         │  │                             ││
│  └─────────────────────────┘  └─────────────────────────────┘│
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**视觉风格**：
- 左侧：深色背景 + 品牌色渐变
- 右侧：浅色/白色背景
- 分界处：圆角卡片覆盖

### 2.3 移动端

```
┌──────────────────────────┐
│                          │
│   🎤 SenseWorld          │
│                          │
│   语音+视频 AI 对话      │
│                          │
│   ─────────────────────  │
│                          │
│   欢迎回来               │
│                          │
│   ┌──────────────────┐   │
│   │ 邮箱             │   │
│   └──────────────────┘   │
│                          │
│   ┌──────────────────┐   │
│   │ 密码         👁️ │   │
│   └──────────────────┘   │
│                          │
│   ┌──────────────────┐   │
│   │      登录        │   │
│   └──────────────────┘   │
│                          │
│   ── 或者 ──            │
│                          │
│   [Google] [GitHub]      │
│                          │
│   没有账号？立即注册     │
│                          │
└──────────────────────────┘
```

### 2.4 代码实现

```tsx
// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mic, Video, Zap, Check, Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRegister = searchParams.get("register") === "true";
  
  const [mode, setMode] = useState<"login" | "register">(isRegister ? "register" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    // ... 登录/注册逻辑
  };

  return (
    <div className="min-h-screen flex">
      {/* 左侧：品牌展示（仅桌面端） */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-semibold text-xl">SenseWorld</span>
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-4">
            语音+视频
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              多模态 AI 对话
            </span>
          </h1>
        </div>

        <div className="space-y-4">
          <FeatureItem icon={<Mic />} text="开口即聊，无需打字" />
          <FeatureItem icon={<Video />} text="拍视频让 AI 理解画面" />
          <FeatureItem icon={<Zap />} text="实时语音响应，边生成边听" />
        </div>

        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
          <p className="text-gray-400 text-sm italic">
            "像打电话一样，和 AI 自然交流"
          </p>
        </div>
      </div>

      {/* 右侧：表单 */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* 移动端品牌 */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Mic className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-lg">SenseWorld</span>
            </div>
            <p className="text-gray-500 text-sm">语音+视频 AI 对话</p>
          </div>

          {/* 标题 */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {mode === "login" ? "欢迎回来" : "创建账号"}
          </h2>
          <p className="text-gray-500 mb-8">
            {mode === "login" 
              ? "登录后开始与 AI 对话" 
              : "注册后体验语音+视频 AI 对话"}
          </p>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <InputField
                label="昵称"
                placeholder="你的昵称"
                value={displayName}
                onChange={setDisplayName}
              />
            )}
            
            <InputField
              label="邮箱"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={setEmail}
              icon={<Mail className="w-5 h-5 text-gray-400" />}
            />
            
            <InputField
              label="密码"
              type={showPassword ? "text" : "password"}
              placeholder="至少 8 位"
              value={password}
              onChange={setPassword}
              icon={<Lock className="w-5 h-5 text-gray-400" />}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              }
            />

            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? "处理中..." : mode === "login" ? "登录" : "注册"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* 分隔线 */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 text-sm">或者</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* 第三方登录 */}
          <div className="flex gap-3">
            <SocialButton icon="google" label="Google" />
            <SocialButton icon="github" label="GitHub" />
            <SocialButton icon="wechat" label="微信" />
          </div>

          {/* 切换模式 */}
          <p className="text-center text-gray-500 mt-8">
            {mode === "login" ? "没有账号？" : "已有账号？"}
            <button
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="text-blue-600 hover:underline ml-1 font-medium"
            >
              {mode === "login" ? "立即注册" : "立即登录"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-blue-400">
        {icon}
      </div>
      <span className="text-gray-300">{text}</span>
    </div>
  );
}

function InputField({ 
  label, 
  type = "text", 
  placeholder, 
  value, 
  onChange, 
  icon,
  suffix 
}: {
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full py-3 ${icon ? 'pl-11' : 'pl-4'} ${suffix ? 'pr-11' : 'pr-4'} bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
        />
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {suffix}
          </div>
        )}
      </div>
    </div>
  );
}

function SocialButton({ icon, label }: { icon: string; label: string }) {
  return (
    <button className="flex-1 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
      <span className="text-gray-600 text-sm">{label}</span>
    </button>
  );
}
```

---

## 三、登录成功后引导

### 3.1 当前问题

用户登录后直接进入聊天页，没有任何引导。

### 3.2 新设计：首次使用引导

**空状态聊天页**：

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  ┌──────────┐                                                │
│  │ 会话列表 │                                                │
│  │          │                                                │
│  │          │                                                │
│  │          │                                                │
│  │          │                                                │
│  └──────────┤                                                │
│             │                                                │
│             │         ┌─────────────────────────┐           │
│             │         │                         │           │
│             │         │           🎤            │           │
│             │         │                         │           │
│             │         │    点击麦克风           │           │
│             │         │    开始语音对话         │           │
│             │         │                         │           │
│             │         │    或者输入文字         │           │
│             │         │                         │           │
│             │         └─────────────────────────┘           │
│             │                                                │
│             │                                                │
├─────────────┴────────────────────────────────────────────────┤
│  [+]  │  输入消息...  │  [📹] [🎤]                          │
└────────────────────────────────────────────────────────────────┘
```

**引导气泡**（首次进入）：

```
┌─────────────────────────────────────┐
│  💡 提示：                          │
│                                     │
│  点击 🎤 麦克风按钮开始语音对话     │
│  点击 📹 视频按钮发送视频给 AI      │
│                                     │
│  [知道了]                           │
└─────────────────────────────────────┘
```

### 3.3 代码实现

```tsx
// components/chat/EmptyState.tsx
"use client";

import { Mic, Video, MessageCircle } from "lucide-react";

interface EmptyStateProps {
  onMicClick: () => void;
  onVideoClick: () => void;
}

export function EmptyState({ onMicClick, onVideoClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      {/* 主图标 */}
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center mb-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Mic className="w-8 h-8 text-white" />
        </div>
      </div>

      {/* 标题 */}
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        开始对话
      </h2>
      
      {/* 副标题 */}
      <p className="text-gray-500 mb-8 max-w-sm">
        点击麦克风开始语音对话，或输入文字
      </p>

      {/* 快捷操作 */}
      <div className="flex gap-4">
        <button
          onClick={onMicClick}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <Mic className="w-5 h-5" />
          语音对话
        </button>
        <button
          onClick={onVideoClick}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          <Video className="w-5 h-5" />
          视频理解
        </button>
      </div>
    </div>
  );
}

// 首次引导提示
export function FirstTimeGuide({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 max-w-sm">
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xl">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            💡
          </div>
          <div>
            <p className="font-medium mb-1">快速开始</p>
            <p className="text-gray-400 text-sm mb-3">
              点击 🎤 开始语音对话
              <br />
              点击 📹 发送视频给 AI
            </p>
            <button
              onClick={onDismiss}
              className="text-blue-400 text-sm font-medium hover:text-blue-300"
            >
              知道了
            </button>
          </div>
        </div>
      </div>
      {/* 指向输入栏的箭头 */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-900 rotate-45" />
    </div>
  );
}
```

---

## 四、聊天页整体视觉

### 4.1 配色系统

```css
:root {
  /* 背景 */
  --bg-primary: #0f172a;     /* slate-900 */
  --bg-secondary: #1e293b;   /* slate-800 */
  --bg-tertiary: #334155;    /* slate-700 */
  
  /* 前景 */
  --text-primary: #f8fafc;   /* slate-50 */
  --text-secondary: #94a3b8; /* slate-400 */
  --text-muted: #64748b;     /* slate-500 */
  
  /* 强调色 */
  --accent-blue: #3b82f6;    /* blue-500 */
  --accent-purple: #8b5cf6;  /* purple-500 */
  --accent-gradient: linear-gradient(135deg, #3b82f6, #8b5cf6);
  
  /* 卡片 */
  --card-bg: rgba(30, 41, 59, 0.5);
  --card-border: rgba(148, 163, 184, 0.1);
}
```

### 4.2 聊天页布局

```
┌────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Header (固定，深色背景，模糊玻璃效果)                  │  │
│  │  🎤 SenseWorld                          用户名 [退出]  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌────────────┐  ┌────────────────────────────────────────┐  │
│  │            │  │                                        │  │
│  │  会话列表  │  │          消息区域                      │  │
│  │            │  │                                        │  │
│  │  (深色     │  │  (深色背景，用户消息蓝紫渐变           │  │
│  │   卡片)    │  │   AI 消息灰色卡片)                    │  │
│  │            │  │                                        │  │
│  │            │  ├────────────────────────────────────────┤  │
│  │            │  │  输入栏 (48px，深色背景)              │  │
│  └────────────┘  └────────────────────────────────────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 4.3 消息气泡样式

```tsx
// 用户消息：渐变背景
<div className="inline-block px-4 py-2.5 rounded-2xl rounded-tr-md bg-gradient-to-r from-blue-500 to-purple-600 text-white">
  <p>消息内容</p>
</div>

// AI 消息：深色卡片
<div className="inline-block px-4 py-2.5 rounded-2xl rounded-tl-md bg-slate-700/50 backdrop-blur border border-slate-600/50 text-slate-100">
  <p>消息内容</p>
</div>
```

---

## 五、动效设计

### 5.1 页面过渡

```tsx
// 页面进入动画
<div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
  {content}
</div>
```

### 5.2 消息入场

```tsx
// 消息发送动画
<div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
  {message}
</div>
```

### 5.3 按钮交互

```tsx
// 录音按钮脉冲
<button className="relative">
  {isRecording && (
    <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-25" />
  )}
  <Mic className="w-5 h-5" />
</button>
```

---

## 六、验收标准

| 验收标准 | 方案 | 能否达成 |
|----------|------|----------|
| 首页有品牌感 | 深色渐变 + 大标题 + 特性展示 | ✅ |
| 登录页有设计感 | 分屏布局 + 品牌展示区 | ✅ |
| 首次使用有引导 | 空状态 + 引导气泡 | ✅ |
| 聊天页视觉统一 | 深色主题 + 渐变强调 | ✅ |
| 图标风格统一 | Lucide 线性图标 | ✅ |
| 动效增强体验 | 进入动画 + 消息动画 | ✅ |

---

**下一步**：开发按顺序实现各页面。