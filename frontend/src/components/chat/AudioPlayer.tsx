"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

// 格式化时长
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

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

  useEffect(() => {
    if (src) {
      audioRef.current = new Audio();
      audioRef.current.preload = "metadata"; // 预加载元数据获取时长
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
      audioRef.current.onerror = () => {
        // 静默处理加载错误
        setDuration(0);
      };
      audioRef.current.src = src;
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

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!src) return null;

  return (
    <button
      onClick={handlePlayPause}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
        "bg-gray-100 hover:bg-gray-200 transition-colors",
        "text-gray-700",
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
        {duration > 0 
          ? (isPlaying ? formatDuration(currentTime) : formatDuration(duration))
          : "..."
        }
      </span>
    </button>
  );
}
