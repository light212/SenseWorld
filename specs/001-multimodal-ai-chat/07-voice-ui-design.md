# SenseWorld 语音播放 UI 优化设计

**项目**: SenseWorld
**日期**: 2026-03-26
**版本**: v1

---

## 一、当前问题分析

### 1.1 VoiceMessageBubble（语音消息气泡）

| 问题 | 现状 |
|------|------|
| 渐变背景 | 与亮色主题不协调，过于花哨 |
| 声波动画 | 5 条，静态时不够美观 |
| 进度条 | 单独一行，占用空间 |
| 播放按钮 | 只在播放时显示 ring，不够明显 |

### 1.2 AudioPlayer（AI 语音播放器）

| 问题 | 现状 |
|------|------|
| 整体样式 | 灰色背景，过于朴素 |
| 播放按钮 | 小圆圈，不够突出 |
| 进度条 | 太细，不好点击 |
| 时间显示 | 格式冗长 |

---

## 二、设计目标

- 与亮色主题协调
- 清晰的视觉层级
- 流畅的播放体验
- 现代感设计

---

## 三、语音消息气泡优化（VoiceMessageBubble）

### 3.1 用户语音消息

**设计效果**：
```
┌────────────────────────────────────────┐
│                                        │
│  ▶ ││││││  0:12                       │  ← 蓝色气泡
│                                        │
└────────────────────────────────────────┘

播放中：
┌────────────────────────────────────────┐
│                                        │
│  ⏸ ▂▄▆█▆▄  0:05  ────────────────     │  ← 声波动画 + 进度条
│                                        │
└────────────────────────────────────────┘
```

**样式规范**：
- 背景：`bg-blue-500`（纯蓝，无渐变）
- 圆角：`rounded-2xl`（16px）
- 内边距：`px-4 py-2.5`
- 播放按钮：圆形，白色背景
- 声波：7 条，动态高度
- 进度条：集成在气泡内

### 3.2 AI 语音消息

**设计效果**：
```
┌────────────────────────────────────────┐
│                                        │
│  ▶ ││││││  0:15                       │  ← 浅灰气泡
│                                        │
└────────────────────────────────────────┘
```

**样式规范**：
- 背景：`bg-gray-100`
- 文字：`text-gray-700`
- 边框：`border border-gray-200`
- 其他同用户消息

### 3.3 完整代码

```tsx
// components/chat/VoiceMessageBubble.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceMessageBubbleProps {
  duration: number; // 毫秒
  audioUrl?: string;
  audioBlob?: Blob;
  isUser?: boolean;
  transcription?: string;
  className?: string;
}

export function VoiceMessageBubble({
  duration,
  audioUrl,
  audioBlob,
  isUser = true,
  transcription,
  className,
}: VoiceMessageBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentUrl, setCurrentUrl] = useState<string | null>(audioUrl || null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioBlob && !audioUrl) {
      const url = URL.createObjectURL(audioBlob);
      setCurrentUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [audioBlob, audioUrl]);

  const formatDuration = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handlePlay = () => {
    if (!currentUrl) return;

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(currentUrl);
        audioRef.current.onended = () => {
          setIsPlaying(false);
          setProgress(0);
        };
        audioRef.current.ontimeupdate = () => {
          if (audioRef.current) {
            setProgress(
              (audioRef.current.currentTime / audioRef.current.duration) * 100
            );
          }
        };
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // 计算气泡宽度（基于时长）
  const bubbleWidth = Math.min(140 + (duration / 1000) * 4, 260);

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {/* 语音条 */}
      <div
        className={cn(
          "relative flex items-center gap-3 px-3 py-2 rounded-2xl",
          isUser
            ? "bg-blue-500 text-white"
            : "bg-gray-100 text-gray-700 border border-gray-200"
        )}
        style={{ width: `${bubbleWidth}px` }}
      >
        {/* 播放按钮 */}
        <button
          onClick={handlePlay}
          aria-label={isPlaying ? "暂停" : "播放"}
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
            "transition-transform active:scale-95",
            isUser
              ? "bg-white text-blue-500"
              : "bg-white text-gray-600 shadow-sm"
          )}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </button>

        {/* 声波区域 */}
        <div className="flex-1 flex items-center justify-center h-8">
          <div className="flex items-center gap-[3px] h-full">
            {[...Array(7)].map((_, i) => {
              // 静态时的高度模式
              const staticHeights = [12, 18, 24, 28, 24, 18, 12];
              // 播放时的动态高度
              const dynamicHeight = isPlaying
                ? 8 + Math.sin(progress / 8 + i * 0.8) * 12
                : staticHeights[i];
              
              return (
                <div
                  key={i}
                  className={cn(
                    "w-[3px] rounded-full transition-all duration-100",
                    isUser ? "bg-white/80" : "bg-gray-400"
                  )}
                  style={{ height: `${dynamicHeight}px` }}
                />
              );
            })}
          </div>
        </div>

        {/* 时长 */}
        <span className={cn(
          "flex-shrink-0 text-sm font-medium tabular-nums",
          isUser ? "text-white/90" : "text-gray-500"
        )}>
          {formatDuration(duration)}
        </span>

        {/* 进度条（叠加在底部） */}
        {isPlaying && (
          <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden rounded-b-2xl">
            <div
              className={cn(
                "h-full transition-all duration-100",
                isUser ? "bg-white/40" : "bg-blue-400/60"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* 转写文字 */}
      {transcription && (
        <p className={cn(
          "text-xs px-1",
          isUser ? "text-blue-600" : "text-gray-500"
        )}>
          "{transcription}"
        </p>
      )}
    </div>
  );
}
```

