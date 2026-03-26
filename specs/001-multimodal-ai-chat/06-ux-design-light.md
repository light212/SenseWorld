# SenseWorld 完整 UX 设计方案（亮色主题）

**项目**: SenseWorld
**日期**: 2026-03-26
**版本**: v4（基于用户场景 + 亮色主题）

---

## 零、UX 设计理念

### 0.1 核心场景

| 场景 | 用户目标 | 为什么用 SenseWorld |
|------|----------|---------------------|
| **找酒店** | 快速找到合适的酒店 | 语音描述需求比打字快，AI 能追问细节，视频展示环境更直观 |
| **学习课程** | 获取知识、解答问题 | 语音提问更自然，边听边学，不用盯着屏幕 |

### 0.2 用户画像

#### 画像一：商务出差族

| 维度 | 描述 |
|------|------|
| **谁** | 30-45 岁，经常出差，时间紧张 |
| **目标** | 快速找到合适的酒店 |
| **痛点** | 打字慢，搜索结果太多，不知道哪家好 |
| **使用场景** | 刚下飞机，在出租车/机场，用语音问"帮我找个离会展中心近的酒店，预算 500 左右" |
| **期待** | AI 像助理一样，问清需求，推荐几家，直接决策 |

#### 画像二：在线学习者

| 维度 | 描述 |
|------|------|
| **谁** | 20-35 岁，想学新技能，碎片时间学习 |
| **目标** | 快速获取知识、解答疑问 |
| **痛点** | 搜索结果太散，不知道从哪学起，看文字累 |
| **使用场景** | 通勤路上、做家务时，用语音问"Python 的列表和元组有什么区别" |
| **期待** | AI 像老师一样，边讲边举例，听得懂 |

### 0.3 用户旅程地图（找酒店场景）

```
┌─────────────────────────────────────────────────────────────────────┐
│  阶段        │  需求产生    │  寻找方案    │  评估决策    │  完成任务  │
├─────────────────────────────────────────────────────────────────────┤
│  用户行为    │  要出差了    │  打开 App    │  AI 推荐     │  确认预订  │
│              │  需要订酒店  │  语音提问    │  追问细节    │            │
├─────────────────────────────────────────────────────────────────────┤
│  用户情绪    │  😟 焦虑     │  😊 期待     │  🤔 思考     │  😌 满意   │
│              │  时间紧      │  希望快点    │  对比选择    │  解决问题  │
├─────────────────────────────────────────────────────────────────────┤
│  痛点        │  不知道从哪找│  打字太慢    │  信息太多    │  -         │
│              │              │  搜索结果散  │  不知道选谁  │            │
├─────────────────────────────────────────────────────────────────────┤
│  机会点      │  -           │  语音一键提问│  AI 追问需求│  一键预订  │
│              │              │  AI 理解意图 │  精准推荐    │  视频看房  │
├─────────────────────────────────────────────────────────────────────┤
│  设计要点    │  -           │  首页突出    │  多轮对话    │  行动按钮  │
│              │              │  "找酒店"    │  推荐卡片    │  外链预订  │
└─────────────────────────────────────────────────────────────────────┘
```

### 0.4 用户旅程地图（学习课程场景）

