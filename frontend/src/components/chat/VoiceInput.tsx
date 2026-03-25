"use client";

/**
 * Voice input component with recording visualization.
 */

import { useCallback, useState, useEffect, useRef } from "react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { cn, formatDuration } from "@/lib/utils";

interface VoiceInputProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  onTranscriptionReceived?: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceInput({
  onRecordingComplete,
  onTranscriptionReceived,
  disabled = false,
  className,
}: VoiceInputProps) {
  const [transcribedText, setTranscribedText] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const {
    isRecording,
    isPaused,
    duration,
    audioLevel,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceRecorder({
    onRecordingComplete: (blob, dur) => {
      onRecordingComplete(blob, dur);
    },
    onError: (error) => {
      console.error("Recording error:", error);
      alert("无法访问麦克风，请检查浏览器权限设置");
    },
  });

  const handleMicClick = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleCancel = useCallback(() => {
    cancelRecording();
    setTranscribedText("");
    setIsEditing(false);
  }, [cancelRecording]);

  const handleEditSubmit = useCallback(() => {
    if (transcribedText.trim()) {
      onTranscriptionReceived?.(transcribedText.trim());
      setTranscribedText("");
      setIsEditing(false);
    }
  }, [transcribedText, onTranscriptionReceived]);

  // 键盘支持：空格键触发录音
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 只在焦点在组件上时响应
      if (!buttonRef.current?.contains(document.activeElement)) return;
      
      if (e.code === "Space" && !disabled) {
        e.preventDefault();
        if (isRecording) {
          stopRecording();
        } else {
          startRecording();
        }
      } else if (e.code === "Escape" && isRecording) {
        handleCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [disabled, isRecording, startRecording, stopRecording, handleCancel]);

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      {/* Recording visualization */}
      {isRecording && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div
            className="w-3 h-3 rounded-full bg-red-500 animate-pulse"
            style={{
              transform: `scale(${1 + audioLevel * 0.5})`,
            }}
            aria-hidden="true"
          />
          <span>{formatDuration(duration)}</span>
        </div>
      )}

      {/* Audio level bars */}
      {isRecording && (
        <div className="flex items-end gap-1 h-6" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="w-1 bg-primary-500 rounded-full transition-all duration-75"
              style={{
                height: `${Math.max(4, audioLevel * 24 * (0.5 + Math.random() * 0.5))}px`,
              }}
            />
          ))}
        </div>
      )}

      {/* Main controls */}
      <div className="flex items-center gap-3">
        {isRecording && (
          <button
            onClick={handleCancel}
            className="p-2 text-gray-400 hover:text-gray-600 text-sm"
            title="取消录音 (Esc)"
            aria-label="取消录音"
          >
            取消
          </button>
        )}

        <button
          ref={buttonRef}
          onClick={handleMicClick}
          disabled={disabled}
          className={cn(
            "p-3 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-primary-300",
            isRecording
              ? "bg-red-500 text-white hover:bg-red-600"
              : "bg-primary-600 text-white hover:bg-primary-700",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          title={isRecording ? "停止录音" : "开始录音"}
          aria-label={isRecording ? "停止录音" : "开始录音"}
          aria-pressed={isRecording}
        >
          {isRecording ? (
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
