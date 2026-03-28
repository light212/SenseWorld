/**
 * 消息加载和缓存 Hook
 * 提取自 ChatWindow.tsx，负责：
 * - 消息缓存管理
 * - 会话切换时的消息加载
 * - 请求取消和竞态处理
 */

import { useCallback, useEffect, useRef } from "react";
import { useConversationStore } from "@/stores/conversationStore";
import { API_ENDPOINTS } from "@/lib/config";
import type { Message } from "@/types";

/**
 * useMessages hook 返回值接口
 */
export interface UseMessagesReturn {
  /** 当前消息列表 */
  messages: Message[];
  /** 是否正在加载消息 */
  isLoading: boolean;
  /** 手动加载指定会话的消息 */
  loadMessages: (conversationId: string) => Promise<void>;
  /** 清除缓存（可选指定会话，不传则清除全部） */
  clearCache: (conversationId?: string) => void;
}

/**
 * 消息加载和缓存 Hook
 * @param activeConversationId 当前活跃的会话 ID
 * @param token 认证 token (可以是 null)
 * @returns UseMessagesReturn
 */
export function useMessages(
  activeConversationId: string | undefined,
  token: string | null | undefined
): UseMessagesReturn {
  // Store selectors - 分开 selector 避免不必要的重渲染
  const messages = useConversationStore((s) => s.messages);
  const isLoadingMessages = useConversationStore((s) => s.isLoadingMessages);
  const setMessages = useConversationStore((s) => s.setMessages);
  const setIsLoadingMessages = useConversationStore((s) => s.setIsLoadingMessages);

  // 会话消息缓存 - Map<conversationId, Message[]>
  const messagesCacheRef = useRef<Map<string, Message[]>>(new Map());
  
  // 取消上一个消息加载请求
  const loadAbortRef = useRef<AbortController | null>(null);

  // Token ref - 保持最新值
  const tokenRef = useRef(token);
  tokenRef.current = token;

  /**
   * 清除消息缓存
   * @param conversationId 可选，不传则清除全部缓存
   */
  const clearCache = useCallback((conversationId?: string) => {
    if (conversationId) {
      messagesCacheRef.current.delete(conversationId);
    } else {
      messagesCacheRef.current.clear();
    }
  }, []);

  /**
   * 加载指定会话的消息
   * @param conversationId 会话 ID
   */
  const loadMessages = useCallback(
    async (conversationId: string) => {
      // 取消上一个未完成的请求
      loadAbortRef.current?.abort();
      const controller = new AbortController();
      loadAbortRef.current = controller;
      const abortSignal = controller.signal;

      // 如有缓存直接用，否则清空并显示骨架屏
      const cached = messagesCacheRef.current.get(conversationId);
      if (cached) {
        setMessages(cached);
        setIsLoadingMessages(false);
      } else {
        setMessages([]);
        setIsLoadingMessages(true);
      }

      try {
        const response = await fetch(
          API_ENDPOINTS.conversationMessages(conversationId),
          {
            headers: { Authorization: `Bearer ${tokenRef.current}` },
            signal: abortSignal,
          }
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
              metadata: m.extra_data
                ? {
                    inputType: m.extra_data.input_type,
                  }
                : undefined,
            }));
            // 更新缓存和 UI
            messagesCacheRef.current.set(conversationId, loadedMessages);
            setMessages(loadedMessages);
          } else {
            // 空会话也缓存
            messagesCacheRef.current.set(conversationId, []);
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
    },
    [setMessages, setIsLoadingMessages]
  );

  // 会话变化时自动加载消息
  useEffect(() => {
    if (!activeConversationId) return;

    // 取消上一个未完成的请求，立即创建新的 controller
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;
    const abortSignal = controller.signal;

    // 如有缓存直接用，否则清空并显示骨架屏
    const cached = messagesCacheRef.current.get(activeConversationId);
    if (cached) {
      setMessages(cached);
      setIsLoadingMessages(false);
    } else {
      setMessages([]);
      setIsLoadingMessages(true);
    }

    const doLoad = async () => {
      try {
        const response = await fetch(
          API_ENDPOINTS.conversationMessages(activeConversationId),
          { headers: { Authorization: `Bearer ${tokenRef.current}` }, signal: abortSignal }
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
    doLoad();
  }, [activeConversationId, setMessages, setIsLoadingMessages]);

  return {
    messages,
    isLoading: isLoadingMessages,
    loadMessages,
    clearCache,
  };
}