```
┌─────────────────────────────────────────────────────────────────────┐
│  阶段        │  问题产生    │  寻求解答    │  理解学习    │  巩固知识  │
├─────────────────────────────────────────────────────────────────────┤
│  用户行为    │  遇到问题    │  打开 App    │  听 AI 讲解  │  继续追问  │
│              │  想学某技能  │  语音提问    │  边听边学    │            │
├─────────────────────────────────────────────────────────────────────┤
│  用户情绪    │  🤔 困惑     │  😊 期待     │  💡 豁然开朗 │  😌 有收获  │
│              │  不知道从哪学│  希望讲清楚  │  听懂了      │            │
├─────────────────────────────────────────────────────────────────────┤
│  痛点        │  问题太具体  │  搜索结果散  │  看文字累    │  学完就忘  │
│              │  搜索找不到  │  答案太复杂  │  不够直观    │            │
├─────────────────────────────────────────────────────────────────────┤
│  机会点      │  -           │  语音直接问  │  TTS 语音讲  │  主动提问  │
│              │              │  AI 懂小白   │  举例说明    │  学习路径  │
├─────────────────────────────────────────────────────────────────────┤
│  设计要点    │  -           │  首页突出    │  语音播放    │  相关推荐  │
│              │              │  "学课程"    │  代码高亮    │  收藏功能  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 一、视觉风格（亮色主题）

### 1.1 品牌感知

**关键词**：清新 · 专业 · 友好 · 高效

**设计方向**：
- 白色为主，干净清爽
- 蓝色强调，专业可信
- 绿色辅助，友好温暖
- 大量留白，聚焦内容

### 1.2 配色系统

```css
:root {
  /* 背景色 */
  --bg-primary: #ffffff;       /* 页面背景 */
  --bg-secondary: #f8fafc;     /* 次级背景 */
  --bg-tertiary: #f1f5f9;      /* 卡片背景 */
  
  /* 品牌色 */
  --primary-50: #eff6ff;
  --primary-100: #dbeafe;
  --primary-200: #bfdbfe;
  --primary-300: #93c5fd;
  --primary-400: #60a5fa;
  --primary-500: #3b82f6;      /* 主色 */
  --primary-600: #2563eb;
  --primary-700: #1d4ed8;
  
  /* 辅助色 */
  --success-500: #22c55e;      /* 成功 */
  --warning-500: #f59e0b;      /* 警告 */
  --error-500: #ef4444;        /* 错误 */
  
  /* 文字色 */
  --text-primary: #0f172a;     /* 主文字 */
  --text-secondary: #475569;   /* 次要文字 */
  --text-muted: #94a3b8;       /* 辅助文字 */
  
  /* 边框色 */
  --border-default: #e2e8f0;
  --border-muted: #f1f5f9;
}
```

### 1.3 颜色应用规则

| 元素 | 颜色 |
|------|------|
| 页面背景 | `#ffffff` |
| 卡片背景 | `#f8fafc` 或 `#ffffff` + 边框 |
| 主按钮 | `#3b82f6`（蓝色） |
| 次按钮 | `#ffffff` + 边框 |
| 用户消息气泡 | `#3b82f6`（蓝色） |
| AI 消息气泡 | `#f1f5f9`（浅灰） |
| 主要文字 | `#0f172a` |
| 次要文字 | `#475569` |
| 辅助文字 | `#94a3b8` |
| 边框 | `#e2e8f0` |

---

## 二、首页/落地页设计

### 2.1 设计目标

**用户 3 秒内理解**：
1. 这是什么产品 → 语音+视频 AI 助手
2. 能帮我做什么 → 找酒店、学课程、解答问题
3. 怎么开始 → 点击开始按钮

### 2.2 页面布局

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Logo    SenseWorld              [登录] [免费开始]     │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│                                                                │
│                    🎤                                           │
│                                                                │
│              用声音，让 AI 帮你                                 │
│                                                                │
│           找酒店 · 学课程 · 解答问题                           │
│                                                                │
│                                                                │
│         ┌─────────────────────────────────┐                  │
│         │                                 │                  │
│         │    🎤  开始语音对话             │                  │
│         │                                 │                  │
│         └─────────────────────────────────┘                  │
│                                                                │
│                                                                │
│         ┌─────────────────────────────────────────┐          │
│         │                                         │          │
│         │   🏨 找酒店     📚 学课程     💬 问问题  │          │
│         │                                         │          │
│         │   语音描述需求   语音提问       语音/文字  │          │
│         │   AI 精准推荐   边听边学       实时回答  │          │
│         │                                         │          │
│         └─────────────────────────────────────────┘          │
│                                                                │
│                                                                │
│         "刚下飞机，帮我找个离会展中心近的酒店"                  │
│                                                                │
│         "Python 的列表和元组有什么区别"                        │
│                                                                │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 2.3 完整代码

```tsx
// app/page.tsx
"use client";

import { Mic, MapPin, BookOpen, MessageCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* 导航栏 */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg text-gray-900">SenseWorld</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              登录
            </Link>
            <Link
              href="/login?register=true"
              className="px-5 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              免费开始
            </Link>
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* 图标 */}
          <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-blue-50 flex items-center justify-center">
            <Mic className="w-10 h-10 text-blue-500" />
          </div>

          {/* 标题 */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            用声音，让 AI 帮你
          </h1>
          
          {/* 副标题 */}
          <p className="text-xl text-gray-500 mb-10">
            找酒店 · 学课程 · 解答问题
          </p>
          
          {/* CTA 按钮 */}
          <Link
            href="/login?register=true"
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-500 text-white rounded-xl font-medium text-lg hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/25"
          >
            <Mic className="w-5 h-5" />
            开始语音对话
            <ArrowRight className="w-5 h-5" />
          </Link>

          {/* 场景卡片 */}
          <div className="grid md:grid-cols-3 gap-6 mt-20">
            <SceneCard
              icon={<MapPin className="w-6 h-6" />}
              title="找酒店"
              description="语音描述需求，AI 精准推荐"
              example="帮我找个离会展中心近的酒店"
            />
            <SceneCard
              icon={<BookOpen className="w-6 h-6" />}
              title="学课程"
              description="语音提问，边听边学"
              example="Python 列表和元组有什么区别"
            />
            <SceneCard
              icon={<MessageCircle className="w-6 h-6" />}
              title="问问题"
              description="语音或文字，实时回答"
              example="明天的天气怎么样"
            />
          </div>

          {/* 示例对话 */}
          <div className="mt-20 p-8 bg-gray-50 rounded-2xl">
            <p className="text-gray-500 text-sm mb-4">试试这样说：</p>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <ExampleBubble text="刚下飞机，帮我找个离会展中心近的酒店，预算 500 左右" />
              <ExampleBubble text="我是 Python 新手，从哪里开始学" />
            </div>
          </div>
        </div>
      </main>

      {/* 底部 */}
      <footer className="py-8 px-6 border-t border-gray-100">
        <div className="max-w-6xl mx-auto text-center text-gray-500 text-sm">
          © 2026 SenseWorld · 语音+视频 AI 助手
        </div>
      </footer>
    </div>
  );
}

function SceneCard({ icon, title, description, example }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  example: string;
}) {
  return (
    <div className="p-6 bg-white border border-gray-200 rounded-2xl hover:shadow-md transition-shadow">
      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-gray-900 text-lg mb-2">{title}</h3>
      <p className="text-gray-500 text-sm mb-3">{description}</p>
      <p className="text-gray-400 text-xs italic">"{example}"</p>
    </div>
  );
}

function ExampleBubble({ text }: { text: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full text-sm">
      <Mic className="w-4 h-4" />
      {text}
    </div>
  );
}
```

