"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAudio, createAudioUrl } from "@/lib/audio-cache";

interface VoiceMessageBubbleProps {
  messageId?: string;
  duration: number; // 毫秒
  audioUrl?: string;
  audioBlob?: Blob;
  isUser?: boolean;
  className?: string;
}

export function VoiceMessageBubble({
  messageId,
  duration,
  audioUrl,
  audioBlob,
  isUser = true,
  className,
}: VoiceMessageBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 初始化音频 URL
  useEffect(() => {
    let mounted = true;
    
    async function loadAudio() {
      // 优先用 audioBlob（实时录制）
      if (audioBlob) {
        const url = URL.createObjectURL(audioBlob);
        if (mounted) setCurrentUrl(url);
        return () => URL.revokeObjectURL(url);
      }
      
      // 其次用 audioUrl（直接传入）
      if (audioUrl) {
        if (mounted) setCurrentUrl(audioUrl);
        return;
      }
      
      // 最后从缓存读取
      if (messageId) {
        try {
          const cached = await getAudio(messageId);
          if (cached?.audioChunks?.length > 0 && mounted) {
            const url = createAudioUrl(cached.audioChunks);
            setCurrentUrl(url);
          }
        } catch (e) {
          console.warn('Failed to load cached audio:', e);
        }
      }
    }
    
    loadAudio();
    return () => { mounted = false; };
  }, [messageId, audioBlob, audioUrl]);

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
  const hasAudio = !!currentUrl;

  // 如果没有音频且时长为 0，显示简化的无效状态
  if (!hasAudio && duration === 0) {
    return (
      <div className={cn("text-xs text-gray-400 px-2 py-1", className)}>
        语音已过期
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {/* 语音条 */}
      <div
        className={cn(
          "relative flex items-center gap-3 px-3 py-2 rounded-2xl",
          isUser
            ? "bg-blue-500 text-white"
            : "bg-gray-100 text-gray-700 border border-gray-200",
          !hasAudio && "opacity-60"
        )}
        style={{ width: `${bubbleWidth}px` }}
      >
        {/* 播放按钮 */}
        <button
          onClick={handlePlay}
          disabled={!hasAudio}
          aria-label={isPlaying ? "暂停" : "播放"}
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
            "transition-transform active:scale-95",
            isUser
              ? "bg-white text-blue-500"
              : "bg-white text-gray-600 shadow-sm",
            !hasAudio && "cursor-not-allowed"
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
    </div>
  );
}
