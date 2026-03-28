"use client";

/**
 * Main chat window component integrating all chat functionality.
 * 支持流式 LLM 响应 + 分段 TTS
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { VideoCallModal } from "./VideoCallModal";
import { MessageList } from "./MessageList";
import { CompactInputBar } from "./CompactInputBar";
import { useConversationStore, useConversationHydration } from "@/stores/conversationStore";
import { useAuthStore, useAuthHydration } from "@/stores/authStore";
import { cn } from "@/lib/utils";
import { saveAudio, cleanupOldAudio, createAudioUrl } from "@/lib/audio-cache";
import { audioManager } from "@/lib/optimized-audio-manager";
import { OmniClient, playAudio } from "@/lib/omni-client";
import { audioEngine } from "@/lib/audio-engine";
import { memoryMonitor } from "@/lib/memory-monitor";
import { performanceMonitor } from "@/lib/performance-monitor";
import { errorTracker, logError, logWarning } from "@/lib/error-tracking";
import { useToast } from "@/components/ui/Toast";
import type { Message } from "@/types";

/**
 * 创建WAV文件头部
 */
function createWavHeader(dataLength: number, sampleRate: number = 22050): Uint8Array {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // RIFF标识
  view.setUint32(0, 0x46464952, true); // "RIFF"
  view.setUint32(4, 36 + dataLength, true); // 文件总大小
  view.setUint32(8, 0x45564157, true); // "WAVE"

  // fmt子块
  view.setUint32(12, 0x20746d66, true); // "fmt "
  view.setUint32(16, 16, true); // fmt块大小
  view.setUint16(20, 1, true); // PCM格式
  view.setUint16(22, 1, true); // 单声道
  view.setUint32(24, sampleRate, true); // 采样率
  view.setUint32(28, sampleRate * 2, true); // 字节率
  view.setUint16(32, 2, true); // 块对齐
  view.setUint16(34, 16, true); // 位深度

  // data子块
  view.setUint32(36, 0x61746164, true); // "data"
  view.setUint32(40, dataLength, true); // 数据大小

  return new Uint8Array(header);
}

interface ChatWindowProps {
  conversationId?: string;
  className?: string;
}

