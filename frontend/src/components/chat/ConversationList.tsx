"use client";

/**
 * Conversation list component for sidebar.
 */

import { useState, useCallback } from "react";
import { Plus, MessageCircle, Trash2, AlertTriangle } from "lucide-react";
import type { Conversation } from "@/types";
import { cn, formatDate } from "@/lib/utils";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  onCreate?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onDelete,
  onCreate,
  isLoading = false,
  className,
}: ConversationListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleDelete = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (deletingId) return;
      setConfirmId(id);
    },
    [deletingId]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!confirmId) return;
    const id = confirmId;
    setConfirmId(null);
    setDeletingId(id);
    try {
      await onDelete?.(id);
    } finally {
      setDeletingId(null);
    }
  }, [confirmId, onDelete]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* 自定义删除确认弹窗 */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setConfirmId(null)}
          />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            {/* 图标 */}
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            {/* 标题 */}
            <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">确认删除</h3>
            {/* 描述 */}
            <p className="text-sm text-gray-500 mb-6 text-center leading-relaxed">
              确定要删除这个会话吗？<br />此操作不可撤销。
            </p>
            {/* 按钮 */}
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmId(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 text-gray-700 font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 font-medium shadow-md shadow-red-200 transition-all"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
      {/* New conversation button */}
      <button
        onClick={onCreate}
        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:opacity-90 mb-4 transition-opacity font-medium"
      >
        <Plus className="w-5 h-5" />
        新对话
      </button>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-gray-200 rounded animate-pulse" style={{ width: `${60 + i * 10}%` }} />
                <div className="h-3 bg-gray-100 rounded animate-pulse w-1/3" />
              </div>
            </div>
          ))
        ) : conversations.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            暂无对话记录
          </p>
        ) : (
          conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isSelected={conversation.id === selectedId}
              isDeleting={conversation.id === deletingId}
              onSelect={() => onSelect(conversation.id)}
              onDelete={(e) => handleDelete(conversation.id, e)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  isDeleting: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

function ConversationItem({
  conversation,
  isSelected,
  isDeleting,
  onSelect,
  onDelete,
}: ConversationItemProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "group flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-colors",
        isSelected
          ? "bg-gradient-to-r from-blue-50 to-purple-50 text-gray-900 border border-blue-200"
          : "text-gray-600 hover:bg-gray-100",
        isDeleting && "opacity-50 pointer-events-none"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isSelected ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white" : "bg-gray-100 text-gray-400"
        )}
      >
        <MessageCircle className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium truncate", isSelected && "text-gray-900")}>
          {conversation.title || "新对话"}
        </p>
        <p className="text-xs text-gray-400 truncate">
          {conversation.lastMessageAt
            ? formatDate(conversation.lastMessageAt)
            : formatDate(conversation.createdAt)}
        </p>
      </div>

      {/* Message count badge */}
      {conversation.messageCount > 0 && (
        <span className={cn("flex-shrink-0 text-xs px-2 py-0.5 rounded-full", 
          isSelected ? "bg-blue-100 text-blue-600" : "text-gray-400 bg-gray-100"
        )}>
          {conversation.messageCount}
        </span>
      )}

      {/* Delete button */}
      <button
        onClick={onDelete}
        className={cn(
          "flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity",
          "text-gray-400 hover:text-red-500 hover:bg-red-50"
        )}
        title="删除对话"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