---

## 三、登录/注册页设计

### 3.1 设计目标

- 用户快速完成注册/登录
- 展示产品价值（场景化）
- 降低注册门槛

### 3.2 页面布局

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                                                         │  │
│  │                    🎤 SenseWorld                        │  │
│  │                                                         │  │
│  │               找酒店 · 学课程 · 问问题                  │  │
│  │                                                         │  │
│  │  ─────────────────────────────────────────────────────  │  │
│  │                                                         │  │
│  │                    欢迎回来                            │  │
│  │                                                         │  │
│  │              ┌─────────────────────┐                   │  │
│  │              │ 📧 邮箱             │                   │  │
│  │              └─────────────────────┘                   │  │
│  │                                                         │  │
│  │              ┌─────────────────────┐                   │  │
│  │              │ 🔒 密码         👁️ │                   │  │
│  │              └─────────────────────┘                   │  │
│  │                                                         │  │
│  │              ┌─────────────────────┐                   │  │
│  │              │       登录          │                   │  │
│  │              └─────────────────────┘                   │  │
│  │                                                         │  │
│  │                    ── 或者 ──                          │  │
│  │                                                         │  │
│  │              [Google] [GitHub] [微信]                  │  │
│  │                                                         │  │
│  │                没有账号？立即注册                       │  │
│  │                                                         │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 3.3 完整代码

```tsx
// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mic, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo 和标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-xl text-gray-900">SenseWorld</span>
          </div>
          <p className="text-gray-500">找酒店 · 学课程 · 问问题</p>
        </div>

        {/* 表单卡片 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {/* 标题 */}
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            {mode === "login" ? "欢迎回来" : "创建账号"}
          </h2>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  昵称
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="你的昵称"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                邮箱
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                密码
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少 8 位"
                  className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
            <SocialButton label="Google" />
            <SocialButton label="GitHub" />
            <SocialButton label="微信" />
          </div>

          {/* 切换模式 */}
          <p className="text-center text-gray-500 mt-6">
            {mode === "login" ? "没有账号？" : "已有账号？"}
            <button
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="text-blue-500 hover:underline ml-1 font-medium"
            >
              {mode === "login" ? "立即注册" : "立即登录"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function SocialButton({ label }: { label: string }) {
  return (
    <button className="flex-1 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-600 text-sm">
      {label}
    </button>
  );
}
```

---

## 四、聊天页设计

### 4.1 设计目标

- 用户快速开始对话
- 语音操作一键触达
- 消息清晰易读
- 适配多场景（找酒店、学课程）

### 4.2 页面布局

