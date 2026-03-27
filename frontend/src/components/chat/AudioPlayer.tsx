"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAudio, createAudioUrl } from "@/lib/audio-cache";

// 格式化时长
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface AudioPlayerProps {
  messageId: string; // 用于从缓存获取
  fallbackSrc?: string; // 如果缓存没有，用这个 URL
  className?: string;
}

export function AudioPlayer({
  messageId,
  fallbackSrc,
  className,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    
    async function loadAudio() {
      setIsLoading(true);
      
      // 1. 先尝试从本地缓存获取
      const cached = await getAudio(messageId);
      if (cached && cached.audioChunks.length > 0) {
        const url = createAudioUrl(cached.audioChunks);
        audioUrlRef.current = url;
        
        if (mounted) {
          const audio = new Audio(url);
          audio.onloadedmetadata = () => {
            if (mounted) {
              setDuration(audio.duration || 0);
              setIsLoading(false);
            }
          };
          audio.ontimeupdate = () => {
            if (mounted) setCurrentTime(audio.currentTime || 0);
          };
          audio.onended = () => {
            if (mounted) {
              setIsPlaying(false);
              setCurrentTime(0);
            }
          };
          audio.onerror = () => {
            if (mounted) {
              setIsExpired(true);
              setIsLoading(false);
            }
          };
          audioRef.current = audio;
        }
        return;
      }
      
      // 2. 没有缓存，显示已过期
      if (mounted) {
        setIsExpired(true);
        setIsLoading(false);
      }
    }
    
    loadAudio();
    
    return () => {
      mounted = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, [messageId]);

  const handlePlayPause = () => {
    if (!audioRef.current || isExpired) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // 已过期状态
  if (isExpired) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
          "bg-gray-100 text-gray-400",
          className
        )}
      >
        <AlertCircle className="w-4 h-4" />
        <span className="text-xs">语音已过期</span>
      </div>
    );
  }

  return (
    <button
      onClick={handlePlayPause}
      disabled={isLoading}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
        "bg-gray-100 hover:bg-gray-200 transition-colors",
        "text-gray-700",
        isLoading && "opacity-50 cursor-wait",
        className
      )}
      aria-label={isPlaying ? "暂停" : "播放"}
    >
      {/* 播放/暂停图标 */}
      <div className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center",
        isPlaying ? "bg-blue-500 text-white" : "bg-gray-300 text-gray-600"
      )}>
        {isPlaying ? (
          <Pause className="w-3 h-3" />
        ) : (
          <Play className="w-3 h-3 ml-0.5" />
        )}
      </div>

      {/* 简易进度条 */}
      <div className="w-16 h-1 bg-gray-300 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 时长 */}
      <span className="text-xs text-gray-500 tabular-nums min-w-[32px]">
        {isLoading
          ? "..."
          : isPlaying
          ? formatDuration(currentTime)
          : formatDuration(duration)
        }
      </span>
    </button>
  );
}
