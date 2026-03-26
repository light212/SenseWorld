# SenseWorld 聊天界面 UX 设计方案 v2

**项目**: SenseWorld
**日期**: 2026-03-26
**版本**: v2（基于产品定位重新设计）

---

## 一、产品定位

| 维度 | 定义 |
|------|------|
| **核心价值** | 多模态对话 - 语音 + 视频交互，像与真人对话一样自然 |
| **目标用户** | 企业客户 + 个人用户（toB/toC） |
| **差异化** | 语音/视频交互、流式实时响应、多模态理解 |

**设计原则**：
- 多模态优先 - 语音 + 视频 是核心交互
- 紧凑高效 - 输入区域最小化，给消息更多空间
- 符合习惯 - 参考微信，用户无需学习
- 预留扩展 - 为视频理解预留交互入口

---

## 二、输入区域重新设计

### 2.1 当前问题

```
┌─────────────────────────────────┐
│   🎤 语音  │  ⌨️ 文字          │  ← 切换按钮：多余操作
├─────────────────────────────────┤
│                                 │
│        语音输入区域              │  ← 占用 ~120px
│      (大按钮 + 动画)             │
│                                 │
└─────────────────────────────────┘
```

**问题**：
1. 语音是核心，却要点击切换才能用
2. 输入区域占用太多空间
3. 不符合微信用户习惯

### 2.2 新方案：多模态输入栏

```
┌────────────────────────────────────────────────────┐
│ [+] │ 输入消息... │ [📹] [🎤] 或 [➤]            │  ← 48px
└────────────────────────────────────────────────────┘
```

**交互逻辑**：
- 📹 视频按钮：拍摄/上传视频，发送给 AI 理解
- 🎤 语音按钮：点击开始录音，再点击停止（语音对话）
- ➤ 发送按钮：输入框有内容时显示
- 输入框：点击直接打字，无需切换模式

**按钮优先级**：
1. **视频** 📹 - 未来核心能力，预留入口
2. **语音** 🎤 - 当前核心能力，主操作
3. **文字** - 备选输入方式

### 2.3 录音状态

**录音中**：
```
┌────────────────────────────────────────────────────┐
│ [✕] │ ● 录音中 00:03 │ [✓ 发送]                  │
└────────────────────────────────────────────────────┘
```

### 2.4 视频交互（预留）

**视频选择**：
```
┌────────────────────────────────────────────────────┐
│ [✕] │ 选择视频...   │ [📁 相册] [📷 拍摄]        │
└────────────────────────────────────────────────────┘
```

**视频预览**：
```
┌────────────────────────────────────────────────────┐
│ [✕] │ [视频缩略图] 00:15 │ [🎤 添加语音] [发送]  │
└────────────────────────────────────────────────────┘
```

### 2.4 高度对比

| 方案 | 高度 | 消息区域增加 |
|------|------|-------------|
| 当前 | ~120px | - |
| 新方案 | ~48px | +72px（约 3-4 条消息） |

---

## 三、完整用户旅程设计

### 3.1 首页（当前缺失）

**问题**：用户打开网站只看到"加载中"，不知道产品是什么。

**新首页设计**：
```
┌──────────────────────────────────────┐
│                                      │
│           🎤 SenseWorld              │
│                                      │
│       声视界 - 用声音和视频对话      │
│                                      │
│    "开口即聊，拍视频问 AI"           │
│                                      │
│         [  开始对话  ]               │
│                                      │
│         已有账号？登录               │
│                                      │
└──────────────────────────────────────┘
```

**UX 要点**：
- 3 秒内理解产品价值（语音 + 视频）
- 一个主按钮，明确行动
- 简洁，不打扰

### 3.2 登录/注册页

**当前问题**：白色表单，没有产品价值说明。

**新设计**：
```
┌──────────────────────────────────────┐
│                                      │
│   左侧：品牌展示（桌面端）            │
│   ┌────────────────────────────┐    │
│   │  🎤 SenseWorld             │    │
│   │                            │    │
│   │  语音+视频 · 实时响应      │    │
│   │                            │    │
│   │  - 开口即聊，无需打字      │    │
│   │  - 拍视频让 AI 理解画面    │    │
│   │  - 流式播放，边生成边听    │    │
│   └────────────────────────────┘    │
│                                      │
│   右侧：登录表单                      │
│   ┌────────────────────────────┐    │
│   │  欢迎回来                  │    │
│   │  ──────────────────────    │    │
│   │  邮箱                      │    │
│   │  密码                      │    │
│   │  [登录]                    │    │
│   │                            │    │
│   │  没有账号？立即注册        │    │
│   └────────────────────────────┘    │
│                                      │
└──────────────────────────────────────┘
```

**移动端**：只有表单，顶部显示简洁的品牌说明。

### 3.3 首次进入聊天

**当前问题**：直接进入聊天，没有引导。

**新设计**：空状态引导
```
┌──────────────────────────────────────┐
│                                      │
│                                      │
│           🎤                         │
│                                      │
│       点击麦克风，开始对话           │
│                                      │
│       "你好，有什么可以帮你的？"     │
│                                      │
│                                      │
├──────────────────────────────────────┤
│  [+]  │  输入消息...  │     [🎤]    │
└──────────────────────────────────────┘
```

---