```
┌────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  🎤 SenseWorld                          用户名 · 退出   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌──────────┐  ┌────────────────────────────────────────────┐ │
│  │          │  │                                            │ │
│  │  会话列表 │  │                                            │ │
│  │          │  │              消息区域                       │ │
│  │  新对话   │  │                                            │ │
│  │          │  │  ┌────────────────────────────┐            │ │
│  │  ────    │  │  │ 帮我找个离会展中心近的酒店 │  ← 用户    │ │
│  │          │  │  └────────────────────────────┘            │ │
│  │  找酒店   │  │                                            │ │
│  │  昨天     │  │  ┌────────────────────────────┐            │ │
│  │          │  │  │ 好的，我帮您找一下...       │  ← AI     │ │
│  │  ────    │  │  │ 推荐以下酒店：              │            │ │
│  │          │  │  │ 1. XX酒店 距离500m         │            │ │
│  │  学Python │  │  │ 2. YY酒店 距离1km         │            │ │
│  │  前天     │  │  └────────────────────────────┘            │ │
│  │          │  │                                            │ │
│  └──────────┘  └────────────────────────────────────────────┘ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  [+]  │  输入消息...       │  [📹] [🎤]  [➤]           │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 4.3 空状态设计

**首次进入时的空状态**：

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│                                                                │
│                         🎤                                     │
│                                                                │
│                   点击麦克风，开始对话                         │
│                                                                │
│                                                                │
│         ┌────────────────┐    ┌────────────────┐             │
│         │  🏨 找酒店     │    │  📚 学课程     │             │
│         └────────────────┘    └────────────────┘             │
│                                                                │
│                                                                │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│  [+]  │  输入消息...       │  [📹] [🎤]                     │
└────────────────────────────────────────────────────────────────┘
```

### 4.4 消息气泡样式

```tsx
// 用户消息（蓝色）
<div className="flex justify-end mb-4">
  <div className="max-w-[70%] px-4 py-2.5 rounded-2xl rounded-tr-md bg-blue-500 text-white">
    <p className="text-[15px] leading-relaxed">帮我找个离会展中心近的酒店</p>
    <time className="block text-xs text-blue-100 mt-1 text-right">10:30</time>
  </div>
</div>

// AI 消息（浅灰）
<div className="flex justify-start mb-4">
  <div className="max-w-[70%] px-4 py-2.5 rounded-2xl rounded-tl-md bg-gray-100 text-gray-900">
    <p className="text-[15px] leading-relaxed">好的，我帮您找一下...</p>
    <time className="block text-xs text-gray-400 mt-1">10:30</time>
  </div>
</div>
```

### 4.5 输入栏设计

```tsx
// 紧凑输入栏
<div className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 bg-white">
  {/* 更多按钮 */}
  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
    <Plus className="w-5 h-5" />
  </button>

  {/* 输入框 */}
  <input
    type="text"
    placeholder="输入消息..."
    className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
  />

  {/* 视频按钮 */}
  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
    <Video className="w-5 h-5" />
  </button>

  {/* 语音/发送按钮 */}
  <button className="p-2.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors">
    <Mic className="w-5 h-5" />
  </button>
</div>
```

---

## 五、场景化交互设计

### 5.1 找酒店场景

**用户语音输入**：
> "帮我找个离会展中心近的酒店，预算 500 左右"

**AI 响应**：
1. 理解意图：找酒店
2. 提取信息：位置（会展中心附近）、预算（500 左右）
3. 追问（如果需要）："您需要什么房型？大床还是双床？"
4. 推荐：展示酒店卡片
5. 行动：提供预订链接

**UI 展示**：
```
┌─────────────────────────────────────────┐
│  🏨 XX 酒店                             │
│  ─────────────────────────────────────  │
│  📍 距会展中心 500m                      │
│  💰 ¥468/晚                             │
│  ⭐ 4.5 · 238 条评价                    │
│                                         │
│  ┌───────────┐  ┌───────────┐          │
│  │  查看详情  │  │  预订     │          │
│  └───────────┘  └───────────┘          │
└─────────────────────────────────────────┘
```

### 5.2 学课程场景

**用户语音输入**：
> "Python 的列表和元组有什么区别"

**AI 响应**：
1. 语音讲解区别
2. 代码示例
3. 相关知识点推荐

**UI 展示**：
```
列表和元组的区别：

1. 列表可变，元组不可变
2. 列表用 []，元组用 ()

┌─────────────────────────────────────────┐
│  # 示例                                 │
│  my_list = [1, 2, 3]                    │
│  my_tuple = (1, 2, 3)                   │
│                                         │
│  my_list[0] = 10  # ✅ 可以             │
│  my_tuple[0] = 10  # ❌ 报错            │
└─────────────────────────────────────────┘

相关问题：
• 列表有哪些常用方法？
• 什么时候用元组而不是列表？
```

---

## 六、验收标准

| 验收标准 | 设计方案 | 能否达成 |
|----------|----------|----------|
| 亮色主题 | 白色为主，蓝色强调 | ✅ |
| 用户场景清晰 | 找酒店、学课程 | ✅ |
| 首页 3 秒理解产品 | 场景卡片 + 示例对话 | ✅ |
| 语音操作突出 | 麦克风按钮显著 | ✅ |
| 消息易读 | 蓝色/灰色气泡，清晰对比 | ✅ |
| 空状态有引导 | 场景快捷入口 | ✅ |

---

**完整 UX 设计完成，基于亮色主题 + 用户场景。**