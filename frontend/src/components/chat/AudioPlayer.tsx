"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAudio, createAudioUrl } from "@/lib/audio-cache";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface AudioPlayerProps {
  messageId: string;
  fallbackSrc?: string;
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
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 尝试从缓存加载
  useEffect(() => {
    let mounted = true;
    
    async function loadFromCache() {
      try {
        const cached = await getAudio(messageId);
        if (cached?.audioChunks?.length > 0 && mounted) {
          const url = createAudioUrl(cached.audioChunks);
          setAudioSrc(url);
        }
      } catch (e) {
        console.warn('Cache load failed:', e);
      }
      if (mounted) setIsLoading(false);
    }
    
    loadFromCache();
    return () => { mounted = false; };
  }, [messageId]);

  // 从服务器加载
  const loadFromServer = async () => {
    if (!fallbackSrc) return;
    setIsLoading(true);
    
    try {
      const response = await fetch(fallbackSrc);
      if (response.ok) {
        const blob = await response.blob();
        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          setAudioSrc(url);
          // 自动播放
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.play();
              setIsPlaying(true);
            }
          }, 100);
        }
      }
    } catch (e) {
      console.error('Server load failed:', e);
    }
    setIsLoading(false);
  };

  // 设置音频元素
  useEffect(() => {
    if (!audioSrc) return;
    
    const audio = new Audio(audioSrc);
    audio.onloadedmetadata = () => setDuration(audio.duration || 0);
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime || 0);
    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    audioRef.current = audio;
    
    return () => {
      audio.pause();
      URL.revokeObjectURL(audioSrc);
    };
  }, [audioSrc]);

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

  // 没有音频源 - 显示点击播放
  if (!audioSrc && !isLoading) {
    return (
      <button
        onClick={loadFromServer}
        disabled={!fallbackSrc}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
          "bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors",
          !fallbackSrc && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <Play className="w-4 h-4" />
        <span className="text-xs">点击播放</span>
      </button>
    );
  }

  // 加载中
  if (isLoading) {
    return (
      <div className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100",
        className
      )}>
        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-gray-400">加载中...</span>
      </div>
    );
  }

  // 正常播放器
  return (
    <button
      onClick={handlePlayPause}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
        "bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700",
        className
      )}
    >
      <div className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center",
        isPlaying ? "bg-blue-500 text-white" : "bg-gray-300 text-gray-600"
      )}>
        {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
      </div>

      <div className="w-16 h-1 bg-gray-300 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
      </div>

      <span className="text-xs text-gray-500 tabular-nums min-w-[32px]">
        {isPlaying ? formatDuration(currentTime) : formatDuration(duration)}
      </span>
    </button>
  );
}
