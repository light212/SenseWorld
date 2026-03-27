"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Mic, Volume2, Video, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { adminApi, type ModelConfig } from "@/services/adminApi";
import { cn } from "@/lib/utils";

// 能力定义
const capabilities = [
  { 
    type: "llm", 
    label: "对话能力", 
    icon: MessageCircle, 
    description: "让 AI 理解用户输入并生成回复",
    color: "from-blue-500 to-blue-600"
  },
  { 
    type: "asr", 
    label: "听的能力", 
    icon: Mic, 
    description: "让 AI 听懂用户的语音",
    color: "from-emerald-500 to-emerald-600"
  },
  { 
    type: "tts", 
    label: "说的能力", 
    icon: Volume2, 
    description: "让 AI 用语音回复用户",
    color: "from-purple-500 to-purple-600"
  },
  { 
    type: "vd", 
    label: "看的能力", 
    icon: Video, 
    description: "让 AI 理解用户发送的视频",
    color: "from-orange-500 to-orange-600"
  },
];

export default function AIConfigPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.setToken(token || null);
    if (token) {
      fetchModels();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchModels = async () => {
    try {
      const data = await adminApi.listModelConfigs();
      setModels(data);
    } catch (error) {
      console.error("Failed to fetch models:", error);
    } finally {
      setLoading(false);
    }
  };

  const getModelsByType = (type: string) => {
    return models.filter(m => m.model_type === type);
  };

  const getDefaultModel = (type: string) => {
    return models.find(m => m.model_type === type && m.is_default);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI 配置</h1>
        <p className="text-sm text-gray-500 mt-1">配置 AI 的能力：对话、语音、视频</p>
      </div>

      {loading ? (
        <div className="text-gray-500 py-8 text-center">加载中...</div>
      ) : (
        <div className="space-y-4">
          {capabilities.map(cap => {
            const defaultModel = getDefaultModel(cap.type);
            const count = getModelsByType(cap.type).length;

            return (
              <button
                key={cap.type}
                onClick={() => router.push(`/admin/ai-config/${cap.type}`)}
                className="w-full bg-white rounded-xl border border-gray-200 p-6 text-left hover:border-gray-300 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center",
                    cap.color
                  )}>
                    <cap.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">{cap.label}</span>
                      <span className="text-xs text-gray-500">{count} 个模型</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">{cap.description}</div>
                  </div>
                  <div className="text-right">
                    {defaultModel ? (
                      <div className="text-sm">
                        <div className="text-gray-900 font-medium">{defaultModel.model_name}</div>
                        <div className="text-gray-500">{defaultModel.provider}</div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">未配置</span>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}