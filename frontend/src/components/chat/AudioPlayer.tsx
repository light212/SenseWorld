"use client";

/**
 * Audio player component for playing AI voice responses.
 */

import { useAudioPlayer } from "@/hooks/useAudioPlayer";
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
  const {
    isPlaying,
    isPaused,
    currentTime,
    duration,
    play,
    pause,
    resume,
    stop,
  } = useAudioPlayer();

  const handlePlayPause = async () => {
    if (isPlaying && !isPaused) {
      pause();
    } else if (isPaused) {
      resume();
    } else if (src) {
      await play(src);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!src) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-2 bg-gray-100 rounded-lg",
        className
      )}
    >
      <button
        onClick={handlePlayPause}
        className="p-2 rounded-full bg-white hover:bg-gray-50 shadow-sm"
      >
        {isPlaying && !isPaused ? (
          <svg
            className="w-4 h-4 text-primary-600"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg
            className="w-4 h-4 text-primary-600"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className="flex-1">
        <div className="h-1 bg-gray-300 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <span className="text-xs text-gray-500 min-w-[40px]">
        {formatDuration(currentTime)} / {formatDuration(duration)}
      </span>

      {isPlaying && (
        <button
          onClick={stop}
          className="p-1 text-gray-400 hover:text-gray-600"
          title="停止"
        >
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <rect x="6" y="6" width="12" height="12" />
          </svg>
        </button>
      )}
    </div>
  );
}