---

## 四、AI 语音播放器优化（AudioPlayer）

### 4.1 设计效果

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  ┌────┐  ▂▃▅▇▅▃▂▂▃▅▇▅▃▂▂▃▅▇▅▃▂     0:45 / 1:30          │
│  │ ▶ │  ──────────────────────────────                   │
│  └────┘                                                    │
│                                                            │
└────────────────────────────────────────────────────────────┘

播放中：
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  ┌────┐  ▂▃▅▇▅▃▂ ▂▃▅▇▅▃▂ ▂▃▅▇▅▃▂     0:12 / 1:30   [⏹]  │
│  │ ⏸ │  ████████████░░░░░░░░░░░░░░░                    │
│  └────┘                                                    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 4.2 样式规范

- 背景：`bg-white border border-gray-200`
- 播放按钮：蓝色圆形 `bg-blue-500`
- 进度条：粗条 `h-1.5`，可点击跳转
- 时间：简洁格式 `0:45`
- 声波：动态动画

### 4.3 完整代码

```tsx
// components/chat/AudioPlayer.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Square } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";

interface AudioPlayerProps {
  src?: string;
  autoPlay?: boolean;
  className?: string;
}

export function AudioPlayer({
  src,
  autoPlay = false,
  className,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (src) {
      audioRef.current = new Audio(src);
      audioRef.current.onloadedmetadata = () => {
        setDuration(audioRef.current?.duration || 0);
      };
      audioRef.current.ontimeupdate = () => {
        setCurrentTime(audioRef.current?.currentTime || 0);
      };
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [src]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!src) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 shadow-sm",
        className
      )}
    >
      {/* 播放按钮 */}
      <button
        onClick={handlePlayPause}
        className={cn(
          "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
          "bg-blue-500 text-white",
          "hover:bg-blue-600 transition-colors",
          "active:scale-95 transition-transform"
        )}
        aria-label={isPlaying ? "暂停" : "播放"}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5 ml-0.5" />
        )}
      </button>

      {/* 声波 + 进度条 */}
      <div className="flex-1 flex flex-col gap-1.5">
        {/* 声波动画 */}
        <div className="flex items-center gap-[2px] h-4">
          {[...Array(20)].map((_, i) => {
            const dynamicHeight = isPlaying
              ? 4 + Math.sin(currentTime * 3 + i * 0.5) * 6
              : 4 + Math.sin(i * 0.4) * 4;
            return (
              <div
                key={i}
                className={cn(
                  "w-[2px] rounded-full transition-all duration-75",
                  i / 20 < progress / 100
                    ? "bg-blue-500"
                    : "bg-gray-300"
                )}
                style={{ height: `${dynamicHeight}px` }}
              />
            );
          })}
        </div>

        {/* 进度条（可点击） */}
        <div
          ref={progressRef}
          onClick={handleProgressClick}
          className="h-1.5 bg-gray-200 rounded-full overflow-hidden cursor-pointer group"
        >
          <div
            className="h-full bg-blue-500 relative transition-all duration-100"
            style={{ width: `${progress}%` }}
          >
            {/* 拖动点 */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>

      {/* 时间 */}
      <div className="flex-shrink-0 flex items-center gap-2">
        <span className="text-sm text-gray-500 font-medium tabular-nums min-w-[70px] text-right">
          {formatDuration(currentTime)} / {formatDuration(duration)}
        </span>

        {/* 停止按钮（播放时显示） */}
        {isPlaying && (
          <button
            onClick={handleStop}
            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="停止"
          >
            <Square className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
```

---

## 五、声波动画规范

### 5.1 静态状态

```
用户语音：白色条，高度递增后递减
│││││││
12182428241812 (px)

AI 语音：灰色条，同上
```

### 5.2 播放状态

```
动态高度：8 + sin(时间 + 偏移) * 12
范围：-4px ~ 20px

频率：每 100ms 更新
```

### 5.3 进度指示

```
已播放部分：蓝色（用户）/ 白色（用户语音条内）
未播放部分：灰色 / 半透明白色
```

---

## 六、视觉对比

### 6.1 VoiceMessageBubble

| 维度 | 优化前 | 优化后 |
|------|--------|--------|
| 背景 | 渐变蓝紫 | 纯蓝 `bg-blue-500` |
| 播放按钮 | 无背景图标 | 白色圆形按钮 |
| 声波 | 5 条 | 7 条，静态更美观 |
| 进度条 | 单独一行 | 集成在气泡底部 |
| 宽度 | 按时长计算 | 固定更合理 |

### 6.2 AudioPlayer

| 维度 | 优化前 | 优化后 |
|------|--------|--------|
| 背景 | `bg-gray-100` | 白色 + 边框 |
| 播放按钮 | 小圆圈 | 大圆形蓝色按钮 |
| 进度条 | `h-1` 太细 | `h-1.5` 可点击 |
| 声波 | 无 | 20 条动态声波 |
| 时间 | 冗长格式 | 简洁格式 |

---

## 七、验收标准

| 验收标准 | 设计方案 | 能否达成 |
|----------|----------|----------|
| 与亮色主题协调 | 纯蓝色 + 白色背景 | ✅ |
| 播放按钮突出 | 白色圆形按钮 | ✅ |
| 声波动画流畅 | 7 条/20 条动态 | ✅ |
| 进度条易操作 | 粗条 + 可点击 | ✅ |
| 时长显示清晰 | 简洁格式 | ✅ |

---

**完整代码已产出，可直接替换现有组件。**