/**
 * Hook for playing audio with streaming support.
 */

import { useCallback, useRef, useState } from "react";

interface UseAudioPlayerReturn {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  play: (audioUrl: string) => Promise<void>;
  playBlob: (blob: Blob) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seek: (time: number) => void;
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (audioRef.current) {
      // Remove event listeners before cleanup to avoid errors
      audioRef.current.onerror = null;
      audioRef.current.onended = null;
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
  }, []);

  const setupAudio = useCallback(
    (src: string) => {
      cleanup();

      const audio = new Audio(src);
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        setDuration(audio.duration * 1000);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentTime(0);
        cleanup();
      };

      audio.onerror = (e) => {
        // Ignore errors after playback ended or during cleanup
        if (!audioRef.current || audioRef.current.ended) {
          return;
        }
        console.error("Audio playback error:", e);
        setIsPlaying(false);
        cleanup();
      };

      // Update current time periodically
      intervalRef.current = setInterval(() => {
        if (audio && !audio.paused) {
          setCurrentTime(audio.currentTime * 1000);
        }
      }, 100);

      return audio;
    },
    [cleanup]
  );

  const play = useCallback(
    async (audioUrl: string) => {
      const audio = setupAudio(audioUrl);

      try {
        await audio.play();
        setIsPlaying(true);
        setIsPaused(false);
      } catch (error) {
        console.error("Failed to play audio:", error);
        cleanup();
      }
    },
    [setupAudio, cleanup]
  );

  const playBlob = useCallback(
    async (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      try {
        await play(url);
      } finally {
        // Clean up the object URL after playback
        // Note: This is handled in cleanup, but we could also revoke here
      }
    },
    [play]
  );

  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPaused(true);
    }
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play();
      setIsPaused(false);
    }
  }, []);

  const stop = useCallback(() => {
    cleanup();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentTime(0);
    setDuration(0);
  }, [cleanup]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time / 1000;
      setCurrentTime(time);
    }
  }, []);

  return {
    isPlaying,
    isPaused,
    currentTime,
    duration,
    play,
    playBlob,
    pause,
    resume,
    stop,
    seek,
  };
}
