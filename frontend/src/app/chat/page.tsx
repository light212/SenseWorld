"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { useAuthStore, useAuthHydration } from "@/stores/authStore";

export default function ChatPage() {
  const router = useRouter();
  const { token, logout } = useAuthStore();
  const hydrated = useAuthHydration();
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
    <main className="flex min-h-screen flex-col">
      <header className="border-b p-4 bg-white flex justify-between items-center">
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
      <div className="flex flex-1">
        {/* Conversation list sidebar */}
        <aside className="w-64 border-r p-4 hidden md:block bg-gray-50">
          <button className="w-full py-2 px-4 bg-primary-500 text-white rounded-lg hover:bg-primary-600 mb-4">
            + 新对话
          </button>
          <p className="text-sm text-gray-500">对话列表</p>
        </aside>
        {/* Chat window */}
        <div className="flex-1 flex flex-col">
          <ChatWindow />
        </div>
      </div>
    </main>
  );
}
