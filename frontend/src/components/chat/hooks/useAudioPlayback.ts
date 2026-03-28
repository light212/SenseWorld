/**
 * Audio playback hook with global state management.
 * Prevents audio overlap and supports playback queue.
 */

import { useCallback, useEffect, useRef } from "react";
import { useAudioPlaybackStore } from "@/stores/audioPlaybackStore";
import { audioEngine } from "@/lib/audio-engine";
import { createAudioUrl } from "@/lib/audio-cache";

export interface UseAudioPlaybackReturn {
  isPlaying: boolean;
  currentAudioId: string | null;
  play: (audioId: string, audioUrl: string) => Promise<void>;
  playBase64: (audioId: string, base64Chunks: string[]) => Promise<void>;
  pause: () => void;
  stop: () => void;
  enqueue: (audioId: string, audioUrl: string) => void;
  queueLength: number;
}

/**
 * Hook for managing audio playback with global state.
 * Ensures only one audio plays at a time across all components.
 */
export function useAudioPlayback(): UseAudioPlaybackReturn {
  const currentAudioId = useAudioPlaybackStore((s) => s.currentAudioId);
  const isPlaying = useAudioPlaybackStore((s) => s.isPlaying);
  const audioQueue = useAudioPlaybackStore((s) => s.audioQueue);
  
  const setCurrentAudio = useAudioPlaybackStore((s) => s.setCurrentAudio);
  const setIsPlaying = useAudioPlaybackStore((s) => s.setIsPlaying);
  const enqueueStore = useAudioPlaybackStore((s) => s.enqueue);
  const dequeue = useAudioPlaybackStore((s) => s.dequeue);
  const clearQueue = useAudioPlaybackStore((s) => s.clearQueue);
  const stopStore = useAudioPlaybackStore((s) => s.stop);
  
  // Internal refs for audio handling
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const isProcessingQueue = useRef(false);

  /**
   * Play next item in queue
   */
  const processQueue = useCallback(async () => {
    if (isProcessingQueue.current) return;
    
    const nextItem = dequeue();
    if (!nextItem) {
      isProcessingQueue.current = false;
      return;
    }
    
    isProcessingQueue.current = true;
    
    try {
      if (nextItem.base64) {
        // Play base64 audio using audio engine
        const audioData = Uint8Array.from(atob(nextItem.base64), c => c.charCodeAt(0));
        await audioEngine.playAudio(audioData.buffer as ArrayBuffer);
      } else {
        // Play URL using HTMLAudioElement
        const audio = new Audio(nextItem.url);
        currentAudioRef.current = audio;
        setCurrentAudio(nextItem.id);
        setIsPlaying(true);
        
        await audio.play();
        
        audio.onended = () => {
          currentAudioRef.current = null;
          setCurrentAudio(null);
          setIsPlaying(false);
          isProcessingQueue.current = false;
          processQueue();
        };
        
        audio.onerror = () => {
          currentAudioRef.current = null;
          setCurrentAudio(null);
          setIsPlaying(false);
          isProcessingQueue.current = false;
          processQueue();
        };
      }
    } catch (error) {
      console.error("Audio playback failed:", error);
      currentAudioRef.current = null;
      setCurrentAudio(null);
      setIsPlaying(false);
      isProcessingQueue.current = false;
      processQueue();
    }
  }, [dequeue, setCurrentAudio, setIsPlaying]);

  /**
   * Play audio by URL
   */
  const play = useCallback(async (audioId: string, audioUrl: string) => {
    // Stop any currently playing audio
    stop();
    
    try {
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      setCurrentAudio(audioId);
      setIsPlaying(true);
      
      await audio.play();
      
      return new Promise<void>((resolve) => {
        audio.onended = () => {
          currentAudioRef.current = null;
          setCurrentAudio(null);
          setIsPlaying(false);
          resolve();
        };
        
        audio.onerror = () => {
          currentAudioRef.current = null;
          setCurrentAudio(null);
          setIsPlaying(false);
          resolve();
        };
      });
    } catch (error) {
      console.error("Failed to play audio:", error);
      setCurrentAudio(null);
      setIsPlaying(false);
    }
  }, [setCurrentAudio, setIsPlaying]);

  /**
   * Play audio from base64 chunks
   */
  const playBase64 = useCallback(async (audioId: string, base64Chunks: string[]) => {
    // Stop any currently playing audio
    stop();
    
    try {
      // Create audio URL from base64 chunks
      const audioUrl = createAudioUrl(base64Chunks);
      
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      setCurrentAudio(audioId);
      setIsPlaying(true);
      
      await audio.play();
      
      return new Promise<void>((resolve) => {
        audio.onended = () => {
          currentAudioRef.current = null;
          setCurrentAudio(null);
          setIsPlaying(false);
          // Revoke the blob URL to free memory
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        
        audio.onerror = () => {
          currentAudioRef.current = null;
          setCurrentAudio(null);
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
      });
    } catch (error) {
      console.error("Failed to play base64 audio:", error);
      setCurrentAudio(null);
      setIsPlaying(false);
    }
  }, [setCurrentAudio, setIsPlaying]);

  /**
   * Pause current audio
   */
  const pause = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      setIsPlaying(false);
    }
    audioEngine.pause();
  }, [setIsPlaying]);

  /**
   * Stop current audio and clear queue
   */
  const stop = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    audioEngine.stop();
    stopStore();
    isProcessingQueue.current = false;
  }, [stopStore]);

  /**
   * Add audio to queue
   */
  const enqueue = useCallback((audioId: string, audioUrl: string) => {
    enqueueStore(audioId, audioUrl);
    
    // If nothing is playing, start processing queue
    if (!isPlaying && !isProcessingQueue.current) {
      processQueue();
    }
  }, [enqueueStore, isPlaying, processQueue]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, []);

  return {
    isPlaying,
    currentAudioId,
    play,
    playBase64,
    pause,
    stop,
    enqueue,
    queueLength: audioQueue.length,
  };
}