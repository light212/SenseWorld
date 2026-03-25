# SenseWorld 图标设计规范

**项目**: SenseWorld
**日期**: 2026-03-26
**版本**: v1

---

## 一、当前问题

| 问题 | 现状 |
|------|------|
| 图标来源 | 内联 SVG，无统一库 |
| 填充风格 | `fill="none"` 和 `fill="currentColor"` 混用 |
| 尺寸 | 不一致（w-4, w-5, w-16） |
| 线条粗细 | 不一致 |
| 视觉权重 | 不统一 |

**结果**：图标看起来"拼凑"，缺乏专业感。

---

## 二、图标设计规范

### 2.1 推荐图标库：Lucide

**选择理由**：
- ✅ 现代、清晰、一致性强
- ✅ 基于 Feather Icons，线条优雅
- ✅ React 组件，Tree-shaking 友好
- ✅ 支持 TypeScript
- ✅ 图标数量丰富（1000+）

**备选**：Heroicons（Tailwind 官方，同样优秀）

### 2.2 安装

```bash
npm install lucide-react
```

### 2.3 图标风格规范

| 规范项 | 标准 |
|--------|------|
| **风格** | 线性（outline），非填充 |
| **线条粗细** | 1.5px（Lucide 默认） |
| **尺寸** | 统一使用 `w-5 h-5`（20px）作为标准尺寸 |
| **颜色** | `currentColor`，继承父元素颜色 |
| **圆角** | Lucide 默认（线条末端圆角） |

### 2.4 尺寸层级

| 场景 | 尺寸 | Tailwind 类 |
|------|------|-------------|
| 按钮内图标 | 20px | `w-5 h-5` |
| 小按钮/标签 | 16px | `w-4 h-4` |
| 大图标/空状态 | 48-64px | `w-12 h-12` 或 `w-16 h-16` |
| 输入框图标 | 18px | `w-[18px] h-[18px]` |

---

## 三、图标替换方案

### 3.1 替换对照表

| 当前用途 | Lucide 图标 | 名称 |
|----------|-------------|------|
| 麦克风 | 🎤 → `Mic` | 语音输入 |
| 发送 | ➤ → `Send` | 发送消息 |
| 视频 | 📹 → `Video` | 视频输入 |
| 更多/加号 | + → `Plus` | 更多操作 |
| 取消 | ✕ → `X` | 取消/关闭 |
| 播放 | ▶ → `Play` | 播放语音 |
| 暂停 | ⏸ → `Pause` | 暂停播放 |
| 用户头像 | `User` | 用户 |
| AI 头像 | `Bot` 或 `Monitor` | AI 助手 |
| 聊天气泡 | `MessageCircle` | 会话 |
| 删除 | `Trash2` | 删除会话 |
| 眼睛（显示密码） | `Eye` | 显示 |
| 眼睛划线（隐藏密码） | `EyeOff` | 隐藏 |
| 登出 | `LogOut` | 退出登录 |

### 3.2 核心按钮图标

**语音按钮**：
```tsx
import { Mic } from "lucide-react";

<button className="p-2.5 bg-primary-500 text-white rounded-full">
  <Mic className="w-5 h-5" />
</button>
```

**发送按钮**：
```tsx
import { Send } from "lucide-react";

<button className="p-2.5 bg-primary-500 text-white rounded-full">
  <Send className="w-5 h-5" />
</button>
```

**视频按钮**：
```tsx
import { Video } from "lucide-react";

<button className="p-2 text-gray-500 hover:text-gray-700 rounded-full">
  <Video className="w-5 h-5" />
</button>
```

**更多按钮**：
```tsx
import { Plus } from "lucide-react";

<button className="p-2 text-gray-400 hover:text-gray-600">
  <Plus className="w-5 h-5" />
</button>
```

### 3.3 头像图标

**用户头像**：
```tsx
import { User } from "lucide-react";

<div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center">
  <User className="w-5 h-5 text-white" />
</div>
```

**AI 头像**：
```tsx
import { Bot } from "lucide-react";

<div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
  <Bot className="w-5 h-5 text-gray-600" />
</div>
```

### 3.4 语音消息图标

**播放**：
```tsx
import { Play } from "lucide-react";

<Play className="w-5 h-5" />
```

**暂停**：
```tsx
import { Pause } from "lucide-react";

<Pause className="w-5 h-5" />
```

### 3.5 会话列表图标

