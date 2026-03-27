'use client';

import { useEffect, useState } from 'react';
import { RealtimeConversation } from '@/components/RealtimeConversation';

export default function RealtimePage() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Get token from localStorage
    const storedToken = localStorage.getItem('access_token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">实时对话</h1>
          <p className="text-gray-600 mb-4">请先登录后使用此功能</p>
          <a 
            href="/login" 
            className="inline-block px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            去登录
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-2xl mx-auto py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">实时对话</h1>
          <p className="text-gray-600 mt-2">与 AI 进行实时语音对话</p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg">
          <RealtimeConversation token={token} />
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>支持实时语音输入和 AI 语音回复</p>
          <p className="mt-1">使用 Qwen3-Omni 模型</p>
        </div>
      </div>
    </div>
  );
}
