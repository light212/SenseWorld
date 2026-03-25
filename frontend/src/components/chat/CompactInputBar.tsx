"use client";

/**
 * 紧凑输入栏 - 多模态输入（语音优先）
 * 
 * 设计：
 * [+] │ 输入消息... │ [📹] [🎤] 或 [➤]    ← 48px 高度
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Send, Video, Plus, X, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompactInputBarProps {
  onTextSend: (text: string) => void;
  onVoiceRecord: (blob: Blob, duration: number) => void;
  onVideoSelect?: (file: File) => void;
  disabled?: boolean;
}

export function CompactInputBar({
  onTextSend,
  onVoiceRecord,
  onVideoSelect,
  disabled = false,
}: CompactInputBarProps) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 清理
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // 开始录音
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start();
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 100);
    } catch (error) {
      console.error("Failed to start recording:", error);
      alert("无法访问麦克风");
    }
  }, []);

  // 停止录音
  const stopRecording = useCallback((send: boolean = true) => {
    if (!mediaRecorderRef.current) return;

    const recorder = mediaRecorderRef.current;
    recorder.stop();
    recorder.stream.getTracks().forEach(t => t.stop());

    const duration = Date.now() - startTimeRef.current;

    recorder.onstop = () => {
      if (send && chunksRef.current.length > 0) {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        onVoiceRecord(blob, duration);
      }
      chunksRef.current = [];
    };

    setIsRecording(false);
    setRecordingDuration(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [onVoiceRecord]);

  // 发送文字
  const handleSend = () => {
    if (text.trim()) {
      onTextSend(text.trim());
      setText("");
    }
  };

  // 选择视频
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onVideoSelect) {
      onVideoSelect(file);
    }
  };

  // Enter 发送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 格式化时长
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // 录音中状态
  if (isRecording) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border-t border-gray-200">
        <button
          onClick={() => stopRecording(false)}
          className="p-1.5 text-gray-500 hover:text-gray-700"
          aria-label="取消录音"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex-1 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm text-gray-700">录音中</span>
          <span className="text-sm font-mono text-gray-900">
            {formatDuration(recordingDuration)}
          </span>
        </div>
        
        <button
          onClick={() => stopRecording(true)}
          className="px-4 py-1.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
        >
          发送
        </button>
      </div>
    );
  }

  // 正常输入状态 - 亮色主题
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-200 bg-white">
      {/* 更多按钮 */}
      <button
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        title="更多"
        aria-label="更多操作"
      >
        <Plus className="w-5 h-5" />
      </button>

      {/* 输入框 */}
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="输入消息..."
        className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      />

      {/* 视频按钮（预留） */}
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        onChange={handleVideoSelect}
        className="hidden"
      />
      <button
        onClick={() => videoInputRef.current?.click()}
        disabled={disabled || !onVideoSelect}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
        title="发送视频"
        aria-label="发送视频"
      >
        <Video className="w-5 h-5" />
      </button>

      {/* 语音/发送按钮 */}
      {text.trim() ? (
        <button
          onClick={handleSend}
          disabled={disabled}
          className="p-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
          title="发送"
          aria-label="发送消息"
        >
          <Send className="w-5 h-5" />
        </button>
      ) : (
        <button
          onClick={startRecording}
          disabled={disabled}
          className="p-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
          title="语音输入"
          aria-label="开始录音"
        >
          <Mic className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}