export function ChatWindow({ conversationId, className }: ChatWindowProps) {
  // 分开 selector 避免不必要的重渲染
  const currentConversationId = useConversationStore((s) => s.currentConversationId);
  const messages = useConversationStore((s) => s.messages);
  const streamingContent = useConversationStore((s) => s.streamingContent);
  const isStreaming = useConversationStore((s) => s.isStreaming);
  const isLoadingMessages = useConversationStore((s) => s.isLoadingMessages);
  const isSendingMessage = useConversationStore((s) => s.isSendingMessage);
  const addMessage = useConversationStore((s) => s.addMessage);
  const setMessages = useConversationStore((s) => s.setMessages);
  const setIsSendingMessage = useConversationStore((s) => s.setIsSendingMessage);
  const setIsLoadingMessages = useConversationStore((s) => s.setIsLoadingMessages);
  const updateStreamingContent = useConversationStore((s) => s.updateStreamingContent);
  const clearStreamingContent = useConversationStore((s) => s.clearStreamingContent);
  const setIsStreaming = useConversationStore((s) => s.setIsStreaming);
  const setStreamingInputType = useConversationStore((s) => s.setStreamingInputType);
  const updateMessage = useConversationStore((s) => s.updateMessage);

  const token = useAuthStore((s) => s.token);
  const authHydrated = useAuthHydration();
  const convHydrated = useConversationHydration();
  const authHydratedRef = useRef(authHydrated);
  authHydratedRef.current = authHydrated;
  const convHydratedRef = useRef(convHydrated);
  convHydratedRef.current = convHydrated;
  const toast = useToast();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 视频通话状态
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [aiTranscript, setAiTranscript] = useState("");
  const [videoCallStatus, setVideoCallStatus] = useState<'connecting' | 'connected' | 'idle'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const omniClientRef = useRef<OmniClient | null>(null);
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const handleVideoCallToggleRef = useRef<(() => void) | null>(null);
  const farewellTriggeredRef = useRef(false);
  // Omni PCM 音频串行播放器
  const omniAudioCtxRef = useRef<AudioContext | null>(null);
  const omniNextStartTimeRef = useRef<number>(0);
  const omniAudioEnabledRef = useRef<boolean>(false);
  const audioQueueRef = useRef<string[]>([]);
  const audioChunksForSaveRef = useRef<string[]>([]); // 用于保存到缓存的音频
  const isPlayingRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null); // Bug 1: 跟踪当前音频
  const messagesCacheRef = useRef<Map<string, Message[]>>(new Map()); // 会话消息缓存
  const loadAbortRef = useRef<AbortController | null>(null); // 取消上一个消息加载请求
  const streamAbortRef = useRef<AbortController | null>(null); // 取消进行中的流式请求
  const tokenRef = useRef(token);
  tokenRef.current = token; // 每次渲染同步最新值，无需 effect

  // 使用传入的 conversationId 或 store 中的
  const activeConversationId = conversationId || currentConversationId;

  const activeConversationIdRef = useRef(activeConversationId);
  activeConversationIdRef.current = activeConversationId;

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

  // 使用专业音频引擎播放音频
  const playNextAudio = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;

    isPlayingRef.current = true;
    const audioBase64 = audioQueueRef.current.shift();

    if (audioBase64) {
      try {
        // 使用专业音频引擎解码和播放
        const audioData = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
        await audioEngine.playAudio(audioData.buffer);

        // 继续播放下一个音频
        isPlayingRef.current = false;
        setTimeout(() => playNextAudio(), 100); // 小延迟确保平滑过渡
      } catch (error) {
        console.error("专业音频引擎播放失败:", error);
        isPlayingRef.current = false;
        playNextAudio();
      }
    }
  }, []);

  // 停止音频播放
  const stopCurrentAudio = useCallback(() => {
    audioEngine.stop();
    isPlayingRef.current = false;
    audioQueueRef.current = [];
  }, []);

  // Bug 1: 切换会话时停止音频
  useEffect(() => {
    return () => {
      stopCurrentAudio();
    };
  }, [activeConversationId, stopCurrentAudio]);

  // 加载历史消息 - 当会话变化时重新加载（带缓存优化）
  useEffect(() => {
    if (!activeConversationId) return;

    // 取消上一个未完成的请求，立即创建新的 controller
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;
    const abortSignal = controller.signal;

    // 如有缓存直接用，否则清空并显示骨架屏
    const cached = messagesCacheRef.current.get(activeConversationId);
    if (cached) {
      setMessages(cached);
      setIsLoadingMessages(false);
    } else {
      setMessages([]);
      setIsLoadingMessages(true);
    }

    const loadMessages = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/v1/conversations/${activeConversationId}/messages`,
          { headers: { Authorization: `Bearer ${tokenRef.current}` }, signal: abortSignal }
        );
        if (response.ok) {
          const data = await response.json();
          if (data.items && data.items.length > 0) {
            const loadedMessages: Message[] = data.items.map((m: any) => ({
              id: m.id,
              conversationId: m.conversation_id,
              role: m.role,
              content: m.content,
              createdAt: m.created_at,
              hasAudio: m.has_audio,
              audioDuration: m.extra_data?.audio_duration || m.audio_duration,
              metadata: m.extra_data ? {
                inputType: m.extra_data.input_type,
              } : undefined,
            }));
            // 更新缓存和 UI
            messagesCacheRef.current.set(activeConversationId, loadedMessages);
            setMessages(loadedMessages);
          } else {
            // 空会话也缓存
            messagesCacheRef.current.set(activeConversationId, []);
            setMessages([]);
          }
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Failed to load messages:", error);
        }
      } finally {
        if (!abortSignal.aborted) {
          setIsLoadingMessages(false);
        }
      }
    };
    loadMessages();
  }, [activeConversationId, setMessages, stopCurrentAudio, setIsLoadingMessages]);

  // 流式聊天请求
  const streamChat = useCallback(async (text: string, inputType: "text" | "voice" = "text", messageId?: string, audioDuration?: number) => {
    const currentToken = tokenRef.current;
    const currentConvId = activeConversationIdRef.current;
    if (!currentConvId || !currentToken) {
      return;
    }

    // 取消上一个进行中的流式请求
    streamAbortRef.current?.abort();
    const abortController = new AbortController();
    streamAbortRef.current = abortController;

    // 提前生成 AI 消息 ID，立即插入占位消息
    const finalMessageId = crypto.randomUUID();
    const placeholderMessage: Message = {
      id: finalMessageId,
      conversationId: currentConvId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      hasAudio: false,
      metadata: { inputType },
    };
    addMessage(placeholderMessage);

    // 设置流式状态
    clearStreamingContent();
    setStreamingInputType(inputType);
    setIsStreaming(true);
    audioQueueRef.current = [];

    let fullContent = "";
    let aiMessageId = "";

    try {
      const response = await fetch("http://localhost:8000/v1/chat/stream", {
        method: "POST",
        signal: abortController.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({
          conversation_id: currentConvId,
          content: text,
          input_type: inputType,
          message_id: messageId,
          audio_duration: audioDuration,
        }),
      });

      if (!response.ok) {
        throw new Error("Stream request failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";
      let hasReceivedFirstAudio = false; // 跟踪是否收到第一个音频

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            continue;
          }

          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            try {
              const data = JSON.parse(dataStr);

              if (data.content) {
                fullContent += data.content;
                // 文字模式实时更新占位消息内容；语音模式不显示流式文字，避免闪烁
                if (inputType === "text") {
                  updateMessage(finalMessageId, { content: fullContent });
                }
                // 语音模式下，只有当收到第一个音频时才更新消息内容，避免文字闪烁
                if (inputType === "voice" && hasReceivedFirstAudio) {
                  updateMessage(finalMessageId, { content: fullContent });
                }
              }

              if (data.audio_base64) {
                console.log("[Audio] received audio chunk, length:", data.audio_base64.length);
                audioQueueRef.current.push(data.audio_base64);
                audioChunksForSaveRef.current.push(data.audio_base64);
                if (!hasReceivedFirstAudio) {
                  hasReceivedFirstAudio = true;
                  updateMessage(finalMessageId, {
                    content: fullContent,
                    metadata: { inputType: "voice" }
                  });
                }
                // 使用专业音频引擎播放
                if (!isPlayingRef.current) {
                  playNextAudio();
                }
              }


              if (data.message_id) {
                aiMessageId = data.message_id;
              }
            } catch (e) {
              logWarning('SSE消息解析失败', 'network', {
                error: (e as Error).message,
                dataLength: dataStr.length
              });
            }
          }
        }
      }

      // 用后端返回的 message_id 更新占位消息（如果后端有返回）
      if (aiMessageId && aiMessageId !== finalMessageId) {
        // 后端有自己的 ID，但我们已用前端生成的 ID 插入了占位，保持前端 ID 不变
      }

      // 保存音频到本地缓存（异步，不阻塞 UI）
      const hasAudioChunks = audioChunksForSaveRef.current.length > 0;
      let inMemoryAudioUrl: string | undefined;
      if (hasAudioChunks) {
        inMemoryAudioUrl = createAudioUrl(audioChunksForSaveRef.current);
        saveAudio(finalMessageId, audioChunksForSaveRef.current).catch(console.error);
        audioChunksForSaveRef.current = [];
      }

      // 更新占位消息为完整内容
      updateMessage(finalMessageId, {
        content: fullContent,
        hasAudio: hasAudioChunks,
        audioUrl: inMemoryAudioUrl,
      });

    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        logError('流式聊天失败', 'network', 'high', {
          error: (error as Error).message,
          conversationId: currentConvId,
          inputType
        }, error as Error);
      }
    } finally {
      if (!abortController.signal.aborted) {
        setIsStreaming(false);
        clearStreamingContent();
        setIsSendingMessage(false);
      }
    }
  }, [updateStreamingContent, clearStreamingContent, setIsStreaming, addMessage, setIsSendingMessage, playNextAudio]);

  const handleVoiceRecordingComplete = useCallback(
    (blob: Blob, duration: number, confirmedText: string) => {
      if (!activeConversationId) return;

      const messageId = crypto.randomUUID();

      // 立即创建并显示用户语音消息
      const audioUrl = URL.createObjectURL(blob);
      memoryMonitor.registerObjectURL(audioUrl);

      const userMessage: Message = {
        id: messageId,
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

      // 后台异步保存用户语音
      import("@/lib/audio-cache").then(({ saveUserAudioBlob }) =>
        saveUserAudioBlob(messageId, blob).catch(console.error)
      );

      // 不 await，让 streamChat 在后台执行
      streamChat(confirmedText, "voice", messageId, duration).catch(console.error);
    },
    [activeConversationId, addMessage, streamChat]
  );

  const handleTextSend = useCallback(
    async (text: string) => {
      if (!activeConversationId) return;
      
      setIsSendingMessage(true);

      const messageId = crypto.randomUUID();
      
      // Add user message to UI immediately
      const userMessage: Message = {
        id: messageId,
        conversationId: activeConversationId,
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
        hasAudio: false,
        metadata: { inputType: "text" },
      };
      addMessage(userMessage);

      // 流式调用 chat API（文本输入）
      await streamChat(text, "text", messageId);
    },
    [activeConversationId, addMessage, setIsSendingMessage, streamChat]
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
    const wsUrl = `ws://${window.location.hostname}:8000/ws/omni`;
    const client = new OmniClient({
      wsUrl,
      token,
      onEvent: (event) => {
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
      onText: (text) => {
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
      onAudio: (audioData) => {
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
        disabled={isSendingMessage || isStreaming}
      />
    </div>
  );
}
