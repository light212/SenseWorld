"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Mic, Volume2, Video, ChevronRight, Check, AlertCircle } from "lucide-react";
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
    gradient: "from-blue-500 to-indigo-600",
    bgLight: "bg-blue-50",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    borderColor: "border-blue-200",
    hoverBorder: "hover:border-blue-300",
  },
  { 
    type: "asr", 
    label: "听的能力", 
    icon: Mic, 
    description: "让 AI 听懂用户的语音",
    gradient: "from-emerald-500 to-teal-600",
    bgLight: "bg-emerald-50",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    borderColor: "border-emerald-200",
    hoverBorder: "hover:border-emerald-300",
  },
  { 
    type: "tts", 
    label: "说的能力", 
    icon: Volume2, 
    description: "让 AI 用语音回复用户",
    gradient: "from-purple-500 to-violet-600",
    bgLight: "bg-purple-50",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    borderColor: "border-purple-200",
    hoverBorder: "hover:border-purple-300",
  },
  { 
    type: "vd", 
    label: "看的能力", 
    icon: Video, 
    description: "让 AI 理解用户发送的视频",
    gradient: "from-orange-500 to-amber-600",
    bgLight: "bg-orange-50",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    borderColor: "border-orange-200",
    hoverBorder: "hover:border-orange-300",
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI 配置</h1>
        <p className="text-gray-500 mt-2">配置 AI 的核心能力，让你的应用更智能</p>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {capabilities.map(cap => {
          const count = getModelsByType(cap.type).length;
          const activeCount = getActiveCount(cap.type);
          return (
            <div key={cap.type} className={cn("rounded-xl p-4", cap.bgLight)}>
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", cap.iconBg)}>
                  <cap.icon className={cn("w-5 h-5", cap.iconColor)} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{activeCount}/{count}</div>
                  <div className="text-xs text-gray-500">{cap.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 能力卡片 */}
      {loading ? (
        <div className="grid gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-200 rounded-xl" />
                <div className="flex-1">
                  <div className="h-5 w-24 bg-gray-200 rounded mb-2" />
                  <div className="h-4 w-48 bg-gray-100 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {capabilities.map(cap => {
            const defaultModel = getDefaultModel(cap.type);
            const count = getModelsByType(cap.type).length;
            const activeCount = getActiveCount(cap.type);
            const isConfigured = count > 0;

            return (
              <button
                key={cap.type}
                onClick={() => router.push(`/admin/ai-config/${cap.type}`)}
                className={cn(
                  "w-full bg-white rounded-2xl p-6 text-left shadow-sm transition-all duration-200 group",
                  "hover:shadow-md",
                  cap.hoverBorder,
                  "border",
                  isConfigured ? cap.borderColor : "border-gray-200"
                )}
              >
                <div className="flex items-center gap-5">
                  {/* 图标 */}
                  <div className={cn(
                    "w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm",
                    cap.gradient
                  )}>
                    <cap.icon className="w-7 h-7 text-white" />
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-lg font-semibold text-gray-900">{cap.label}</span>
                      {isConfigured ? (
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                          cap.bgLight, cap.iconColor
                        )}>
                          <Check className="w-3 h-3" />
                          {activeCount} 个启用
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          <AlertCircle className="w-3 h-3" />
                          未配置
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{cap.description}</p>
                  </div>

                  {/* 默认模型信息 */}
                  <div className="hidden md:block text-right pr-2">
                    {defaultModel ? (
                      <div>
                        <div className="text-sm font-medium text-gray-900">{defaultModel.model_name}</div>
                        <div className="text-xs text-gray-500">{defaultModel.provider} · 默认</div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">点击配置</div>
                    )}
                  </div>

                  {/* 箭头 */}
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                    "bg-gray-100 group-hover:bg-gray-200",
                    "group-hover:translate-x-1"
                  )}>
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* 底部提示 */}
      <div className="text-center text-sm text-gray-400 py-4">
        点击任意能力卡片，进入详细配置页面
      </div>
    </div>
  );
}