## 四、组件代码改进

### 4.1 新的 CompactInputBar 组件（含视频入口）

```tsx
// components/chat/CompactInputBar.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface CompactInputBarProps {
  onTextSend: (text: string) => void;
  onVoiceRecord: (blob: Blob, duration: number) => void;
  onVideoSelect?: (file: File) => void; // 视频入口（预留）
  disabled?: boolean;
}

export function CompactInputBar({
  onTextSend,
  onVoiceRecord,
  onVideoSelect,
  disabled = false,
}: CompactInputBarProps) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // 开始录音
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start();
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 100);
    } catch (error) {
      console.error("Failed to start recording:", error);
      alert("无法访问麦克风");
    }
  }, []);

  // 停止录音
  const stopRecording = useCallback((send: boolean = true) => {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());

    const duration = Date.now() - startTimeRef.current;

    mediaRecorderRef.current.onstop = () => {
      if (send && chunksRef.current.length > 0) {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        onVoiceRecord(blob, duration);
      }
      chunksRef.current = [];
    };

    setIsRecording(false);
    setRecordingDuration(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [onVoiceRecord]);

  // 发送文字
  const handleSend = () => {
    if (text.trim()) {
      onTextSend(text.trim());
      setText("");
    }
  };

  // 选择视频
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onVideoSelect) {
      onVideoSelect(file);
    }
  };

  // Enter 发送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 格式化时长
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // 录音中状态
  if (isRecording) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border-t">
        <button
          onClick={() => stopRecording(false)}
          className="p-2 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
        
        <div className="flex-1 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm text-gray-700">录音中</span>
          <span className="text-sm font-mono text-gray-900">
            {formatDuration(recordingDuration)}
          </span>
        </div>
        
        <button
          onClick={() => stopRecording(true)}
          className="px-4 py-1.5 bg-primary-500 text-white rounded-full text-sm font-medium"
        >
          发送
        </button>
      </div>
    );
  }

  // 正常输入状态
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t bg-white">
      {/* 更多按钮 */}
      <button
        className="p-2 text-gray-400 hover:text-gray-600"
        title="更多"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* 输入框 */}
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="输入消息..."
        className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
      />

      {/* 视频按钮（预留） */}
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        onChange={handleVideoSelect}
        className="hidden"
      />
      <button
        onClick={() => videoInputRef.current?.click()}
        disabled={disabled}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
        title="发送视频"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>

      {/* 语音/发送按钮 */}
      {text.trim() ? (
        <button
          onClick={handleSend}
          disabled={disabled}
          className="p-2.5 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors"
          title="发送"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      ) : (
        <button
          onClick={startRecording}
          disabled={disabled}
          className="p-2.5 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors"
          title="语音输入"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>
      )}
    </div>
  );
}
```

### 4.2 更新 ChatWindow

```tsx
// ChatWindow.tsx 修改
import { CompactInputBar } from "./CompactInputBar";

export function ChatWindow({ ... }) {
  return (
    <div className="flex flex-col h-full">
      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <MessageList ... />
      </div>

      {/* 紧凑输入栏 - 替换原来的输入区域 */}
      <CompactInputBar
        onTextSend={handleTextSend}
        onVoiceRecord={handleVoiceRecordingComplete}
        disabled={isSendingMessage || isStreaming}
      />
    </div>
  );
}
```

---

## 五、设计效果对比

### 5.1 输入区域

| 维度 | 当前 | 新方案 |
|------|------|--------|
| 高度 | ~120px | ~48px |
| 操作步骤 | 切换模式 → 输入/录音 | 直接输入/点击录音 |
| 语音入口 | 需要 2 次点击 | 1 次点击 |
| 消息区域 | 较小 | 增加 72px |

### 5.2 用户旅程

| 阶段 | 当前 | 新方案 |
|------|------|--------|
| 首页 | "加载中" | 品牌展示 + 开始按钮 |
| 登录页 | 白色表单 | 价值说明 + 表单 |
| 首次进入 | 无引导 | 空状态提示 |
| 输入 | 模式切换 | 语音优先，一键录音 |

---

## 六、实施优先级

| 优先级 | 改进项 | 工时 | 影响 |
|--------|--------|------|------|
| **P0** | 紧凑输入栏（CompactInputBar） | 2h | 核心体验提升 |
| **P1** | 首页品牌展示 | 1h | 用户理解产品 |
| **P1** | 登录页价值说明 | 1h | 注册转化 |
| **P2** | 空状态引导 | 0.5h | 首次体验 |
| **P2** | 配色优化 | 1h | 视觉品质 |
| **P3** | 移动端响应式 | 2h | 设备适配 |

---

## 七、验收标准

| 验收标准 | 设计方案 | 能否达成 |
|----------|----------|----------|
| 输入区域高度 ≤ 50px | 新方案 48px | ✅ |
| 语音 1 次点击可用 | 麦克风按钮直接可见 | ✅ |
| 视频入口预留 | 视频按钮在输入栏 | ✅ |
| 符合微信习惯 | 输入框 + 多模态按钮并列 | ✅ |
| 消息区域增加 | +72px（约 3-4 条消息） | ✅ |
| 多模态优先 | 视频 + 语音按钮突出 | ✅ |

---

**下一步**：通知开发实现 CompactInputBar 组件。