"use client";

import React from "react";
import { Bot, PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoCallModalProps {
  isOpen: boolean;
  status: "connecting" | "connected";
  isAiSpeaking: boolean;
  aiTranscript: string;
  isMuted: boolean;
  isCameraOff: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  onHangup: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
}

export function VideoCallModal({
  isOpen,
  status,
  isAiSpeaking,
  aiTranscript,
  isMuted,
  isCameraOff,
  videoRef,
  onHangup,
  onToggleMute,
  onToggleCamera,
}: VideoCallModalProps) {
  if (!isOpen) return null;

  const isSpeaking = status === "connected" && isAiSpeaking;

  // Status badge config
  let badgeText: string;
  let badgeBg: string;
  let dotColor: string;
  let dotAnimate: string;

  if (status === "connecting") {
    badgeText = "连接中";
    badgeBg = "bg-yellow-500/80 text-white";
    dotColor = "bg-yellow-200";
    dotAnimate = "animate-pulse";
  } else if (isSpeaking) {
    badgeText = "AI说话中";
    badgeBg = "bg-black/60 text-gray-200";
    dotColor = "bg-red-400";
    dotAnimate = "animate-pulse";
  } else {
    badgeText = "可以讲话";
    badgeBg = "bg-black/60 text-gray-200";
    dotColor = "bg-green-400";
    dotAnimate = "";
  }

  const waveformDelays = [0, 150, 75, 225, 50];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0D1117]">
      {/* Ambient red glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(220,38,38,0.15) 0%, transparent 70%)",
        }}
      />

      {/* Main content */}
      <div className="relative flex flex-col items-center gap-6">
        {/* Speaking animation rings */}
        {isSpeaking && (
          <>
            <div className="animate-ping absolute inline-flex h-36 w-36 rounded-full bg-red-500/30" />
            <div className="animate-pulse absolute inline-flex h-32 w-32 rounded-full border border-red-400/40" />
          </>
        )}

        {/* AI Avatar */}
        <div
          className={cn(
            "relative w-28 h-28 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-2xl",
            isSpeaking && "ring-2 ring-red-400/60"
          )}
        >
          <Bot className="text-white" size={56} />
        </div>

        {/* AI name */}
        <p className="text-white font-semibold text-lg">SenseWorld AI</p>

        {/* Status badge */}
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
            badgeBg
          )}
        >
          <span className={cn("w-2 h-2 rounded-full", dotColor, dotAnimate)} />
          {badgeText}
        </div>

        {/* Speaking waveform */}
        {isSpeaking && (
          <div className="flex items-end gap-1 h-8">
            {waveformDelays.map((delay, i) => (
              <div
                key={i}
                className="w-1.5 bg-red-400 rounded-full animate-bounce"
                style={{
                  animationDelay: `${delay}ms`,
                  height: `${[16, 28, 20, 24, 14][i]}px`,
                }}
              />
            ))}
          </div>
        )}

        {/* Transcript bar */}
        {aiTranscript && (
          <div className="max-w-md mx-auto px-4 py-2 bg-black/60 backdrop-blur-sm rounded-full text-white/90 text-sm text-center">
            {aiTranscript}
          </div>
        )}
      </div>

      {/* User camera — bottom right */}
      <div className="absolute right-6 bottom-28">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={cn(
            "rounded-xl object-cover",
            isCameraOff ? "hidden" : "w-48 h-36"
          )}
        />
      </div>

      {/* Control bar */}
      <div className="fixed bottom-0 left-0 right-0 pb-8 flex items-center justify-center gap-6">
        {/* Mute */}
        <button
          onClick={onToggleMute}
          className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          aria-label={isMuted ? "取消静音" : "静音"}
        >
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>

        {/* Hangup */}
        <button
          onClick={onHangup}
          className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-900/50 transition-colors"
          aria-label="挂断"
        >
          <PhoneOff size={26} />
        </button>

        {/* Camera */}
        <button
          onClick={onToggleCamera}
          className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          aria-label={isCameraOff ? "开启摄像头" : "关闭摄像头"}
        >
          {isCameraOff ? <VideoOff size={22} /> : <Video size={22} />}
        </button>
      </div>
    </div>
  );
}
