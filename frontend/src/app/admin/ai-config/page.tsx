"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Mic, Volume2, Video, ChevronRight, AlertCircle } from "lucide-react";
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
  },
  { 
    type: "asr", 
    label: "听的能力", 
    icon: Mic, 
    description: "让 AI 听懂用户的语音",
  },
  { 
    type: "tts", 
    label: "说的能力", 
    icon: Volume2, 
    description: "让 AI 用语音回复用户",
  },
  { 
    type: "vd", 
    label: "看的能力", 
    icon: Video, 
    description: "让 AI 理解用户发送的视频",
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

  const getActiveCount = (type: string) => {
    return models.filter(m => m.model_type === type && m.is_active).length;
  };

  // 排序：未配置的排前面
  const sortedCapabilities = [...capabilities].sort((a, b) => {
    const aConfigured = getModelsByType(a.type).length > 0;
    const bConfigured = getModelsByType(b.type).length > 0;
    if (aConfigured === bConfigured) return 0;
    return aConfigured ? 1 : -1;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI 配置</h1>
        <p className="text-gray-500 mt-1">配置 AI 的核心能力，让你的应用更智能</p>
      </div>

      {/* 能力卡片 */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl" />
                <div className="flex-1">
                  <div className="h-4 w-24 bg-gray-100 rounded mb-2" />
                  <div className="h-3 w-48 bg-gray-50 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {sortedCapabilities.map(cap => {
            const defaultModel = getDefaultModel(cap.type);
            const count = getModelsByType(cap.type).length;
            const activeCount = getActiveCount(cap.type);
            const isConfigured = count > 0;

            return (
              <button
                key={cap.type}
                onClick={() => router.push(`/admin/ai-config/${cap.type}`)}
                className={cn(
                  "w-full bg-white rounded-xl border p-5 text-left transition-all duration-200 group",
                  "hover:shadow-sm hover:border-gray-300",
                  isConfigured ? "border-gray-200" : "border-gray-200"
                )}
              >
                <div className="flex items-center gap-4">
                  {/* 图标 */}
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    isConfigured ? "bg-gray-100" : "bg-gray-50"
                  )}>
                    <cap.icon className={cn(
                      "w-6 h-6",
                      isConfigured ? "text-blue-500" : "text-gray-400"
                    )} />
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-gray-900">{cap.label}</span>
                      {isConfigured ? (
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
                          {activeCount} 个启用
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                          <AlertCircle className="w-3 h-3" />
                          未配置
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{cap.description}</p>
                  </div>

                  {/* 默认模型信息 */}
                  <div className="hidden md:block text-right">
                    {defaultModel ? (
                      <div className="text-sm text-gray-600">
                        当前使用：{defaultModel.model_name}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">点击配置</div>
                    )}
                  </div>

                  {/* 箭头 */}
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
