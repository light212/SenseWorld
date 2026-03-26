"use client";

/**
 * Main chat window component integrating all chat functionality.
 * 支持流式 LLM 响应 + 分段 TTS
 */

import { useCallback, useEffect, useRef } from "react";
import { MessageList } from "./MessageList";
import { CompactInputBar } from "./CompactInputBar";
import { useConversationStore } from "@/stores/conversationStore";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";

interface ChatWindowProps {
  conversationId?: string;
  className?: string;
}

export function ChatWindow({ conversationId, className }: ChatWindowProps) {
  const {
    currentConversationId,
    messages,
    streamingContent,
    isStreaming,
    isSendingMessage,
    addMessage,
    setMessages,
    setIsSendingMessage,
    updateStreamingContent,
    clearStreamingContent,
    setIsStreaming,
  } = useConversationStore();

  const { token } = useAuthStore();
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  // 使用传入的 conversationId 或 store 中的
  const activeConversationId = conversationId || currentConversationId;

  // 播放音频队列
  const playNextAudio = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    
    isPlayingRef.current = true;
    const audioBase64 = audioQueueRef.current.shift();
    
    if (audioBase64) {
      try {
        const audioData = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
        const blob = new Blob([audioData], { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        
        audio.onended = () => {
          URL.revokeObjectURL(url);
          isPlayingRef.current = false;
          playNextAudio();
        };
        
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          isPlayingRef.current = false;
          playNextAudio();
        };
        
        await audio.play();
      } catch (error) {
        console.error("Audio playback error:", error);
        isPlayingRef.current = false;
        playNextAudio();
      }
    }
  }, []);

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

  // 流式聊天请求
  const streamChat = useCallback(async (text: string) => {
    if (!activeConversationId || !token) return;

    // 清空流式内容，开始流式状态
    clearStreamingContent();
    setIsStreaming(true);
    audioQueueRef.current = [];

    let fullContent = "";
    let messageId = "";

    try {
      const response = await fetch("http://localhost:8000/v1/chat/stream", {
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
        throw new Error("Stream request failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            const eventType = line.slice(7).trim();
            continue;
          }
          
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            try {
              const data = JSON.parse(dataStr);
              
              if (data.content) {
                // 文本片段
                fullContent += data.content;
                updateStreamingContent(data.content);
              }
              
              if (data.audio_base64) {
                // 音频片段
                audioQueueRef.current.push(data.audio_base64);
                playNextAudio();
              }
              
              if (data.message_id) {
                // 完成事件
                messageId = data.message_id;
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }

      // 添加完整的 AI 消息
      if (fullContent) {
        const aiMessage: Message = {
          id: messageId || crypto.randomUUID(),
          conversationId: activeConversationId,
          role: "assistant",
          content: fullContent,
          createdAt: new Date().toISOString(),
          hasAudio: true,
        };
        addMessage(aiMessage);
      }

    } catch (error) {
      console.error("Stream chat failed:", error);
    } finally {
      setIsStreaming(false);
      clearStreamingContent();
      setIsSendingMessage(false);
    }
  }, [activeConversationId, token, updateStreamingContent, clearStreamingContent, setIsStreaming, addMessage, setIsSendingMessage, playNextAudio]);

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
          setIsSendingMessage(false);
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

        // 3. 流式调用 chat API
        await streamChat(transcribedText);

      } catch (error) {
        console.error("Failed to process voice message:", error);
        setIsSendingMessage(false);
      }
    },
    [activeConversationId, addMessage, setIsSendingMessage, streamChat]
  );

  const handleTextSend = useCallback(
    async (text: string) => {
      if (!activeConversationId) return;
      
      setIsSendingMessage(true);

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

      // 流式调用 chat API
      await streamChat(text);
    },
    [activeConversationId, addMessage, setIsSendingMessage, streamChat]
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

      {/* 紧凑输入栏 */}
      <CompactInputBar
        onTextSend={handleTextSend}
        onVoiceRecord={handleVoiceRecordingComplete}
        disabled={isSendingMessage || isStreaming}
      />
    </div>
  );
}
