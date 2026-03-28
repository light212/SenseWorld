"use client";

/**
 * Main chat window component integrating all chat functionality.
 * 支持流式 LLM 响应 + 分段 TTS
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { VideoCallModal } from "./VideoCallModal";
import { MessageList } from "./MessageList";
import { CompactInputBar } from "./CompactInputBar";
import { useChatStream } from "./hooks/useChatStream";
import { useMessages } from "./hooks/useMessages";
import { useConversationStore, useConversationHydration } from "@/stores/conversationStore";
import { useAuthStore, useAuthHydration } from "@/stores/authStore";
import { cn } from "@/lib/utils";
import { cleanupOldAudio, saveUserAudioBlob } from "@/lib/audio-cache";
import { audioEngine } from "@/lib/audio-engine";
import { memoryMonitor } from "@/lib/memory-monitor";
import { performanceMonitor } from "@/lib/performance-monitor";
import { errorTracker, logError, logWarning } from "@/lib/error-tracking";
import { useToast } from "@/components/ui/Toast";
import type { Message } from "@/types";

interface ChatWindowProps {
  conversationId?: string;
  className?: string;
}

export function ChatWindow({ conversationId, className }: ChatWindowProps) {
  // 分开 selector 避免不必要的重渲染
  const currentConversationId = useConversationStore((s) => s.currentConversationId);
  const addMessage = useConversationStore((s) => s.addMessage);
  const updateMessage = useConversationStore((s) => s.updateMessage);
  const setIsSendingMessage = useConversationStore((s) => s.setIsSendingMessage);

  const token = useAuthStore((s) => s.token);
  const authHydrated = useAuthHydration();
  const convHydrated = useConversationHydration();
  const authHydratedRef = useRef(authHydrated);
  authHydratedRef.current = authHydrated;
  const convHydratedRef = useRef(convHydrated);
  convHydratedRef.current = convHydrated;
  const toast = useToast();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 使用传入的 conversationId 或 store 中的
  const activeConversationId = conversationId || currentConversationId;

  // 使用 useMessages hook 管理消息加载和缓存
  const { messages, isLoading: isLoadingMessages } = useMessages(activeConversationId ?? undefined, token);

  // 使用 useChatStream hook 管理流式聊天
  const { streamingContent, isStreaming, sendMessage, abortStream } = useChatStream({
    conversationId: activeConversationId,
    token,
  });

  // 视频通话状态
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [aiTranscript, setAiTranscript] = useState("");
  const [videoCallStatus, setVideoCallStatus] = useState<'connecting' | 'connected' | 'idle'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const omniClientRef = useRef<any>(null);
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const handleVideoCallToggleRef = useRef<(() => void) | null>(null);
  const farewellTriggeredRef = useRef(false);
  const omniAudioCtxRef = useRef<AudioContext | null>(null);
  const omniNextStartTimeRef = useRef<number>(0);
  const omniAudioEnabledRef = useRef<boolean>(false);

  // 启动时初始化所有系统
  useEffect(() => {
    cleanupOldAudio().catch(console.error);

    // 初始化错误追踪
    errorTracker.initialize();

    // 启动性能监控
    performanceMonitor.startMonitoring();

    // 启动内存监控
    memoryMonitor.startMonitoring();

    // 初始化专业音频引擎
    audioEngine.initialize().catch(error => {
      logError('专业音频引擎初始化失败', 'audio', 'high', { error: error.message }, error);
    });

    // 设置性能告警回调
    performanceMonitor.onAlert((alert) => {
      logWarning(`性能告警 [${alert.severity}]: ${alert.message}`, 'unknown', {
        metric: alert.metric,
        value: alert.value,
        threshold: alert.threshold
      });
    });

    // 组件卸载时清理所有资源
    return () => {
      audioEngine.destroy().catch(error => {
        logError('音频引擎销毁失败', 'audio', 'medium', { error: error.message }, error);
      });
      memoryMonitor.stopMonitoring();
      performanceMonitor.stopMonitoring();
      errorTracker.destroy();
    };
  }, []);

  const handleVoiceRecordingComplete = useCallback(
    (blob: Blob, duration: number, confirmedText: string) => {
      if (!activeConversationId) return;

      const userMessageId = crypto.randomUUID();
      const aiMessageId = crypto.randomUUID();

      // 立即创建并显示用户语音消息
      const audioUrl = URL.createObjectURL(blob);
      memoryMonitor.registerObjectURL(audioUrl);

      const userMessage: Message = {
        id: userMessageId,
        conversationId: activeConversationId,
        role: "user",
        content: confirmedText || "语音消息",
        createdAt: new Date().toISOString(),
        hasAudio: true,
        audioDuration: duration,
        audioUrl,
        metadata: {
          inputType: "voice",
        },
      };
      addMessage(userMessage);

      // 保存用户语音到 IndexedDB（用 userMessageId 和 duration）
      saveUserAudioBlob(userMessageId, blob, duration).catch(() => {});

      // 发送流式聊天请求（传递 userMessageId 和 aiMessageId）
      sendMessage(confirmedText, "voice", userMessageId, aiMessageId, duration).catch(console.error);
    },
    [activeConversationId, addMessage, sendMessage]
  );

  const handleTextSend = useCallback(
    async (text: string) => {
      if (!activeConversationId) return;
      
      setIsSendingMessage(true);

      const userMessageId = crypto.randomUUID();
      const aiMessageId = crypto.randomUUID();
      
      // Add user message to UI immediately
      const userMessage: Message = {
        id: userMessageId,
        conversationId: activeConversationId,
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
        hasAudio: false,
        metadata: { inputType: "text" },
      };
      addMessage(userMessage);

      // 流式调用 chat API（文本输入）
      await sendMessage(text, "text", userMessageId, aiMessageId);
    },
    [activeConversationId, addMessage, setIsSendingMessage, sendMessage]
  );

  const handleVideoCallToggle = useCallback(async () => {
    if (isVideoCallActive) {
      // 挂断
      omniClientRef.current?.disconnect();
      omniClientRef.current = null;
      omniAudioEnabledRef.current = false;
      farewellTriggeredRef.current = false;
      omniAudioCtxRef.current?.close();
      omniAudioCtxRef.current = null;
      omniNextStartTimeRef.current = 0;
      setIsVideoCallActive(false);
      setIsAiSpeaking(false);
      setVideoCallStatus('idle');
      setAiTranscript("");
      setIsMuted(false);
      setIsCameraOff(false);
      return;
    }

    // 开始视频通话
    if (!token) return;
    setVideoCallStatus('connecting');
    
    // 动态导入 OmniClient
    const { OmniClient } = await import('@/lib/omni-client');
    const wsUrl = `ws://${window.location.hostname}:8000/ws/omni`;
    const client = new OmniClient({
      wsUrl,
      token,
      onEvent: (event: any) => {
        if (event.type === 'omni_event') {
          const payload = event.payload as Record<string, unknown>;
          // AI 开始/停止说话检测
          if (payload.type === 'response.audio.delta') setIsAiSpeaking(true);
          if (payload.type === 'response.audio.done' || payload.type === 'response.done') {
            setIsAiSpeaking(false);
            if (payload.type === 'response.done') setAiTranscript("");
          }
          // AI 调用 end_call 工具：自动挂断
          if (payload.type === 'response.function_call_arguments.done' && payload.name === 'end_call') {
            setTimeout(() => handleVideoCallToggleRef.current?.(), 1500); // 延迟让 AI 说完再见
          }
          // 用户开始说话：立即打断 AI 播放
          if (payload.type === 'input_audio_buffer.speech_started') {
            omniAudioCtxRef.current?.close();
            omniAudioCtxRef.current = null;
            omniNextStartTimeRef.current = 0;
            setIsAiSpeaking(false);
          }
        }
        if (event.type === 'omni_closed' || event.type === 'omni_error') {
          omniClientRef.current?.stopCamera();
          omniAudioCtxRef.current?.close();
          omniAudioCtxRef.current = null;
          omniNextStartTimeRef.current = 0;
          setIsVideoCallActive(false);
          setIsAiSpeaking(false);
        }
      },
      onText: (text: string) => {
        setAiTranscript(prev => {
          const newTranscript = prev + text;
          // 检测 AI 回复中的告别语，自动挂断
          const farewellPattern = /再见|拜拜|goodbye|bye|结束通话|挂断了|下次见|保重/i;
          if (!farewellTriggeredRef.current && farewellPattern.test(newTranscript)) {
            farewellTriggeredRef.current = true;
            setTimeout(() => {
              // 直接执行挂断，不依赖 isVideoCallActive 状态
              omniAudioEnabledRef.current = false;
              omniAudioCtxRef.current?.close();
              omniAudioCtxRef.current = null;
              omniNextStartTimeRef.current = 0;
              const client = omniClientRef.current;
              omniClientRef.current = null;
              client?.stopCamera();
              client?.stopRecording();
              client?.disconnect();
              farewellTriggeredRef.current = false;
              setIsVideoCallActive(false);
              setIsAiSpeaking(false);
              setVideoCallStatus('idle');
              setAiTranscript("");
              setIsMuted(false);
              setIsCameraOff(false);
            }, 1500);
          }
          return newTranscript;
        });
      },
      onAudio: (audioData: ArrayBuffer) => {
        if (!omniAudioEnabledRef.current) return; // 挂断后不再播放
        // 串行调度 PCM delta，避免叠音
        if (!omniAudioCtxRef.current || omniAudioCtxRef.current.state === 'closed') {
          omniAudioCtxRef.current = new AudioContext({ sampleRate: 24000 });
          omniNextStartTimeRef.current = 0;
        }
        const ctx = omniAudioCtxRef.current;
        const int16 = new Int16Array(audioData);
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
        const buffer = ctx.createBuffer(1, float32.length, 24000);
        buffer.copyToChannel(float32, 0);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        const startAt = Math.max(ctx.currentTime, omniNextStartTimeRef.current);
        source.start(startAt);
        omniNextStartTimeRef.current = startAt + buffer.duration;
      },
      onError: () => {
        toast.error('视频通话连接失败');
        omniAudioEnabledRef.current = false;
        farewellTriggeredRef.current = false;
        omniAudioCtxRef.current?.close();
        omniAudioCtxRef.current = null;
        omniNextStartTimeRef.current = 0;
        setIsVideoCallActive(false);
        setVideoCallStatus('idle');
        setIsAiSpeaking(false);
        setAiTranscript("");
      },
      onClose: () => {
        omniAudioEnabledRef.current = false;
        farewellTriggeredRef.current = false;
        omniAudioCtxRef.current?.close();
        omniAudioCtxRef.current = null;
        omniNextStartTimeRef.current = 0;
        setIsVideoCallActive(false);
        setVideoCallStatus('idle');
        setIsAiSpeaking(false);
        setAiTranscript("");
      },
    });

    try {
      await client.connect();
      await client.startRecording();
      if (videoElementRef.current) {
        await client.startCamera(videoElementRef.current);
      }
      omniClientRef.current = client;
      omniAudioEnabledRef.current = true;
      setIsVideoCallActive(true);
      setVideoCallStatus('connected');
    } catch (err) {
      client.disconnect();
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('NotFound')) {
        toast.error('需要摄像头和麦克风权限才能使用视频通话');
      } else {
        toast.error('视频通话启动失败，请重试');
      }
      setVideoCallStatus('idle');
    }
  }, [isVideoCallActive, token, toast]);
  handleVideoCallToggleRef.current = handleVideoCallToggle;

  const handleToggleMute = useCallback(() => {
    if (!omniClientRef.current) return;
    if (isMuted) {
      omniClientRef.current.startRecording();
    } else {
      omniClientRef.current.stopRecording();
    }
    setIsMuted(prev => !prev);
  }, [isMuted]);

  const handleToggleCamera = useCallback(() => {
    if (videoElementRef.current?.srcObject) {
      const stream = videoElementRef.current.srcObject as MediaStream;
      stream.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
      setIsCameraOff(prev => !prev);
    }
  }, []);

  const handleHangup = useCallback(() => {
    handleVideoCallToggle();
  }, [handleVideoCallToggle]);

  // 切换 conversation 时自动挂断
  useEffect(() => {
    if (!isVideoCallActive) return;
    omniClientRef.current?.disconnect();
    omniClientRef.current = null;
    setIsVideoCallActive(false);
    setIsAiSpeaking(false);
  }, [currentConversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <VideoCallModal
        isOpen={isVideoCallActive}
        status={videoCallStatus === 'idle' ? 'connecting' : videoCallStatus as 'connecting' | 'connected'}
        isAiSpeaking={isAiSpeaking}
        aiTranscript={aiTranscript}
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        videoRef={videoElementRef}
        onHangup={handleHangup}
        onToggleMute={handleToggleMute}
        onToggleCamera={handleToggleCamera}
      />

      {/* Messages area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0 bg-gray-50">
        <MessageList
          messages={messages}
          streamingContent={streamingContent}
          isStreaming={isStreaming}
          isLoading={isLoadingMessages}
          scrollContainerRef={scrollContainerRef}
        />
      </div>

      {/* 紧凑输入栏 */}
      <CompactInputBar
        onTextSend={handleTextSend}
        onVoiceRecord={handleVoiceRecordingComplete}
        onVideoCallToggle={handleVideoCallToggle}
        isVideoCallActive={isVideoCallActive}
        disabled={isStreaming}
      />
    </div>
  );
}