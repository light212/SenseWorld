"use client";

/**
 * 聊天空状态组件 - 深色主题
 */

import { Mic, Video } from "lucide-react";

interface EmptyStateProps {
  onMicClick?: () => void;
  onVideoClick?: () => void;
}

export function EmptyState({ onMicClick, onVideoClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* 主图标 */}
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center mb-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Mic className="w-8 h-8 text-white" />
        </div>
      </div>

      {/* 标题 */}
      <h2 className="text-xl font-semibold text-white mb-2">
        开始对话
      </h2>
      
      {/* 副标题 */}
      <p className="text-gray-400 mb-8 max-w-sm">
        点击麦克风开始语音对话，或输入文字
      </p>

      {/* 快捷操作 */}
      {(onMicClick || onVideoClick) && (
        <div className="flex gap-4">
          {onMicClick && (
            <button
              onClick={onMicClick}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <Mic className="w-5 h-5" />
              语音对话
            </button>
          )}
          {onVideoClick && (
            <button
              onClick={onVideoClick}
              className="px-6 py-3 bg-white/10 backdrop-blur text-white rounded-xl font-medium hover:bg-white/20 transition-colors border border-white/10 flex items-center gap-2"
            >
              <Video className="w-5 h-5" />
              视频理解
            </button>
          )}
        </div>
      )}
    </div>
  );
}