**新会话**：
```tsx
import { Plus, MessageCircle } from "lucide-react";

<button className="...">
  <Plus className="w-5 h-5" />
</button>

// 会话图标
<MessageCircle className="w-5 h-5 text-gray-500" />
```

**删除会话**：
```tsx
import { Trash2 } from "lucide-react";

<button className="...">
  <Trash2 className="w-4 h-4" />
</button>
```

### 3.6 登录/登出图标

**显示密码**：
```tsx
import { Eye, EyeOff } from "lucide-react";

{showPassword ? (
  <EyeOff className="w-5 h-5" />
) : (
  <Eye className="w-5 h-5" />
)}
```

**退出登录**：
```tsx
import { LogOut } from "lucide-react";

<button className="...">
  <LogOut className="w-4 h-4" />
  退出
</button>
```

---

## 四、颜色规范

### 4.1 图标颜色

| 状态 | 颜色 | 场景 |
|------|------|------|
| 主操作 | `text-white` | 主按钮内（语音、发送） |
| 次操作 | `text-gray-500` | 次要按钮（更多、视频） |
| 悬停 | `hover:text-gray-700` | 悬停状态 |
| 禁用 | `text-gray-300` | 禁用状态 |
| 危险操作 | `text-red-500` | 删除等 |

### 4.2 空状态图标

```tsx
import { MessageCircle } from "lucide-react";

<div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
  <MessageCircle className="w-8 h-8 text-gray-300" />
</div>
```

---

## 五、组件封装建议

### 5.1 统一图标组件

```tsx
// components/ui/Icon.tsx
import { 
  Mic, Send, Video, Plus, X, Play, Pause, 
  User, Bot, MessageCircle, Trash2, Eye, EyeOff, LogOut 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface IconProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const icons = {
  mic: Mic,
  send: Send,
  video: Video,
  plus: Plus,
  x: X,
  play: Play,
  pause: Pause,
  user: User,
  bot: Bot,
  message: MessageCircle,
  trash: Trash2,
  eye: Eye,
  "eye-off": EyeOff,
  logout: LogOut,
};

const sizes = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

export function Icon({ name, size = "md", className }: IconProps) {
  const IconComponent = icons[name as keyof typeof icons];
  if (!IconComponent) return null;
  
  return (
    <IconComponent 
      className={cn(sizes[size], className)} 
    />
  );
}
```

### 5.2 使用方式

```tsx
import { Icon } from "@/components/ui/Icon";

<button>
  <Icon name="mic" />
</button>

<button>
  <Icon name="send" size="sm" />
</button>
```

---

## 六、迁移步骤

### 步骤 1：安装 Lucide

```bash
cd frontend
npm install lucide-react
```

### 步骤 2：替换组件中的 SVG

按以下顺序替换：

1. `CompactInputBar.tsx`（新增，直接使用 Lucide）
2. `ChatWindow.tsx`
3. `MessageList.tsx`
4. `ConversationList.tsx`
5. `VoiceInput.tsx`
6. `VoiceMessageBubble.tsx`
7. `AudioPlayer.tsx`
8. `TextInput.tsx`
9. `LoginPage.tsx`

### 步骤 3：删除内联 SVG

替换完成后，删除所有内联 `<svg>` 代码。

---

## 七、图标预览

### 核心操作

| 图标 | 名称 | 用途 |
|------|------|------|
| 🎤 | `Mic` | 语音输入 |
| ➤ | `Send` | 发送消息 |
| 📹 | `Video` | 视频输入 |
| + | `Plus` | 更多操作 |

### 状态图标

| 图标 | 名称 | 用途 |
|------|------|------|
| ▶ | `Play` | 播放 |
| ⏸ | `Pause` | 暂停 |
| ✕ | `X` | 取消/关闭 |

### 用户/会话

| 图标 | 名称 | 用途 |
|------|------|------|
| 👤 | `User` | 用户头像 |
| 🤖 | `Bot` | AI 头像 |
| 💬 | `MessageCircle` | 会话 |
| 🗑 | `Trash2` | 删除 |

---

## 八、验收标准

| 验收标准 | 方案 | 能否达成 |
|----------|------|----------|
| 统一图标库 | Lucide React | ✅ |
| 一致的线条风格 | 线性，1.5px | ✅ |
| 统一尺寸规范 | w-5 h-5 为主 | ✅ |
| 颜色一致性 | currentColor 继承 | ✅ |
| 视觉协调 | Lucide 风格一致 | ✅ |

---

**下一步**：开发按迁移步骤执行替换。