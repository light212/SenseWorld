"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

export default function Home() {
  const router = useRouter();
  const { token } = useAuthStore();

  useEffect(() => {
    // 已登录跳转到聊天页，未登录跳转到登录页
    if (token) {
      router.push("/chat");
    } else {
      router.push("/login");
    }
  }, [token, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">SenseWorld</h1>
      <p className="text-lg text-gray-600">加载中...</p>
    </main>
  );
}
