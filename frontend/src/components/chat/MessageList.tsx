"use client";

/**
 * Message list component displaying conversation messages.
 */

import { useEffect, useRef } from "react";
import { User, Bot, MessageCircle } from "lucide-react";
import type { Message } from "@/types";
import { cn, formatDate } from "@/lib/utils";
import { AudioPlayer } from "./AudioPlayer";
import { VoiceMessageBubble } from "./VoiceMessageBubble";
import { EmptyState } from "./EmptyState";

interface MessageListProps {
  messages: Message[];
  streamingContent?: string;
  isStreaming?: boolean;
  className?: string;
}

export function MessageList({
  messages,
  streamingContent = "",
  isStreaming = false,
  className,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <EmptyState />
    );
  }

  return (
    <div 
      className={cn("flex flex-col gap-4 p-4 bg-gray-50 min-h-full", className)}
      role="log"
      aria-live="polite"
      aria-label="消息列表"
    >
      {messages.map((message, index) => (
        <MessageItem 
          key={message.id} 
          message={message}
          isNew={index === messages.length - 1}
        />
      ))}

      {/* Streaming message */}
      {isStreaming && streamingContent && (
        <div className="flex gap-3 animate-fade-in">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
            <Bot className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-md p-3 shadow-sm">
              <p className="whitespace-pre-wrap text-gray-800">{streamingContent}</p>
              <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

interface MessageItemProps {
  message: Message;
  isNew?: boolean;
}

function MessageItem({ message, isNew = false }: MessageItemProps) {
  const isUser = message.role === "user";
  
  // Bug 2: 修复语音消息判断逻辑
  // 只要是语音输入（有 inputType: "voice"），就显示为语音条
  const isVoiceMessage = message.metadata?.inputType === "voice";

  return (
    <div 
      className={cn(
        "flex gap-3", 
        isUser && "flex-row-reverse",
        isNew && "animate-slide-up"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser 
            ? "bg-gradient-to-br from-blue-500 to-purple-600" 
            : "bg-gradient-to-br from-blue-100 to-purple-100"
        )}
        aria-hidden="true"
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-blue-600" />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 max-w-[80%]", isUser && "text-right")}>
        {/* 语音消息样式 - 用户语音显示语音条 */}
        {isVoiceMessage && isUser ? (
          <VoiceMessageBubble
            duration={message.audioDuration || 0}
            audioBlob={message.metadata?.audioBlob}
            audioUrl={message.metadata?.audioBlob ? undefined : `http://localhost:8000/v1/audio/${message.id}`}
            isUser={isUser}
            transcription={message.content}
          />
        ) : (
          /* 普通文字消息 - 亮色主题 */
          <div
            className={cn(
              "inline-block rounded-2xl px-4 py-2.5",
              isUser 
                ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-tr-md" 
                : "bg-white border border-gray-200 text-gray-800 rounded-tl-md shadow-sm"
            )}
          >
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.content}</p>

            {/* Audio player for AI voice messages */}
            {message.hasAudio && !isUser && (
              <AudioPlayer
                src={`http://localhost:8000/v1/audio/${message.id}`}
                className="mt-2"
              />
            )}
          </div>
        )}

        <div
          className={cn(
            "text-xs text-gray-400 mt-1",
            isUser ? "text-right" : "text-left"
          )}
        >
          {formatDate(message.createdAt)}
        </div>
      </div>
    </div>
  );
}
