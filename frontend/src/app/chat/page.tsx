"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { useAuthStore, useAuthHydration } from "@/stores/authStore";
import { useConversationStore } from "@/stores/conversationStore";

export default function ChatPage() {
  const router = useRouter();
  const { token, logout } = useAuthStore();
  const hydrated = useAuthHydration();
  const { currentConversationId, setCurrentConversation } = useConversationStore();
  const [userName, setUserName] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // 等待 hydration 完成后再检查登录状态
    if (!hydrated) {
      return;
    }

    // 检查登录状态
    if (!token) {
      router.push("/login");
      return;
    }

    // 获取用户信息
    const fetchUser = async () => {
      try {
        const response = await fetch("http://localhost:8000/v1/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const user = await response.json();
          setUserName(user.display_name || user.email);
        } else if (response.status === 401) {
          // Token 过期
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

      // 检查 localStorage 中是否有保存的会话 ID
      const savedConvId = localStorage.getItem("currentConversationId");
      if (savedConvId) {
        setCurrentConversation(savedConvId);
        return;
      }

      // 创建新会话
      try {
        const response = await fetch("http://localhost:8000/v1/conversations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title: "新对话" }),
        });

        if (response.ok) {
          const conversation = await response.json();
          setCurrentConversation(conversation.id);
          localStorage.setItem("currentConversationId", conversation.id);
          console.log("Created new conversation:", conversation.id);
        }
      } catch (error) {
        console.error("Failed to create conversation:", error);
      }
    };

    ensureConversation();
  }, [hydrated, token, checking, currentConversationId, setCurrentConversation]);

  const handleLogout = () => {
    logout();
    localStorage.removeItem("currentConversationId");
    router.push("/login");
  };

  // 等待 hydration 完成或正在检查
  if (!hydrated || checking) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>加载中...</p>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col">
      <header className="flex-shrink-0 border-b p-4 bg-white flex justify-between items-center">
        <h1 className="text-xl font-semibold">SenseWorld</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">{userName}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            退出
          </button>
        </div>
      </header>
      <div className="flex flex-1 min-h-0">
        {/* Conversation list sidebar - 固定左侧，独立滚动 */}
        <aside className="w-64 border-r hidden md:flex flex-col bg-gray-50">
          <div className="p-4 flex-shrink-0">
            <button className="w-full py-2 px-4 bg-primary-500 text-white rounded-lg hover:bg-primary-600">
              + 新对话
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <p className="text-sm text-gray-500 mb-2">对话列表</p>
            {/* TODO: 会话列表项 */}
          </div>
        </aside>
        {/* Chat window */}
        <div className="flex-1 flex flex-col min-h-0">
          <ChatWindow />
        </div>
      </div>
    </main>
  );
}
