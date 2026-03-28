/**
 * Global audio playback state using Zustand.
 * Prevents audio overlap across components and conversations.
 */

import { create } from "zustand";

interface AudioPlaybackState {
  // Current playing audio
  currentAudioId: string | null;
  isPlaying: boolean;
  
  // Audio queue for sequential playback
  audioQueue: Array<{ id: string; url: string; base64?: string }>;
  
  // Audio element reference (managed externally)
  audioElement: HTMLAudioElement | null;
  
  // Actions
  setCurrentAudio: (id: string | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setAudioElement: (element: HTMLAudioElement | null) => void;
  
  // Queue operations
  enqueue: (id: string, url: string, base64?: string) => void;
  dequeue: () => { id: string; url: string; base64?: string } | null;
  clearQueue: () => void;
  
  // Stop and reset
  stop: () => void;
}

export const useAudioPlaybackStore = create<AudioPlaybackState>((set, get) => ({
  currentAudioId: null,
  isPlaying: false,
  audioQueue: [],
  audioElement: null,
  
  setCurrentAudio: (id) => set({ currentAudioId: id }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setAudioElement: (element) => set({ audioElement: element }),
  
  enqueue: (id, url, base64) => {
    const { currentAudioId, audioQueue } = get();
    // If same audio is already playing or in queue, skip
    if (currentAudioId === id) return;
    if (audioQueue.some(item => item.id === id)) return;
    
    set({ audioQueue: [...audioQueue, { id, url, base64 }] });
  },
  
  dequeue: () => {
    const { audioQueue } = get();
    if (audioQueue.length === 0) return null;
    
    const [first, ...rest] = audioQueue;
    set({ audioQueue: rest });
    return first;
  },
  
  clearQueue: () => set({ audioQueue: [] }),
  
  stop: () => set({
    currentAudioId: null,
    isPlaying: false,
    audioQueue: []
  }),
}));