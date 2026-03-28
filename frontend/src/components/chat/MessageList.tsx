"use client";

/**
 * Message list component displaying conversation messages.
 */

import { useEffect, useRef, memo } from "react";
import type React from "react";
import { User, Bot } from "lucide-react";
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

      {/* Streaming message */}
      {isStreaming && (
        <div className="flex gap-3">
          {/* AI Avatar - 左侧固定 */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          
          {/* 消息内容 */}
          <div className="flex-1 max-w-[70%]">
            {streamingContent ? (
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm p-3 shadow-sm">
                <p className="whitespace-pre-wrap text-gray-800 text-[15px] leading-relaxed">{streamingContent}</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-sm text-gray-400">正在思考</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

interface MessageItemProps {
  message: Message;
}

const MessageItem = memo(function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === "user";
  const isVoiceMessage = message.metadata?.inputType === "voice";

  return (
    <div className={cn("flex items-end gap-3", isUser && "flex-row-reverse")}>
      {/* Avatar - 始终显示 */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser 
            ? "bg-gradient-to-br from-blue-500 to-purple-600" 
            : "bg-gradient-to-br from-blue-500 to-purple-500"
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
        {/* 消息气泡 */}
        {isVoiceMessage && isUser ? (
          <VoiceMessageBubble
            messageId={message.id}
            duration={message.audioDuration || 0}
            isUser={isUser}
          />
        ) : (
          <div
            className={cn(
              "rounded-2xl px-4 py-2.5",
              isUser 
                ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-tr-sm" 
                : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"
            )}
          >
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed break-words">{message.content}</p>

            {/* AI 语音播放器 */}
            {message.hasAudio && !isUser && (
              <AudioPlayer 
                messageId={message.id} 
                fallbackSrc={`http://localhost:8000/v1/audio/${message.id}`}
                className="mt-2" 
              />
            )}
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
