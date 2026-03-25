"use client";

/**
 * Voice input component with recording visualization.
 */

import { useCallback, useState } from "react";
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

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* Recording visualization */}
      {isRecording && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div
            className="w-3 h-3 rounded-full bg-red-500 animate-pulse"
            style={{
              transform: `scale(${1 + audioLevel * 0.5})`,
            }}
          />
          <span>录音中 {formatDuration(duration)}</span>
        </div>
      )}

      {/* Audio level bars */}
      {isRecording && (
        <div className="flex items-end gap-1 h-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="w-1 bg-primary-500 rounded-full transition-all duration-75"
              style={{
                height: `${Math.max(4, audioLevel * 32 * (0.5 + Math.random() * 0.5))}px`,
              }}
            />
          ))}
        </div>
      )}

      {/* Edit transcription */}
      {isEditing && transcribedText && (
        <div className="w-full">
          <textarea
            value={transcribedText}
            onChange={(e) => setTranscribedText(e.target.value)}
            className="w-full p-2 border rounded-lg resize-none"
            rows={2}
            placeholder="编辑转写文本..."
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleEditSubmit}
              className="px-4 py-1 bg-primary-600 text-white rounded-lg text-sm"
            >
              发送
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-1 border rounded-lg text-sm"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Main controls */}
      <div className="flex items-center gap-4">
        {isRecording && (
          <button
            onClick={handleCancel}
            className="p-2 text-gray-500 hover:text-gray-700"
            title="取消录音"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        <button
          onClick={handleMicClick}
          disabled={disabled}
          className={cn(
            "p-4 rounded-full transition-all",
            isRecording
              ? "bg-red-500 text-white hover:bg-red-600"
              : "bg-primary-500 text-white hover:bg-primary-600",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          title={isRecording ? "停止录音" : "开始录音"}
        >
          {isRecording ? (
            <svg
              className="w-6 h-6"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
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
