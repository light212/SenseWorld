"use client";

/**
 * Conversation list component for sidebar.
 */

import { useState, useCallback } from "react";
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
        className="flex items-center gap-2 w-full py-2 px-4 bg-primary-500 text-white rounded-lg hover:bg-primary-600 mb-4 transition-colors"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
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
        "group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors",
        isSelected
          ? "bg-primary-100 text-primary-900"
          : "hover:bg-gray-100",
        isDeleting && "opacity-50 pointer-events-none"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isSelected ? "bg-primary-200" : "bg-gray-200"
        )}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
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
          "text-gray-400 hover:text-red-500 hover:bg-red-50"
        )}
        title="删除对话"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  );
}
