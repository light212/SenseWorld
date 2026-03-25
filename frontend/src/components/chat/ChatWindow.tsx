"use client";

/**
 * Main chat window component integrating all chat functionality.
 */

import { useCallback, useState, useEffect } from "react";
import { VoiceInput } from "./VoiceInput";
import { TextInput } from "./TextInput";
import { MessageList } from "./MessageList";
import { useConversationStore } from "@/stores/conversationStore";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";

interface ChatWindowProps {
  conversationId?: string;
  className?: string;
}

export function ChatWindow({ conversationId, className }: ChatWindowProps) {
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");

  const {
    currentConversationId,
    messages,
    streamingContent,
    isStreaming,
    isSendingMessage,
    addMessage,
    setMessages,
    setIsSendingMessage,
    setCurrentConversation,
  } = useConversationStore();

  const { token } = useAuthStore();

  // 使用传入的 conversationId 或 store 中的
  const activeConversationId = conversationId || currentConversationId;

  // 加载历史消息 - 当会话变化时重新加载
  useEffect(() => {
    if (!token || !activeConversationId) return;
    
    // 清空当前消息
    setMessages([]);
    
    const loadMessages = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/v1/conversations/${activeConversationId}/messages`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) {
          const data = await response.json();
          if (data.items && data.items.length > 0) {
            const loadedMessages: Message[] = data.items.map((m: any) => ({
              id: m.id,
              conversationId: m.conversation_id,
              role: m.role,
              content: m.content,
              createdAt: m.created_at,
              hasAudio: m.has_audio,
              audioDuration: m.audio_duration,
            }));
            setMessages(loadedMessages);
          }
        }
      } catch (error) {
        console.error("Failed to load messages:", error);
      }
    };
    loadMessages();
  }, [activeConversationId, token, setMessages]);

  const handleVoiceRecordingComplete = useCallback(
    async (blob: Blob, duration: number) => {
      if (!activeConversationId) return;
      
      setIsSendingMessage(true);

      try {
        // 1. Upload audio for ASR
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");
        formData.append("language", "zh");

        const asrResponse = await fetch("http://localhost:8000/v1/speech/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!asrResponse.ok) {
          throw new Error("ASR request failed");
        }

        const asrResult = await asrResponse.json();
        const transcribedText = asrResult.text;

        if (!transcribedText || transcribedText.trim() === "") {
          console.warn("Empty ASR result");
          return;
        }

        // 2. Add user message to UI
        const userMessage: Message = {
          id: crypto.randomUUID(),
          conversationId: activeConversationId,
          role: "user",
          content: transcribedText,
          createdAt: new Date().toISOString(),
          hasAudio: true,
          audioDuration: duration,
          metadata: { 
            inputType: "voice",
            audioBlob: blob,
          },
        };
        addMessage(userMessage);

        // 3. Call chat API
        const chatResponse = await fetch("http://localhost:8000/v1/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            conversation_id: activeConversationId,
            content: transcribedText,
          }),
        });

        if (!chatResponse.ok) {
          throw new Error("Chat request failed");
        }

        const chatData = await chatResponse.json();

        // 4. Add AI response
        const aiMessage: Message = {
          id: chatData.id,
          conversationId: activeConversationId,
          role: "assistant",
          content: chatData.content,
          createdAt: chatData.created_at,
          hasAudio: chatData.has_audio,
        };
        addMessage(aiMessage);
      } catch (error) {
        console.error("Failed to process voice message:", error);
      } finally {
        setIsSendingMessage(false);
      }
    },
    [activeConversationId, token, addMessage, setIsSendingMessage]
  );

  const handleTextSend = useCallback(
    async (text: string) => {
      if (!activeConversationId) return;
      
      setIsSendingMessage(true);

      try {
        // Add user message to UI immediately
        const userMessage: Message = {
          id: crypto.randomUUID(),
          conversationId: activeConversationId,
          role: "user",
          content: text,
          createdAt: new Date().toISOString(),
          hasAudio: false,
          metadata: { inputType: "text" },
        };
        addMessage(userMessage);

        // Call backend API
        const response = await fetch("http://localhost:8000/v1/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            conversation_id: activeConversationId,
            content: text,
          }),
        });

        if (!response.ok) {
          throw new Error("Chat request failed");
        }

        const data = await response.json();

        // Add AI response
        const aiMessage: Message = {
          id: data.id,
          conversationId: activeConversationId,
          role: "assistant",
          content: data.content,
          createdAt: data.created_at,
          hasAudio: data.has_audio,
        };
        addMessage(aiMessage);
      } catch (error) {
        console.error("Failed to send message:", error);
      } finally {
        setIsSendingMessage(false);
      }
    },
    [activeConversationId, token, addMessage, setIsSendingMessage]
  );

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <MessageList
          messages={messages}
          streamingContent={streamingContent}
          isStreaming={isStreaming}
        />
      </div>

      {/* Input area - 紧凑布局 */}
      <div className="flex-shrink-0 border-t bg-white p-3">
        {/* Input mode toggle - 更紧凑 */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <button
            onClick={() => setInputMode("voice")}
            className={cn(
              "px-3 py-1 rounded-full text-sm transition-colors",
              inputMode === "voice"
                ? "bg-primary-100 text-primary-700"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            🎤 语音
          </button>
          <button
            onClick={() => setInputMode("text")}
            className={cn(
              "px-3 py-1 rounded-full text-sm transition-colors",
              inputMode === "text"
                ? "bg-primary-100 text-primary-700"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            ⌨️ 文字
          </button>
        </div>

        {/* Input component */}
        {inputMode === "voice" ? (
          <VoiceInput
            onRecordingComplete={handleVoiceRecordingComplete}
            disabled={isSendingMessage || isStreaming}
            className="compact"
          />
        ) : (
          <TextInput
            onSend={handleTextSend}
            disabled={isSendingMessage || isStreaming}
            placeholder="输入消息..."
          />
        )}
      </div>
    </div>
  );
}
