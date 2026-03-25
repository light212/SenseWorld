/**
 * Conversation state management using Zustand.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Conversation, Message } from "@/types";

interface ConversationState {
  // Current conversation
  currentConversationId: string | null;
  
  // Conversations list
  conversations: Conversation[];
  
  // Messages for current conversation
  messages: Message[];
  
  // Loading states
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSendingMessage: boolean;
  
  // Streaming state
  streamingContent: string;
  isStreaming: boolean;
  
  // Hydration state
  _hasHydrated: boolean;
  
  // Actions
  setCurrentConversation: (id: string | null) => void;
  setConversations: (conversations: Conversation[]) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateStreamingContent: (content: string) => void;
  clearStreamingContent: () => void;
  setIsStreaming: (isStreaming: boolean) => void;
  setIsSendingMessage: (isSending: boolean) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useConversationStore = create<ConversationState>()(
  persist(
    (set) => ({
      // Initial state
      currentConversationId: null,
      conversations: [],
      messages: [],
      isLoadingConversations: false,
      isLoadingMessages: false,
      isSendingMessage: false,
      streamingContent: "",
      isStreaming: false,
      _hasHydrated: false,

      // Actions
      setCurrentConversation: (id) => set({ currentConversationId: id }),
      
      setConversations: (conversations) => set({ conversations }),
      
      setMessages: (messages) => set({ messages }),
      
      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
      
      updateStreamingContent: (content) =>
        set((state) => ({ streamingContent: state.streamingContent + content })),
      
      clearStreamingContent: () => set({ streamingContent: "" }),
      
      setIsStreaming: (isStreaming) => set({ isStreaming }),
      
      setIsSendingMessage: (isSending) => set({ isSendingMessage: isSending }),
      
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "conversation-storage",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// Hook to check if store has been hydrated
export const useConversationHydration = () => {
  const hasHydrated = useConversationStore((state) => state._hasHydrated);
  return hasHydrated;
};
