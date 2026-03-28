"use client";

import { cn } from "@/lib/utils";

interface Provider {
  id: string;
  name: string;
  icon: string;
  description: string;
  recommended?: boolean;
}

const PROVIDERS: Provider[] = [
  {
    id: "dashscope",
    name: "阿里云通义千问",
    icon: "🇨🇳",
    description: "国内服务 · 速度快 · 中文效果好",
    recommended: true,
  },
  {
    id: "openai",
    name: "OpenAI",
    icon: "🇺🇸",
    description: "国际服务 · 效果优秀 · 需翻墙",
  },
  {
    id: "baidu",
    name: "百度文心一言",
    icon: "🇨🇳",
    description: "国内服务 · 中文能力强",
  },
  {
    id: "zhipu",
    name: "智谱 AI",
    icon: "🇨🇳",
    description: "国内服务 · GLM 系列模型",
  },
  {
    id: "other",
    name: "其他服务商",
    icon: "⚙️",
    description: "自定义 API 配置",
  },
];

interface ProviderSelectorProps {
  value: string;
  onChange: (id: string) => void;
  modelType: "llm" | "asr" | "tts" | "vd";
}

export function ProviderSelector({ value, onChange, modelType }: ProviderSelectorProps) {
  // 根据能力类型过滤推荐
  const getRecommendation = (providerId: string) => {
    if (modelType === "tts" || modelType === "asr") {
      return providerId === "dashscope"; // 语音推荐阿里云
    }
    return providerId === "dashscope"; // 对话也推荐阿里云
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 mb-2">选择 AI 服务提供商：</p>
      {PROVIDERS.map((provider) => {
        const isRecommended = getRecommendation(provider.id);
        return (
          <button
            key={provider.id}
            type="button"
            onClick={() => onChange(provider.id)}
            className={cn(
              "w-full p-4 text-left border rounded-xl transition-all",
              value === provider.id
                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{provider.icon}</span>
                <div>
                  <div className="font-medium text-gray-900">{provider.name}</div>
                  <div className="text-sm text-gray-500">{provider.description}</div>
                </div>
              </div>
              {isRecommended && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                  推荐
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}