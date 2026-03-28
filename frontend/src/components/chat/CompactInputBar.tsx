"use client";

/**
 * 紧凑输入栏 - 多模态输入（语音优先）
 * 
 * P1-1: 新用户麦克风引导
 * P1-2: 识别文字可编辑
 * P1-3: 重新录制功能
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { Mic, Send, Video, Keyboard, X, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

interface CompactInputBarProps {
  onTextSend: (text: string) => void;
  onVoiceRecord: (blob: Blob, duration: number, confirmedText: string) => void;
  onVideoSelect?: (file: File) => void;
  onVideoCallToggle?: () => void;
  isVideoCallActive?: boolean;
  disabled?: boolean;
}

// P1-1: 麦克风权限状态
type MicPermissionState = "prompt" | "granted" | "denied" | "no-device" | "unknown";

export function CompactInputBar({
  onTextSend,
  onVoiceRecord,
  onVideoSelect,
  onVideoCallToggle,
  isVideoCallActive = false,
  disabled = false,
}: CompactInputBarProps) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [, setVoicePreview] = useState<Blob | null>(null);

  // P1-1: 麦克风权限状态
  const [micPermission, setMicPermission] = useState<MicPermissionState>("unknown");
  const [showMicGuide, setShowMicGuide] = useState(false);
  
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // P1-1: 检查麦克风权限
  useEffect(() => {
    const checkMicPermission = async () => {
      try {
        // 使用 Permissions API 检查真实权限状态（如果支持）
        if (navigator.permissions && navigator.permissions.query) {
          const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
          setMicPermission(result.state as MicPermissionState);
          
          // 检查是否需要显示引导（首次用户 + 权限未授予）
          const hasGuided = localStorage.getItem("mic_guided");
          if (result.state === "prompt" && hasGuided !== "true") {
            setShowMicGuide(true);
          }
          
          // 监听权限变化
          result.onchange = () => {
            setMicPermission(result.state as MicPermissionState);
            if (result.state === "granted") {
              setShowMicGuide(false);
              localStorage.setItem("mic_guided", "true");
            } else if (result.state === "denied") {
              setShowMicGuide(true);
            }
          };
        } else {
          // 浏览器不支持 Permissions API，设为 unknown
          setMicPermission("unknown");
        }
      } catch (error) {
        console.log("Permissions API not supported or error:", error);
        setMicPermission("unknown");
      }
    };
    
    checkMicPermission();
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // 开始录音（带权限处理）
  const startRecording = useCallback(async () => {
    try {
      // 请求麦克风权限并获取流
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 权限已获取
      setMicPermission("granted");
      setShowMicGuide(false);
      localStorage.setItem("mic_guided", "true");
      
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
      setVoicePreview(null);

      timerRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 100);
    } catch (error: unknown) {
      console.error("Failed to start recording:", error);
      
      // 判断是用户拒绝还是其他错误
      const err = error as Error;
      console.log("Error name:", err.name, "Message:", err.message);
      
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setMicPermission("denied");
        setShowMicGuide(true);
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        // 找不到麦克风设备
        setMicPermission("no-device");
        setShowMicGuide(true);
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        // 麦克风被占用
        toast.error("麦克风被其他应用占用，请关闭后重试");
      } else {
        // 其他错误
        toast.error("无法启动麦克风：" + (err.message || "未知错误"));
        setShowMicGuide(true);
      }
    }
  }, [toast]);

  // 停止录音并直接发送
  const stopRecordingAndSend = useCallback(() => {
    if (!mediaRecorderRef.current) return;

    const recorder = mediaRecorderRef.current;
    const duration = Date.now() - startTimeRef.current;

    recorder.onstop = () => {
      if (chunksRef.current.length === 0) return;
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      chunksRef.current = [];
      onVoiceRecord(blob, duration, "");
    };

    recorder.stop();
    recorder.stream.getTracks().forEach(t => t.stop());

    setIsRecording(false);
    setRecordingDuration(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [onVoiceRecord]);

  // 取消录音
  const cancelRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return;

    const recorder = mediaRecorderRef.current;
    recorder.stop();
    recorder.stream.getTracks().forEach(t => t.stop());
    chunksRef.current = [];

    setIsRecording(false);
    setRecordingDuration(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

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

  // P1-1: 麦克风引导弹窗
  if (showMicGuide && micPermission !== "granted") {
    // 无麦克风设备或系统权限未开启
    if (micPermission === "no-device") {
      return (
        <div className="px-4 py-6 border-t border-gray-200 bg-white">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
              <MicOff className="w-8 h-8 text-orange-500" />
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">无法访问麦克风</h3>
              <p className="text-sm text-gray-500 mb-3">
                请开启系统麦克风权限：
              </p>
            </div>

            {/* macOS 系统权限指引 */}
            <div className="w-full bg-gray-50 rounded-lg p-4 text-left">
              <p className="text-xs text-gray-500 mb-2 font-medium">macOS 系统：</p>
              <ol className="text-sm text-gray-600 space-y-2 mb-4">
                <li className="flex gap-2">
                  <span className="font-medium text-gray-900">1.</span>
                  <span>打开「系统设置」→「隐私与安全性」</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-gray-900">2.</span>
                  <span>点击左侧「麦克风」</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-gray-900">3.</span>
                  <span>开启浏览器（Chrome/Safari/Edge）的访问权限</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-gray-900">4.</span>
                  <span>返回此页面并刷新</span>
                </li>
              </ol>
              
              <p className="text-xs text-gray-500 mb-2 font-medium">Windows 系统：</p>
              <ol className="text-sm text-gray-600 space-y-2">
                <li className="flex gap-2">
                  <span className="font-medium text-gray-900">1.</span>
                  <span>打开「设置」→「隐私」→「麦克风」</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-gray-900">2.</span>
                  <span>开启「允许应用访问麦克风」</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-gray-900">3.</span>
                  <span>确保浏览器在允许列表中</span>
                </li>
              </ol>
            </div>
            
            <div className="flex gap-3 w-full">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-full font-medium hover:opacity-90 transition-opacity"
              >
                设置完成，刷新页面
              </button>
              
              <button
                onClick={() => setShowMicGuide(false)}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-50 transition-colors"
              >
                稍后再说
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 权限被拒绝的状态 - 显示详细指引
    if (micPermission === "denied") {
      return (
        <div className="px-4 py-6 border-t border-gray-200 bg-white">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <MicOff className="w-8 h-8 text-red-500" />
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">麦克风权限被拒绝</h3>
              <p className="text-sm text-gray-500 mb-3">
                请按以下步骤开启麦克风权限：
              </p>
            </div>

            {/* 浏览器设置指引 */}
            <div className="w-full bg-gray-50 rounded-lg p-4 text-left">
              <ol className="text-sm text-gray-600 space-y-2">
                <li className="flex gap-2">
                  <span className="font-medium text-gray-900">1.</span>
                  <span>点击浏览器地址栏左侧的 <span className="inline-flex items-center px-1.5 py-0.5 bg-gray-200 rounded text-xs">🔒</span> 图标</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-gray-900">2.</span>
                  <span>找到「麦克风」权限设置</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-gray-900">3.</span>
                  <span>选择「允许」或「询问」</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-gray-900">4.</span>
                  <span>刷新页面后重试</span>
                </li>
              </ol>
            </div>
            
            <div className="flex gap-3 w-full">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-full font-medium hover:opacity-90 transition-opacity"
              >
                刷新页面
              </button>
              
              <button
                onClick={() => setShowMicGuide(false)}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-50 transition-colors"
              >
                稍后再说
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 首次授权提示
    return (
      <div className="px-4 py-6 border-t border-gray-200 bg-white">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
            <Mic className="w-8 h-8 text-blue-600" />
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">需要麦克风权限</h3>
            <p className="text-sm text-gray-500">
              点击下方按钮授权麦克风，开始语音对话
            </p>
          </div>
          
          <button
            onClick={startRecording}
            disabled={disabled}
            className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            授权并开始录音
          </button>
          
          <button
            onClick={() => setShowMicGuide(false)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            稍后再说
          </button>
        </div>
      </div>
    );
  }

  // 录音中状态
  if (isRecording) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border-t border-gray-200">
        <button
          onClick={cancelRecording}
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
          onClick={stopRecordingAndSend}
          className="px-4 py-1.5 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
        >
          完成
        </button>
      </div>
    );
  }

  // 正常输入状态
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-200 bg-white">
      {/* 文字/语音切换按钮 */}
      <button
        onClick={() => setInputMode(inputMode === 'text' ? 'voice' : 'text')}
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        title={inputMode === 'text' ? '切换到语音输入' : '切换到文字输入'}
        aria-label={inputMode === 'text' ? '切换到语音输入' : '切换到文字输入'}
      >
        {inputMode === 'text' ? <Mic className="w-5 h-5" /> : <Keyboard className="w-5 h-5" />}
      </button>

      {/* 输入区域 */}
      {inputMode === 'text' ? (
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="输入消息..."
          className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300"
        />
      ) : (
        <button
          onClick={startRecording}
          disabled={disabled}
          className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-500 text-center hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          按住说话
        </button>
      )}

      {/* 视频通话按钮 */}
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        onChange={handleVideoSelect}
        className="hidden"
      />
      <button
        onClick={onVideoCallToggle}
        disabled={disabled || !onVideoCallToggle}
        className={cn(
          "p-2 rounded-full transition-colors disabled:opacity-50",
          isVideoCallActive
            ? "bg-red-600 text-white hover:bg-red-700 transition-colors"
            : "bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        )}
        title={isVideoCallActive ? "挂断视频通话" : "开始视频通话"}
        aria-label={isVideoCallActive ? "挂断视频通话" : "开始视频通话"}
      >
        <Video className="w-5 h-5" />
      </button>

      {/* 发送按钮（文字模式且有内容时显示） */}
      {inputMode === 'text' && text.trim() && (
        <button
          onClick={handleSend}
          disabled={disabled}
          className="p-2.5 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
          title="发送"
          aria-label="发送消息"
        >
          <Send className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}