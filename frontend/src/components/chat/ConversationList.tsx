"use client";

/**
 * Conversation list component for sidebar.
 */

import { useState, useCallback } from "react";
import { Plus, MessageCircle, Trash2 } from "lucide-react";
import type { Conversation } from "@/types";
import { cn, formatDate } from "@/lib/utils";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  onCreate?: () => void;
  className?: string;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onDelete,
  onCreate,
  className,
}: ConversationListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();

      if (deletingId) return;

      const confirmed = window.confirm("确定要删除这个对话吗？");
      if (!confirmed) return;

      setDeletingId(id);
      try {
        await onDelete?.(id);
      } finally {
        setDeletingId(null);
      }
    },
    [deletingId, onDelete]
  );

  return (
    <div className={cn("flex flex-col h-full", className)}>
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
        {conversations.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
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
          ? "bg-white/10 text-white"
          : "text-gray-400 hover:bg-white/5 hover:text-gray-300",
        isDeleting && "opacity-50 pointer-events-none"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isSelected ? "bg-blue-500/20 text-blue-400" : "bg-white/5"
        )}
      >
        <MessageCircle className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {conversation.title || "新对话"}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {conversation.lastMessageAt
            ? formatDate(conversation.lastMessageAt)
            : formatDate(conversation.createdAt)}
        </p>
      </div>

      {/* Message count badge */}
      {conversation.messageCount > 0 && (
        <span className="flex-shrink-0 text-xs text-gray-500">
          {conversation.messageCount}
        </span>
      )}

      {/* Delete button */}
      <button
        onClick={onDelete}
        className={cn(
          "flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity",
          "text-gray-500 hover:text-red-400 hover:bg-red-500/10"
        )}
        title="删除对话"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
