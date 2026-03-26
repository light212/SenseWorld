"use client";

/**
 * Text input component as alternative to voice input.
 */

import { useState, useCallback, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

interface TextInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function TextInput({
  onSend,
  disabled = false,
  placeholder = "输入消息...",
  className,
}: TextInputProps) {
  const [text, setText] = useState("");

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setText("");
    }
  }, [text, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className={cn("flex items-end gap-2", className)}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        rows={1}
        className={cn(
          "flex-1 p-3 border rounded-lg resize-none",
          "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
          disabled && "bg-gray-100 cursor-not-allowed"
        )}
        style={{ maxHeight: "120px" }}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        className={cn(
          "p-3 rounded-lg transition-colors",
          text.trim() && !disabled
            ? "bg-primary-500 text-white hover:bg-primary-600"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
        )}
        title="发送"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
          />
        </svg>
      </button>
    </div>
  );
}
