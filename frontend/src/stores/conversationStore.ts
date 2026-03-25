/**
 * Conversation state management using Zustand.
 */

import { create } from "zustand";
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
  
  // Actions
  setCurrentConversation: (id: string | null) => void;
  setConversations: (conversations: Conversation[]) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateStreamingContent: (content: string) => void;
  clearStreamingContent: () => void;
  setIsStreaming: (isStreaming: boolean) => void;
  setIsSendingMessage: (isSending: boolean) => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  // Initial state
  currentConversationId: null,
  conversations: [],
  messages: [],
  isLoadingConversations: false,
  isLoadingMessages: false,
  isSendingMessage: false,
  streamingContent: "",
  isStreaming: false,

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
}));
