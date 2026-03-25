"use client";

/**
 * Message list component displaying conversation messages.
 */

import { useEffect, useRef } from "react";
import type { Message } from "@/types";
import { cn, formatDate } from "@/lib/utils";
import { AudioPlayer } from "./AudioPlayer";
import { VoiceMessageBubble } from "./VoiceMessageBubble";

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
      <div
        className={cn(
          "flex flex-col items-center justify-center h-full text-gray-400",
          className
        )}
      >
        <svg
          className="w-16 h-16 mb-4 opacity-50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <p>开始对话</p>
        <p className="text-sm mt-1">点击麦克风按钮或输入文字</p>
      </div>
    );
  }

  return (
    <div 
      className={cn("flex flex-col gap-4 p-4", className)}
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
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-primary-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <div className="bg-gray-100 rounded-lg p-3">
              <p className="whitespace-pre-wrap">{streamingContent}</p>
              <span className="inline-block w-2 h-4 bg-primary-500 animate-pulse ml-1" />
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
  const isVoiceMessage = message.metadata?.inputType === "voice" && message.hasAudio;

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
          isUser ? "bg-primary-600" : "bg-primary-100"
        )}
        aria-hidden="true"
      >
        {isUser ? (
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        ) : (
          <svg
            className="w-4 h-4 text-primary-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 max-w-[80%]", isUser && "text-right")}>
        {/* 语音消息样式 */}
        {isVoiceMessage ? (
          <VoiceMessageBubble
            duration={message.audioDuration || 0}
            audioBlob={message.metadata?.audioBlob}
            audioUrl={message.metadata?.audioBlob ? undefined : `http://localhost:8000/v1/audio/${message.id}`}
            isUser={isUser}
            transcription={message.content}
          />
        ) : (
          /* 普通文字消息 */
          <div
            className={cn(
              "inline-block rounded-lg p-3",
              isUser ? "bg-primary-600 text-white" : "bg-gray-100"
            )}
          >
            <p className="whitespace-pre-wrap">{message.content}</p>

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
            "text-xs text-gray-500 mt-1",
            isUser ? "text-right" : "text-left"
          )}
        >
          {formatDate(message.createdAt)}
          {message.metadata?.inputType === "voice" && !isVoiceMessage && (
            <span className="ml-2" aria-label="语音消息">🎤</span>
          )}
        </div>
      </div>
    </div>
  );
}
