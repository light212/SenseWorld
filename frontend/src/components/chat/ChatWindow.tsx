"use client";

/**
 * Main chat window component integrating all chat functionality.
 * 支持流式 LLM 响应 + 分段 TTS
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, PhoneOff } from "lucide-react";
import { MessageList } from "./MessageList";
import { CompactInputBar } from "./CompactInputBar";
import { useConversationStore } from "@/stores/conversationStore";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";
import { saveAudio, cleanupOldAudio } from "@/lib/audio-cache";
import { OmniClient } from "@/lib/omni-client";
import { useToast } from "@/components/ui/Toast";
import type { Message } from "@/types";

interface ChatWindowProps {
  conversationId?: string;
  className?: string;
}

export function ChatWindow({ conversationId, className }: ChatWindowProps) {
  // 分开 selector 避免不必要的重渲染
  const currentConversationId = useConversationStore((s) => s.currentConversationId);
  const messages = useConversationStore((s) => s.messages);
  const streamingContent = useConversationStore((s) => s.streamingContent);
  const isStreaming = useConversationStore((s) => s.isStreaming);
  const isLoadingMessages = useConversationStore((s) => s.isLoadingMessages);
  const isSendingMessage = useConversationStore((s) => s.isSendingMessage);
  const addMessage = useConversationStore((s) => s.addMessage);
  const setMessages = useConversationStore((s) => s.setMessages);
  const setIsSendingMessage = useConversationStore((s) => s.setIsSendingMessage);
  const setIsLoadingMessages = useConversationStore((s) => s.setIsLoadingMessages);
  const updateStreamingContent = useConversationStore((s) => s.updateStreamingContent);
  const clearStreamingContent = useConversationStore((s) => s.clearStreamingContent);
  const setIsStreaming = useConversationStore((s) => s.setIsStreaming);

  const token = useAuthStore((s) => s.token);
  const toast = useToast();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 视频通话状态
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const omniClientRef = useRef<OmniClient | null>(null);
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const audioQueueRef = useRef<string[]>([]);
  const audioChunksForSaveRef = useRef<string[]>([]); // 用于保存到缓存的音频
  const isPlayingRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null); // Bug 1: 跟踪当前音频
  const messagesCacheRef = useRef<Map<string, Message[]>>(new Map()); // 会话消息缓存
  const loadAbortRef = useRef<AbortController | null>(null); // 取消上一个消息加载请求

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

  // 加载历史消息 - 当会话变化时重新加载（带缓存优化）
  useEffect(() => {
    if (!token || !activeConversationId) return;
    
    // Bug 1: 停止当前音频
    stopCurrentAudio();

    // 取消上一个未完成的请求
    loadAbortRef.current?.abort();
    loadAbortRef.current = new AbortController();
    const abortSignal = loadAbortRef.current.signal;

    // 如有缓存直接用，否则清空并显示骨架屏
    const cached = messagesCacheRef.current.get(activeConversationId);
    if (cached) {
      setMessages(cached);
      setIsLoadingMessages(false);
    } else {
      setMessages([]);
      setIsLoadingMessages(true);
    }

    const loadMessages = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/v1/conversations/${activeConversationId}/messages`,
          { headers: { Authorization: `Bearer ${token}` }, signal: abortSignal }
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
              audioDuration: m.extra_data?.audio_duration || m.audio_duration,
              metadata: m.extra_data ? {
                inputType: m.extra_data.input_type,
              } : undefined,
            }));
            // 更新缓存和 UI
            messagesCacheRef.current.set(activeConversationId, loadedMessages);
            setMessages(loadedMessages);
          } else {
            // 空会话也缓存
            messagesCacheRef.current.set(activeConversationId, []);
            setMessages([]);
          }
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Failed to load messages:", error);
        }
      } finally {
        if (!abortSignal.aborted) {
          setIsLoadingMessages(false);
        }
      }
    };
    loadMessages();
  }, [activeConversationId, token, setMessages, stopCurrentAudio, setIsLoadingMessages]);

  // 流式聊天请求
  const streamChat = useCallback(async (text: string, inputType: "text" | "voice" = "text", messageId?: string, audioDuration?: number) => {
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
    let aiMessageId = "";

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
          input_type: inputType,
          message_id: messageId,
          audio_duration: audioDuration,
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
                aiMessageId = data.message_id;
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
        const finalMessageId = aiMessageId || crypto.randomUUID();
        
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
        const messageId = crypto.randomUUID();
        
        // 保存用户语音到 IndexedDB
        const { saveUserAudioBlob } = await import("@/lib/audio-cache");
        await saveUserAudioBlob(messageId, blob);

        const userMessage: Message = {
          id: messageId,
          conversationId: activeConversationId,
          role: "user",
          content: confirmedText,
          createdAt: new Date().toISOString(),
          hasAudio: true,
          audioDuration: duration,
          metadata: { 
            inputType: "voice",
          },
        };
        addMessage(userMessage);

        // 流式调用 chat API（语音输入，带 messageId 和 duration 保证一致）
        await streamChat(confirmedText, "voice", messageId, duration);

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

      const messageId = crypto.randomUUID();
      
      // Add user message to UI immediately
      const userMessage: Message = {
        id: messageId,
        conversationId: activeConversationId,
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
        hasAudio: false,
        metadata: { inputType: "text" },
      };
      addMessage(userMessage);

      // 流式调用 chat API（文本输入）
      await streamChat(text, "text", messageId);
    },
    [activeConversationId, addMessage, setIsSendingMessage, streamChat]
  );

  const handleVideoCallToggle = useCallback(async () => {
    if (isVideoCallActive) {
      // 挂断
      omniClientRef.current?.disconnect();
      omniClientRef.current = null;
      setIsVideoCallActive(false);
      setIsAiSpeaking(false);
      return;
    }

    // 开始视频通话
    if (!token) return;
    const wsUrl = `ws://${window.location.hostname}:8000/ws/omni`;
    const client = new OmniClient({
      wsUrl,
      token,
      onEvent: (event) => {
        if (event.type === 'omni_event') {
          const payload = event.payload as Record<string, unknown>;
          // AI 开始/停止说话检测
          if (payload.type === 'response.audio.delta') setIsAiSpeaking(true);
          if (payload.type === 'response.audio.done' || payload.type === 'response.done') setIsAiSpeaking(false);
        }
        if (event.type === 'omni_closed' || event.type === 'omni_error') {
          omniClientRef.current?.stopCamera();
          setIsVideoCallActive(false);
          setIsAiSpeaking(false);
        }
      },
      onError: () => {
        toast.error('视频通话连接失败');
        setIsVideoCallActive(false);
      },
      onClose: () => {
        setIsVideoCallActive(false);
        setIsAiSpeaking(false);
      },
    });

    try {
      await client.connect();
      await client.startRecording();
      if (videoElementRef.current) {
        await client.startCamera(videoElementRef.current);
      }
      omniClientRef.current = client;
      setIsVideoCallActive(true);
    } catch (err) {
      client.disconnect();
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('NotFound')) {
        toast.error('需要摄像头和麦克风权限才能使用视频通话');
      } else {
        toast.error('视频通话启动失败，请重试');
      }
    }
  }, [isVideoCallActive, token, toast]);

  // 切换 conversation 时自动挂断
  useEffect(() => {
    if (!isVideoCallActive) return;
    omniClientRef.current?.disconnect();
    omniClientRef.current = null;
    setIsVideoCallActive(false);
    setIsAiSpeaking(false);
  }, [currentConversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* 视频通话面板：video 元素始终渲染（挂 ref），面板在激活时显示 */}
      <div className={isVideoCallActive ? "flex items-center gap-4 p-3 bg-gray-900 border-b border-gray-700" : "hidden"}>
        <video
          ref={videoElementRef}
          autoPlay
          muted
          playsInline
          className="w-40 h-30 rounded-lg object-cover bg-gray-800"
        />
          <div className="flex flex-col items-center gap-2">
            <div className={cn(
              "w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center",
              isAiSpeaking && "animate-pulse"
            )}>
              <Bot className="w-8 h-8 text-white" />
            </div>
            {isAiSpeaking && (
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>
          <button
            onClick={handleVideoCallToggle}
            className="ml-auto p-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
            title="挂断"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
      </div>

      {/* Messages area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0 bg-gray-50">
        <MessageList
          messages={messages}
          streamingContent={streamingContent}
          isStreaming={isStreaming}
          isLoading={isLoadingMessages}
          scrollContainerRef={scrollContainerRef}
        />
      </div>

      {/* 紧凑输入栏 */}
      <CompactInputBar
        onTextSend={handleTextSend}
        onVoiceRecord={handleVoiceRecordingComplete}
        onVideoCallToggle={handleVideoCallToggle}
        isVideoCallActive={isVideoCallActive}
        disabled={isSendingMessage || isStreaming}
      />
    </div>
  );
}
