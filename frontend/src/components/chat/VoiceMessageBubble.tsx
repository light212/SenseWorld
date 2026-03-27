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
  const [actualDuration, setActualDuration] = useState(duration);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 初始化音频 URL
  useEffect(() => {
    let mounted = true;

    async function loadAudio() {
      if (audioBlob) {
        const url = URL.createObjectURL(audioBlob);
        if (mounted) setCurrentUrl(url);
        return;
      }
      if (audioUrl) {
        if (mounted) setCurrentUrl(audioUrl);
        return;
      }
      if (messageId) {
        try {
          const cached = await getAudio(messageId);
          if (cached?.audioChunks?.length > 0 && mounted) {
            const url = createAudioUrl(cached.audioChunks);
            setCurrentUrl(url);
          }
        } catch (e) {
          console.warn("Failed to load cached audio:", e);
        }
      }
    }

    loadAudio();
    return () => {
      mounted = false;
    };
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
        audioRef.current.onloadedmetadata = () => {
          if (audioRef.current && audioRef.current.duration) {
            setActualDuration(Math.round(audioRef.current.duration * 1000));
          }
        };
        audioRef.current.onended = () => {
          setIsPlaying(false);
          setProgress(0);
        };
        audioRef.current.ontimeupdate = () => {
          if (audioRef.current && audioRef.current.duration) {
            setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
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

  // 没有音频且时长为 0
  if (!currentUrl && duration === 0) {
    return (
      <div className={cn("text-xs text-gray-400 px-1 py-0.5", className)}>
        语音已过期
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl",
        "max-w-[240px]",
        "px-4 py-3",
        isUser
          ? "bg-gradient-to-r from-blue-500 to-purple-600 rounded-tr-sm"
          : "bg-white border border-gray-200 shadow-sm rounded-tl-sm",
        className
      )}
    >
      {/* 播放按钮 */}
      <button
        onClick={handlePlay}
        disabled={!currentUrl}
        className={cn(
          "flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-opacity",
          !currentUrl && "opacity-40 cursor-not-allowed",
          isUser ? "text-white" : "text-blue-500"
        )}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 translate-x-0.5" />
        )}
      </button>

      {/* 声波图 - flex:1 占满剩余空间 */}
      <div className="flex-1 flex items-center gap-[3px] min-w-[60px]">
        {[...Array(10)].map((_, i) => {
          const staticHeights = [8, 12, 16, 20, 24, 24, 20, 16, 12, 8];
          const dynamicHeight = isPlaying
            ? 6 + Math.abs(Math.sin(progress / 10 + i * 0.7)) * 18
            : staticHeights[i];
          return (
            <div
              key={i}
              className={cn(
                "w-[3px] rounded-full transition-all duration-100",
                isUser ? "bg-white/70" : "bg-gray-300"
              )}
              style={{ height: `${dynamicHeight}px` }}
            />
          );
        })}
      </div>

      {/* 时长 */}
      <span
        className={cn(
          "flex-shrink-0 text-[13px] font-medium tabular-nums",
          isUser ? "text-white/90" : "text-gray-500"
        )}
      >
        {formatDuration(actualDuration)}
      </span>
    </div>
  );
}
