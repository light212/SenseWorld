"use client";

/**
 * 紧凑输入栏 - 多模态输入（语音优先）
 * 
 * P1-1: 新用户麦克风引导
 * P1-2: 识别文字可编辑
 * P1-3: 重新录制功能
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Send, Video, Plus, X, RotateCcw, MicOff, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

interface CompactInputBarProps {
  onTextSend: (text: string) => void;
  onVoiceRecord: (blob: Blob, duration: number, confirmedText: string) => void;
  onVideoSelect?: (file: File) => void;
  disabled?: boolean;
}

// P1-1: 麦克风权限状态
<<<<<<< Updated upstream
type MicPermissionState = "prompt" | "granted" | "denied" | "unknown";
=======
type MicPermissionState = "prompt" | "granted" | "denied" | "no-device" | "unknown";
>>>>>>> Stashed changes

export function CompactInputBar({
  onTextSend,
  onVoiceRecord,
  onVideoSelect,
  disabled = false,
}: CompactInputBarProps) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  // P1-1: 麦克风权限状态
  const [micPermission, setMicPermission] = useState<MicPermissionState>("unknown");
  const [showMicGuide, setShowMicGuide] = useState(false);
  
  // P1-2/P1-3: 语音预览状态
  const [voicePreview, setVoicePreview] = useState<{
    blob: Blob;
    duration: number;
    audioUrl: string;
    transcription: string;
    isTranscribing: boolean;
  } | null>(null);
  
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
      if (voicePreview?.audioUrl) {
        URL.revokeObjectURL(voicePreview.audioUrl);
      }
    };
  }, [voicePreview?.audioUrl]);

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
<<<<<<< Updated upstream
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setMicPermission("denied");
        setShowMicGuide(true);
      } else {
        // 其他错误（如无麦克风设备）
        toast.error("无法访问麦克风，请检查设备连接");
=======
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
>>>>>>> Stashed changes
      }
    }
  }, []);

  // P1-3: 停止录音并显示预览
  const stopRecordingAndPreview = useCallback(async () => {
    if (!mediaRecorderRef.current) return;

    const recorder = mediaRecorderRef.current;
    const duration = Date.now() - startTimeRef.current;
    
    recorder.stop();
    recorder.stream.getTracks().forEach(t => t.stop());

    recorder.onstop = async () => {
      if (chunksRef.current.length > 0) {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(blob);
        
        // 显示预览
        setVoicePreview({
          blob,
          duration,
          audioUrl,
          transcription: "",
          isTranscribing: true,
        });
        
        // 自动进行 ASR
        try {
          const formData = new FormData();
          formData.append("audio", blob, "recording.webm");
          formData.append("language", "zh");

          const response = await fetch("http://localhost:8000/v1/speech/transcribe", {
            method: "POST",
            body: formData,
          });

          if (response.ok) {
            const result = await response.json();
            setVoicePreview(prev => prev ? {
              ...prev,
              transcription: result.text || "",
              isTranscribing: false,
            } : null);
          } else {
            setVoicePreview(prev => prev ? {
              ...prev,
              isTranscribing: false,
            } : null);
          }
        } catch (error) {
          console.error("ASR failed:", error);
          setVoicePreview(prev => prev ? {
            ...prev,
            isTranscribing: false,
          } : null);
        }
      }
      chunksRef.current = [];
    };

    setIsRecording(false);
    setRecordingDuration(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

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
    setVoicePreview(null);
  }, []);

  // P1-3: 重录
  const handleRerecord = useCallback(() => {
    if (voicePreview?.audioUrl) {
      URL.revokeObjectURL(voicePreview.audioUrl);
    }
    setVoicePreview(null);
    startRecording();
  }, [voicePreview, startRecording]);

  // P1-2/P1-3: 发送语音（带可编辑文字）
  const sendVoicePreview = useCallback(() => {
    if (!voicePreview) return;
    
    // 如果有编辑过的文字，使用编辑过的；否则使用 transcription
    const finalText = text.trim() || voicePreview.transcription;
    
    if (!finalText) {
      toast.warning("请输入或确认文字内容");
      return;
    }
    
    // 调用父组件，传递 blob、duration 和确认的文字
    onVoiceRecord(voicePreview.blob, voicePreview.duration, finalText);
    
    // 清理预览
    URL.revokeObjectURL(voicePreview.audioUrl);
    setVoicePreview(null);
    setText("");
  }, [voicePreview, text, onVoiceRecord]);

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
      if (voicePreview) {
        sendVoicePreview();
      } else {
        handleSend();
      }
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
<<<<<<< Updated upstream
=======
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
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full font-medium hover:opacity-90 transition-opacity"
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
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full font-medium hover:opacity-90 transition-opacity"
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
>>>>>>> Stashed changes
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
          
<<<<<<< Updated upstream
          {micPermission === "denied" && (
            <p className="text-sm text-red-500">
              麦克风权限被拒绝，请在浏览器设置中允许访问
            </p>
          )}
          
=======
>>>>>>> Stashed changes
          <button
            onClick={startRecording}
            disabled={disabled}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
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

  // P1-2/P1-3: 语音预览状态（录音完成后的预览）
  if (voicePreview && !isRecording) {
    return (
      <div className="px-4 py-3 border-t border-gray-200 bg-white">
        {/* 音频预览 */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white">
            <Mic className="w-5 h-5" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {formatDuration(Math.floor(voicePreview.duration / 1000))}
              </span>
              {voicePreview.isTranscribing && (
                <span className="text-xs text-gray-400">识别中...</span>
              )}
            </div>
            
            {/* 音频播放 */}
            <audio 
              src={voicePreview.audioUrl} 
              controls 
              className="h-8 w-full"
            />
          </div>
        </div>
        
        {/* P1-2: 可编辑的识别文字 */}
        <input
          type="text"
          value={voicePreview.isTranscribing ? "识别中..." : (text || voicePreview.transcription)}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={voicePreview.transcription || "等待识别结果..."}
          disabled={voicePreview.isTranscribing}
          className="w-full px-4 py-2 bg-gray-100 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 mb-3"
        />
        
        {/* P1-3: 操作按钮 */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRerecord}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-full text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
          >
            <RotateCcw className="w-4 h-4" />
            重录
          </button>
          
          <button
            onClick={sendVoicePreview}
            disabled={voicePreview.isTranscribing || disabled}
            className="flex-1 py-2 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1"
          >
            <Send className="w-4 h-4" />
            发送
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
          onClick={stopRecordingAndPreview}
          className="px-4 py-1.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
        >
          完成
        </button>
      </div>
    );
  }

  // 正常输入状态
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