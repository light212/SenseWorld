"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Square } from "lucide-react";
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