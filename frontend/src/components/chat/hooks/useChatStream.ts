"use client";

/**
 * 流式聊天 Hook
 * 处理 SSE 流式响应、音频播放、消息发送和取消
 */

import { useCallback, useRef } from "react";
import { useConversationStore } from "@/stores/conversationStore";
import { saveAudio, createAudioUrl } from "@/lib/audio-cache";
import { audioEngine } from "@/lib/audio-engine";
import { logError, logWarning } from "@/lib/error-tracking";
import { API_ENDPOINTS } from "@/lib/config";
import type { Message } from "@/types";

export interface UseChatStreamOptions {
  /** 当前会话 ID */
  conversationId: string | null;
  /** 认证 token */
  token: string | null;
  /** 消息发送前的回调，返回消息 ID */
  onBeforeSend?: (content: string, inputType: "text" | "voice") => string;
  /** 消息更新回调 */
  onMessageUpdate?: (messageId: string, updates: Partial<Message>) => void;
}

export interface UseChatStreamReturn {
  /** 流式内容（实时累积） */
  streamingContent: string;
  /** 是否正在流式传输 */
  isStreaming: boolean;
  /** 发送消息 */
  sendMessage: (content: string, inputType: "text" | "voice", messageId?: string, audioDuration?: number) => Promise<void>;
  /** 中止当前流式请求 */
  abortStream: () => void;
}

/**
 * 流式聊天 Hook
 */
export function useChatStream(options: UseChatStreamOptions): UseChatStreamReturn {
  const { conversationId, token, onBeforeSend, onMessageUpdate } = options;

  // Store selectors
  const streamingContent = useConversationStore((s) => s.streamingContent);
  const isStreaming = useConversationStore((s) => s.isStreaming);
  const addMessage = useConversationStore((s) => s.addMessage);
  const setIsStreaming = useConversationStore((s) => s.setIsStreaming);
  const setStreamingInputType = useConversationStore((s) => s.setStreamingInputType);
  const updateMessage = useConversationStore((s) => s.updateMessage);
  const setIsSendingMessage = useConversationStore((s) => s.setIsSendingMessage);

  // Refs
  const streamAbortRef = useRef<AbortController | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const audioChunksForSaveRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const tokenRef = useRef(token);
  const conversationIdRef = useRef(conversationId);

  // 同步 refs
  tokenRef.current = token;
  conversationIdRef.current = conversationId;

  // 播放下一个音频
  const playNextAudio = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;

    isPlayingRef.current = true;
    const audioBase64 = audioQueueRef.current.shift();

    if (audioBase64) {
      try {
        const audioData = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
        await audioEngine.playAudio(audioData.buffer);

        isPlayingRef.current = false;
        setTimeout(() => playNextAudio(), 100);
      } catch (error) {
        console.error("专业音频引擎播放失败:", error);
        isPlayingRef.current = false;
        playNextAudio();
      }
    }
  }, []);

  // 停止音频播放
  const stopAudio = useCallback(() => {
    audioEngine.stop();
    isPlayingRef.current = false;
    audioQueueRef.current = [];
  }, []);

  // 中止流式请求
  const abortStream = useCallback(() => {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    stopAudio();
    setIsStreaming(false);
    setIsSendingMessage(false);
  }, [stopAudio, setIsStreaming, setIsSendingMessage]);

  // 流式聊天
  const sendMessage = useCallback(
    async (content: string, inputType: "text" | "voice", messageId?: string, audioDuration?: number) => {
      const currentToken = tokenRef.current;
      const currentConvId = conversationIdRef.current;

      if (!currentConvId || !currentToken) {
        return;
      }

      // 取消上一个进行中的流式请求
      streamAbortRef.current?.abort();
      const abortController = new AbortController();
      streamAbortRef.current = abortController;

      // 生成消息 ID
      const finalMessageId = onBeforeSend?.(content, inputType) ?? crypto.randomUUID();

      // 创建占位消息
      const placeholderMessage: Message = {
        id: finalMessageId,
        conversationId: currentConvId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        hasAudio: false,
        metadata: { inputType },
      };
      addMessage(placeholderMessage);

      // 设置流式状态
      setStreamingInputType(inputType);
      setIsStreaming(true);
      audioQueueRef.current = [];
      audioChunksForSaveRef.current = [];

      let fullContent = "";
      let aiMessageId = "";
      let hasReceivedFirstAudio = false;

      try {
        const response = await fetch(API_ENDPOINTS.chatStream, {
          method: "POST",
          signal: abortController.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify({
            conversation_id: currentConvId,
            content,
            input_type: inputType,
            message_id: finalMessageId,  // AI 消息 ID
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
                  // 文字模式实时更新占位消息内容；语音模式不显示流式文字，避免闪烁
                  if (inputType === "text") {
                    const updates = { content: fullContent };
                    updateMessage(finalMessageId, updates);
                    onMessageUpdate?.(finalMessageId, updates);
                  }
                  // 语音模式下，只有当收到第一个音频时才更新消息内容
                  if (inputType === "voice" && hasReceivedFirstAudio) {
                    const updates = { content: fullContent };
                    updateMessage(finalMessageId, updates);
                    onMessageUpdate?.(finalMessageId, updates);
                  }
                }

                if (data.audio_base64) {
                  audioQueueRef.current.push(data.audio_base64);
                  audioChunksForSaveRef.current.push(data.audio_base64);

                  if (!hasReceivedFirstAudio) {
                    hasReceivedFirstAudio = true;
                    const updates = { content: fullContent, metadata: { inputType: "voice" as const } };
                    updateMessage(finalMessageId, updates);
                    onMessageUpdate?.(finalMessageId, updates);
                  }

                  if (!isPlayingRef.current) {
                    playNextAudio();
                  }
                }

                if (data.message_id) {
                  aiMessageId = data.message_id;
                }
              } catch (e) {
                logWarning("SSE消息解析失败", "network", {
                  error: (e as Error).message,
                  dataLength: dataStr.length,
                });
              }
            }
          }
        }

        // 保存音频到本地缓存（异步，不阻塞 UI）
        const hasAudioChunks = audioChunksForSaveRef.current.length > 0;
        let inMemoryAudioUrl: string | undefined;
        
        if (hasAudioChunks) {
          inMemoryAudioUrl = createAudioUrl(audioChunksForSaveRef.current);
          saveAudio(finalMessageId, audioChunksForSaveRef.current).catch(console.error);
          audioChunksForSaveRef.current = [];
        }

        // 更新占位消息为完整内容
        const finalUpdates: Partial<Message> = {
          content: fullContent,
          hasAudio: hasAudioChunks,
          audioUrl: inMemoryAudioUrl,
        };
        updateMessage(finalMessageId, finalUpdates);
        onMessageUpdate?.(finalMessageId, finalUpdates);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          logError(
            "流式聊天失败",
            "network",
            "high",
            {
              error: (error as Error).message,
              conversationId: currentConvId,
              inputType,
            },
            error as Error
          );
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsStreaming(false);
          setIsSendingMessage(false);
        }
      }
    },
    [addMessage, setIsStreaming, setStreamingInputType, updateMessage, setIsSendingMessage, playNextAudio, onBeforeSend, onMessageUpdate]
  );

  return {
    streamingContent,
    isStreaming,
    sendMessage,
    abortStream,
  };
}