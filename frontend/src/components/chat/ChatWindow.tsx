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
import { saveAudio, cleanupOldAudio } from "@/lib/audio-cache";
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
  const audioChunksForSaveRef = useRef<string[]>([]); // 用于保存到缓存的音频
  const isPlayingRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null); // Bug 1: 跟踪当前音频

  // 使用传入的 conversationId 或 store 中的
  const activeConversationId = conversationId || currentConversationId;

  // 启动时清理过期音频
  useEffect(() => {
    cleanupOldAudio().catch(console.error);
  }, []);

  // Bug 1: 停止当前播放的音频
  const stopCurrentAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    isPlayingRef.current = false;
    audioQueueRef.current = [];
  }, []);

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
        
        // Bug 1: 保存当前音频引用
        currentAudioRef.current = audio;
        
        audio.onended = () => {
          URL.revokeObjectURL(url);
          currentAudioRef.current = null;
          isPlayingRef.current = false;
          playNextAudio();
        };
        
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          currentAudioRef.current = null;
          isPlayingRef.current = false;
          playNextAudio();
        };
        
        await audio.play();
      } catch (error) {
        console.error("Audio playback error:", error);
        currentAudioRef.current = null;
        isPlayingRef.current = false;
        playNextAudio();
      }
    }
  }, []);

  // Bug 1: 切换会话时停止音频
  useEffect(() => {
    return () => {
      stopCurrentAudio();
    };
  }, [activeConversationId, stopCurrentAudio]);

  // 加载历史消息 - 当会话变化时重新加载
  useEffect(() => {
    if (!token || !activeConversationId) return;
    
    // Bug 1: 停止当前音频
    stopCurrentAudio();
    
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
  }, [activeConversationId, token, setMessages, stopCurrentAudio]);

  // 流式聊天请求
  const streamChat = useCallback(async (text: string) => {
    if (!activeConversationId || !token) {
      return;
    }

    // 清空流式内容，开始流式状态
    clearStreamingContent();
    setIsStreaming(true);
    // 确保状态同步（React 18 会批处理，这里强制触发）
    await new Promise(resolve => setTimeout(resolve, 0));
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

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            continue;
          }
          
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            try {
              const data = JSON.parse(dataStr);
              
              if (data.content) {
                fullContent += data.content;
                updateStreamingContent(data.content);
              }
              
              if (data.audio_base64) {
                console.log("[Audio] received audio chunk, length:", data.audio_base64.length);
                audioQueueRef.current.push(data.audio_base64);
                audioChunksForSaveRef.current.push(data.audio_base64); // 保存用于缓存
                playNextAudio();
              }
              
              if (data.message_id) {
                messageId = data.message_id;
              }
            } catch (e) {
              // 忽略解析错误
              console.warn("[SSE] parse error:", e);
            }
          }
        }
      }

      // 添加完整的 AI 消息
      if (fullContent) {
        const finalMessageId = messageId || crypto.randomUUID();
        
        // 保存音频到本地缓存
        if (audioChunksForSaveRef.current.length > 0) {
          saveAudio(finalMessageId, audioChunksForSaveRef.current).catch(console.error);
          audioChunksForSaveRef.current = []; // 清空
        }
        
        const aiMessage: Message = {
          id: finalMessageId,
          conversationId: activeConversationId,
          role: "assistant",
          content: fullContent,
          createdAt: new Date().toISOString(),
          hasAudio: audioChunksForSaveRef.current.length > 0 || true, // 有音频标记
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
    async (blob: Blob, duration: number, confirmedText: string) => {
      if (!activeConversationId) return;
      
      setIsSendingMessage(true);

      try {
        // Bug 2: 确保语音消息有正确的 metadata
        const userMessage: Message = {
          id: crypto.randomUUID(),
          conversationId: activeConversationId,
          role: "user",
          content: confirmedText,
          createdAt: new Date().toISOString(),
          hasAudio: true,
          audioDuration: duration,
          metadata: { 
            inputType: "voice",
            audioBlob: blob,
          },
        };
        addMessage(userMessage);

        // 流式调用 chat API
        await streamChat(confirmedText);

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
