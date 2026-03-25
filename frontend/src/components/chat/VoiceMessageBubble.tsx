"use client";

/**
 * Voice message bubble component - 类似微信语音条样式
 */

import { useState, useRef, useEffect } from "react";
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
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-2xl transition-colors",
          isUser
            ? "bg-primary-500 text-white hover:bg-primary-600"
            : "bg-gray-100 text-gray-900 hover:bg-gray-200",
          isPlaying && "animate-pulse"
        )}
        style={{
          minWidth: `${Math.min(60 + duration / 100, 200)}px`,
          maxWidth: "200px",
        }}
      >
        {/* 播放图标 */}
        <div className="flex-shrink-0">
          {isPlaying ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </div>

        {/* 声波动画 */}
        <div className="flex-1 flex items-center gap-0.5 h-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 rounded-full transition-all",
                isUser ? "bg-white/60" : "bg-gray-400"
              )}
              style={{
                height: isPlaying
                  ? `${Math.sin((progress / 100) * Math.PI + i * 0.5) * 8 + 8}px`
                  : `${4 + i * 2}px`,
              }}
            />
          ))}
        </div>

        {/* 时长 */}
        <span className="flex-shrink-0 text-sm font-medium">
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

      {/* 转写文字（可选） */}
      {transcription && (
        <p
          className={cn(
            "text-xs mt-1",
            isUser ? "text-white/80" : "text-gray-500"
          )}
        >
          {transcription}
        </p>
      )}
    </div>
  );
}