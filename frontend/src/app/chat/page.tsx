"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ConversationList } from "@/components/chat/ConversationList";
import { useAuthStore, useAuthHydration } from "@/stores/authStore";
import { useConversationStore } from "@/stores/conversationStore";
import { API_ENDPOINTS } from "@/lib/config";
import type { Conversation } from "@/types";

export default function ChatPage() {
  const router = useRouter();
  const { token, logout } = useAuthStore();
  const hydrated = useAuthHydration();
  const {
    currentConversationId,
    setCurrentConversation,
    conversations,
    setConversations,
    addConversation,
    removeConversation,
    isLoadingConversations,
    setIsLoadingConversations,
  } = useConversationStore();
  const [userName, setUserName] = useState("");
  const [checking, setChecking] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 加载用户信息
  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!token) {
      router.push("/login");
      return;
    }

    const fetchUser = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.auth.me, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const user = await response.json();
          setUserName(user.display_name || user.email);
        } else if (response.status === 401) {
          logout();
          router.push("/login");
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
      } finally {
        setChecking(false);
      }
    };
    fetchUser();
  }, [hydrated, token, router, logout]);

  // 加载会话列表
  useEffect(() => {
    if (!hydrated || !token || checking) {
      return;
    }

    const fetchConversations = async () => {
      setIsLoadingConversations(true);
      try {
        const response = await fetch(API_ENDPOINTS.conversations, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          const loadedConversations: Conversation[] = (data.items || []).map((c: any) => ({
            id: c.id,
            title: c.title,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
            lastMessageAt: c.last_message_at,
            messageCount: c.message_count || 0,
          }));
          setConversations(loadedConversations);
        }
      } catch (error) {
        console.error("Failed to fetch conversations:", error);
      } finally {
        setIsLoadingConversations(false);
      }
    };

    fetchConversations();
  }, [hydrated, token, checking, setConversations, setIsLoadingConversations]);

  // 自动创建新会话
  useEffect(() => {
    if (!hydrated || !token || checking) {
      return;
    }

    const ensureConversation = async () => {
      // 如果已有当前会话，不需要创建
      if (currentConversationId) {
        return;
      }

      // 如果有会话列表，选择第一个
      if (conversations.length > 0) {
        setCurrentConversation(conversations[0].id);
        localStorage.setItem("currentConversationId", conversations[0].id);
        return;
      }

      // 检查 localStorage 中是否有保存的会话 ID
      const savedConvId = localStorage.getItem("currentConversationId");
      if (savedConvId) {
        setCurrentConversation(savedConvId);
        return;
      }

      // 创建新会话
      try {
        const response = await fetch(API_ENDPOINTS.conversations, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title: "新对话" }),
        });

        if (response.ok) {
          const conversation = await response.json();
          const newConv: Conversation = {
            id: conversation.id,
            userId: conversation.user_id || "",
            title: conversation.title || "新对话",
            createdAt: conversation.created_at,
            updatedAt: conversation.updated_at,
            lastMessageAt: conversation.last_message_at,
            messageCount: 0,
          };
          addConversation(newConv);
          setCurrentConversation(conversation.id);
          localStorage.setItem("currentConversationId", conversation.id);
          console.log("Created new conversation:", conversation.id);
        }
      } catch (error) {
        console.error("Failed to create conversation:", error);
      }
    };

    ensureConversation();
  }, [hydrated, token, checking, currentConversationId, conversations, setCurrentConversation, addConversation]);

  // 创建新会话
  const handleCreateConversation = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(API_ENDPOINTS.conversations, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: "新对话" }),
      });

      if (response.ok) {
        const conversation = await response.json();
        const newConv: Conversation = {
          id: conversation.id,
          userId: conversation.user_id || "",
          title: conversation.title || "新对话",
          createdAt: conversation.created_at,
          updatedAt: conversation.updated_at,
          lastMessageAt: conversation.last_message_at,
          messageCount: 0,
        };
        addConversation(newConv);
        setCurrentConversation(conversation.id);
        localStorage.setItem("currentConversationId", conversation.id);
      }
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  }, [token, addConversation, setCurrentConversation]);

  // 删除会话
  const handleDeleteConversation = useCallback(
    async (id: string) => {
      if (!token) return;

      try {
        const response = await fetch(API_ENDPOINTS.conversation(id), {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          removeConversation(id);
          if (currentConversationId === id) {
            // 如果删除的是当前会话，切换到第一个或清空
            const remaining = conversations.filter((c) => c.id !== id);
            if (remaining.length > 0) {
              setCurrentConversation(remaining[0].id);
              localStorage.setItem("currentConversationId", remaining[0].id);
            } else {
              setCurrentConversation(null);
              localStorage.removeItem("currentConversationId");
            }
          }
        }
      } catch (error) {
        console.error("Failed to delete conversation:", error);
      }
    },
    [token, removeConversation, currentConversationId, conversations, setCurrentConversation]
  );

  // 切换会话
  const handleSelectConversation = useCallback(
    (id: string) => {
      setCurrentConversation(id);
      localStorage.setItem("currentConversationId", id);
      setSidebarOpen(false);
    },
    [setCurrentConversation]
  );

  const handleLogout = () => {
    logout();
    localStorage.removeItem("currentConversationId");
    router.push("/login");
  };

  // 等待 hydration 完成或正在检查
  if (!hydrated || checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col bg-[#F9FAFB]">
      {/* Header - 亮色主题 */}
      <header className="flex-shrink-0 border-b border-gray-100 shadow-sm px-6 py-4 bg-white flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 cursor-pointer"
            aria-label="切换会话列表"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">SenseWorld</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-600 text-sm">{userName}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            退出
          </button>
        </div>
      </header>
      
      <div className="flex flex-1 min-h-0">
        {/* Conversation list sidebar */}
        <aside className={`w-64 border-r border-gray-200 flex flex-col bg-gray-50 absolute md:relative inset-y-0 left-0 z-20 transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <ConversationList
            conversations={conversations}
            selectedId={currentConversationId || undefined}
            onSelect={handleSelectConversation}
            onDelete={handleDeleteConversation}
            onCreate={handleCreateConversation}
            isLoading={isLoadingConversations}
            className="h-full p-4"
          />
        </aside>

        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 z-10 bg-black/30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Chat window */}
        <div className="flex-1 flex flex-col min-h-0 bg-white">
          <ChatWindow />
        </div>
      </div>
    </main>
  );
}
