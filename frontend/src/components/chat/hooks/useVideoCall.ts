"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { OmniClient } from "@/lib/omni-client";
import { useToast } from "@/components/ui/Toast";

export interface UseVideoCallReturn {
  isActive: boolean;
  status: "idle" | "connecting" | "connected";
  isMuted: boolean;
  isCameraOff: boolean;
  isAiSpeaking: boolean;
  aiTranscript: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  toggleCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
}

interface UseVideoCallOptions {
  token: string | null;
  currentConversationId?: string;
}

export function useVideoCall({
  token,
  currentConversationId,
}: UseVideoCallOptions): UseVideoCallReturn {
  const toast = useToast();

  // 核心状态
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected">("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [aiTranscript, setAiTranscript] = useState("");

  // Refs
  const omniClientRef = useRef<OmniClient | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const handleToggleCallRef = useRef<(() => void) | null>(null);
  const farewellTriggeredRef = useRef(false);

  // 音频播放状态
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const audioEnabledRef = useRef(false);

  // 切换通话状态
  const toggleCall = useCallback(async () => {
    if (isActive) {
      // 挂断
      omniClientRef.current?.disconnect();
      omniClientRef.current = null;
      audioEnabledRef.current = false;
      farewellTriggeredRef.current = false;
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
      nextStartTimeRef.current = 0;
      setIsActive(false);
      setIsAiSpeaking(false);
      setStatus("idle");
      setAiTranscript("");
      setIsMuted(false);
      setIsCameraOff(false);
      return;
    }

    // 开始视频通话
    if (!token) return;
    setStatus("connecting");
    const wsUrl = `ws://${window.location.hostname}:8000/ws/omni`;
    const client = new OmniClient({
      wsUrl,
      token,
      onEvent: (event) => {
        if (event.type === "omni_event") {
          const payload = event.payload as Record<string, unknown>;
          // AI 开始/停止说话检测
          if (payload.type === "response.audio.delta") setIsAiSpeaking(true);
          if (
            payload.type === "response.audio.done" ||
            payload.type === "response.done"
          ) {
            setIsAiSpeaking(false);
            if (payload.type === "response.done") setAiTranscript("");
          }
          // AI 调用 end_call 工具：自动挂断
          if (
            payload.type === "response.function_call_arguments.done" &&
            payload.name === "end_call"
          ) {
            setTimeout(() => handleToggleCallRef.current?.(), 1500);
          }
          // 用户开始说话：立即打断 AI 播放
          if (payload.type === "input_audio_buffer.speech_started") {
            audioCtxRef.current?.close();
            audioCtxRef.current = null;
            nextStartTimeRef.current = 0;
            setIsAiSpeaking(false);
          }
        }
        if (event.type === "omni_closed" || event.type === "omni_error") {
          omniClientRef.current?.stopCamera();
          audioCtxRef.current?.close();
          audioCtxRef.current = null;
          nextStartTimeRef.current = 0;
          setIsActive(false);
          setIsAiSpeaking(false);
        }
      },
      onText: (text) => {
        setAiTranscript((prev) => {
          const newTranscript = prev + text;
          // 检测 AI 回复中的告别语，自动挂断
          const farewellPattern =
            /再见|拜拜|goodbye|bye|结束通话|挂断了|下次见|保重/i;
          if (
            !farewellTriggeredRef.current &&
            farewellPattern.test(newTranscript)
          ) {
            farewellTriggeredRef.current = true;
            setTimeout(() => {
              // 直接执行挂断，不依赖 isActive 状态
              audioEnabledRef.current = false;
              audioCtxRef.current?.close();
              audioCtxRef.current = null;
              nextStartTimeRef.current = 0;
              const c = omniClientRef.current;
              omniClientRef.current = null;
              c?.stopCamera();
              c?.stopRecording();
              c?.disconnect();
              farewellTriggeredRef.current = false;
              setIsActive(false);
              setIsAiSpeaking(false);
              setStatus("idle");
              setAiTranscript("");
              setIsMuted(false);
              setIsCameraOff(false);
            }, 1500);
          }
          return newTranscript;
        });
      },
      onAudio: (audioData) => {
        if (!audioEnabledRef.current) return; // 挂断后不再播放
        // 串行调度 PCM delta，避免叠音
        if (
          !audioCtxRef.current ||
          audioCtxRef.current.state === "closed"
        ) {
          audioCtxRef.current = new AudioContext({ sampleRate: 24000 });
          nextStartTimeRef.current = 0;
        }
        const ctx = audioCtxRef.current;
        const int16 = new Int16Array(audioData);
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++)
          float32[i] = int16[i] / 32768;
        const buffer = ctx.createBuffer(1, float32.length, 24000);
        buffer.copyToChannel(float32, 0);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        const startAt = Math.max(ctx.currentTime, nextStartTimeRef.current);
        source.start(startAt);
        nextStartTimeRef.current = startAt + buffer.duration;
      },
      onError: () => {
        toast.error("视频通话连接失败");
        audioEnabledRef.current = false;
        farewellTriggeredRef.current = false;
        audioCtxRef.current?.close();
        audioCtxRef.current = null;
        nextStartTimeRef.current = 0;
        setIsActive(false);
        setStatus("idle");
        setIsAiSpeaking(false);
        setAiTranscript("");
      },
      onClose: () => {
        audioEnabledRef.current = false;
        farewellTriggeredRef.current = false;
        audioCtxRef.current?.close();
        audioCtxRef.current = null;
        nextStartTimeRef.current = 0;
        setIsActive(false);
        setStatus("idle");
        setIsAiSpeaking(false);
        setAiTranscript("");
      },
    });

    try {
      await client.connect();
      await client.startRecording();
      if (videoRef.current) {
        await client.startCamera(videoRef.current);
      }
      omniClientRef.current = client;
      audioEnabledRef.current = true;
      setIsActive(true);
      setStatus("connected");
    } catch (err) {
      client.disconnect();
      const msg = err instanceof Error ? err.message : "";
      if (
        msg.includes("Permission") ||
        msg.includes("NotAllowed") ||
        msg.includes("NotFound")
      ) {
        toast.error("需要摄像头和麦克风权限才能使用视频通话");
      } else {
        toast.error("视频通话启动失败，请重试");
      }
      setStatus("idle");
    }
  }, [isActive, token, toast]);

  handleToggleCallRef.current = toggleCall;

  // 切换静音
  const toggleMute = useCallback(() => {
    if (!omniClientRef.current) return;
    if (isMuted) {
      omniClientRef.current.startRecording();
    } else {
      omniClientRef.current.stopRecording();
    }
    setIsMuted((prev) => !prev);
  }, [isMuted]);

  // 切换摄像头
  const toggleCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getVideoTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsCameraOff((prev) => !prev);
    }
  }, []);

  // 切换会话时自动挂断
  useEffect(() => {
    if (!isActive) return;
    omniClientRef.current?.disconnect();
    omniClientRef.current = null;
    setIsActive(false);
    setIsAiSpeaking(false);
  }, [currentConversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isActive,
    status,
    isMuted,
    isCameraOff,
    isAiSpeaking,
    aiTranscript,
    videoRef,
    toggleCall,
    toggleMute,
    toggleCamera,
  };
}