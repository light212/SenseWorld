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
            <Bot className="w-4 h-4 text-primary-600" />
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
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-primary-600" />
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
