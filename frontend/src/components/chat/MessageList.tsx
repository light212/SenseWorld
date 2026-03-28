"use client";

/**
 * Message list component displaying conversation messages.
 */

import { useEffect, useRef, memo } from "react";
import type React from "react";
import { User, Bot } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/config";
import type { Message } from "@/types";
import { cn, formatDate } from "@/lib/utils";
import { AudioPlayer } from "./AudioPlayer";
import { VoiceMessageBubble } from "./VoiceMessageBubble";
import { EmptyState } from "./EmptyState";

interface MessageListProps {
  messages: Message[];
  streamingContent?: string;
  isStreaming?: boolean;
  isLoading?: boolean;
  className?: string;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
}

export function MessageList({
  messages,
  streamingContent = "",
  isStreaming = false,
  isLoading = false,
  className,
  scrollContainerRef,
}: MessageListProps) {
  const prevMessageCount = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollContainerRef?.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const isNewMessage = messages.length === prevMessageCount.current + 1;
    prevMessageCount.current = messages.length;

    const scrollToBottom = (smooth: boolean) => {
      if (smooth) {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      } else {
        container.scrollTop = container.scrollHeight;
      }
    };

    // 立即滚动
    scrollToBottom(isNewMessage);

    // 监听内容高度变化（如 AudioPlayer 异步加载）
    const observer = new ResizeObserver(() => scrollToBottom(isNewMessage));
    observer.observe(content);
    // 500ms 后停止监听，避免无限触发
    const timer = setTimeout(() => observer.disconnect(), 500);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [messages, streamingContent, scrollContainerRef, isLoading]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4 bg-gray-50 min-h-full">
        {[...Array(3)].map((_, i) => (
          <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "justify-end" : ""}`}>
            {i % 2 !== 0 && <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 animate-pulse" />}
            <div className={`flex flex-col gap-1 max-w-[60%] ${i % 2 === 0 ? "items-end" : ""}`}>
              <div className="h-10 rounded-2xl bg-gray-200 animate-pulse" style={{ width: `${120 + i * 40}px` }} />
              <div className="h-3 w-12 rounded bg-gray-100 animate-pulse" />
            </div>
            {i % 2 === 0 && <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 animate-pulse" />}
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0 && !isStreaming) {
    return <EmptyState />;
  }

  return (
    <div
      ref={contentRef}
      className={cn("flex flex-col gap-4 p-4 pb-6 bg-gray-50", className)}
      role="log"
      aria-live="polite"
    >
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}

    </div>
  );
}

interface MessageItemProps {
  message: Message;
}

const MessageItem = memo(function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === "user";
  const isVoiceMessage = message.metadata?.inputType === "voice";
  // 加载状态：没有内容且没有音频
  const isLoading = !isUser && !message.content && !message.hasAudio;
  
  // Debug
  if (!isUser && message.hasAudio) {
    console.log('[MessageItem] AI voice message:', {
      id: message.id?.slice(0, 8),
      hasAudio: message.hasAudio,
      inputType: message.metadata?.inputType,
      isVoiceMessage,
      audioUrl: message.audioUrl?.slice(0, 30)
    });
  }
  
  if (isUser && message.hasAudio) {
    console.log('[MessageItem] User voice message:', {
      id: message.id?.slice(0, 8),
      hasAudio: message.hasAudio,
      inputType: message.metadata?.inputType,
      isVoiceMessage,
      audioUrl: message.audioUrl?.slice(0, 30)
    });
  }

  return (
    <div className={cn("flex items-end gap-3", isUser && "flex-row-reverse")}>
      {/* Avatar - 始终显示 */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser
            ? "bg-gradient-to-br from-red-600 to-red-800"
            : "bg-gradient-to-br from-red-500 to-red-700"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Content - 固定最大宽度 70% */}
      <div className="max-w-[70%]">
        {/* 加载状态 */}
        {isLoading ? (
          <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm inline-flex">
            <div className="flex items-center gap-[5px]">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        ) : isVoiceMessage && isUser ? (
          // 用户语音消息
          <VoiceMessageBubble
            messageId={message.id}
            duration={message.audioDuration || 0}
            audioUrl={message.audioUrl}
            isUser={isUser}
          />
        ) : isVoiceMessage && !isUser && message.hasAudio ? (
          // AI 语音消息 - 优先使用内存 URL，否则从 IndexedDB 加载
          <VoiceMessageBubble
            messageId={message.id}
            duration={message.audioDuration || 0}
            audioUrl={message.audioUrl}
            isUser={false}
          />
        ) : (
          // 文字消息
          <div
            className={cn(
              "rounded-2xl px-4 py-2.5",
              isUser
                ? "bg-gradient-to-r from-red-600 to-red-800 text-white rounded-tr-sm"
                : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm"
            )}
          >
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed break-words">{message.content}</p>
          </div>
        )}

        {/* 时间戳 - 统一在气泡下方 */}
        <div className={cn("text-xs text-gray-400 mt-1", isUser ? "text-right" : "text-left")}>
          {formatDate(message.createdAt)}
        </div>
      </div>
    </div>
  );
});
