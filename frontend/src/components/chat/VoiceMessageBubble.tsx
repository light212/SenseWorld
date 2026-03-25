"use client";

/**
 * Voice message bubble component - 类似微信语音条样式
 */

import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceMessageBubbleProps {
  duration: number; // 毫秒
  audioUrl?: string; // Blob URL 或后端 URL
  audioBlob?: Blob; // 原始 Blob 数据
  isUser?: boolean;
  transcription?: string; // 转写文字
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

  // 如果传入的是 Blob，创建 Blob URL
  useEffect(() => {
    if (audioBlob && !audioUrl) {
      const url = URL.createObjectURL(audioBlob);
      setCurrentUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [audioBlob, audioUrl]);

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
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

  // 清理
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {/* 语音条 */}
      <button
        onClick={handlePlay}
        aria-label={isPlaying ? "暂停播放" : "播放语音"}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-2xl transition-all duration-200",
          isUser
            ? "bg-primary-600 text-white hover:bg-primary-700"
            : "bg-gray-100 text-gray-900 hover:bg-gray-200",
          isPlaying && "ring-2 ring-primary-300"
        )}
        style={{
          minWidth: `${Math.min(80 + duration / 100, 220)}px`,
          maxWidth: "220px",
        }}
      >
        {/* 播放图标 */}
        <div className="flex-shrink-0 w-5 h-5">
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5" />
          )}
        </div>

        {/* 声波动画 */}
        <div className="flex-1 flex items-center gap-0.5 h-5">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 rounded-full transition-all duration-150",
                isUser ? "bg-white/70" : "bg-gray-400"
              )}
              style={{
                height: isPlaying
                  ? `${6 + Math.sin(progress / 10 + i) * 8}px`
                  : `${3 + i * 2}px`,
              }}
            />
          ))}
        </div>

        {/* 时长 */}
        <span className="flex-shrink-0 text-sm font-medium tabular-nums">
          {formatDuration(duration)}
        </span>
      </button>

      {/* 进度条（播放时显示） */}
      {isPlaying && (
        <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all",
              isUser ? "bg-white/40" : "bg-primary-300"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* 转写文字 - 显示在气泡内下方 */}
      {transcription && (
        <p className="text-xs text-gray-500 mt-0.5 px-1">
          "{transcription}"
        </p>
      )}
    </div>
  );
}