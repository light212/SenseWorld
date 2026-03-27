"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MessageCircle, Mic, Volume2, Video, ChevronRight, Plus, Trash2, Star, Loader2, ToggleLeft, ToggleRight, X, CheckCircle, AlertCircle } from "lucide-react";
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

// 服务商选项 - 去掉国旗图标
const providers = [
  { id: "dashscope", name: "阿里云通义千问", recommended: true, desc: "国内服务 · 速度快 · 中文效果好" },
  { id: "openai", name: "OpenAI", desc: "国际服务 · 效果优秀 · 需翻墙" },
  { id: "baidu", name: "百度文心一言", desc: "国内服务 · 百度生态" },
  { id: "zhipu", name: "智谱 AI", desc: "国内服务 · 清华技术" },
  { id: "other", name: "其他服务商", desc: "自定义配置" },
];

// 调用方式选项
const protocols = [
  { id: "openai_compatible", label: "OpenAI 兼容", description: "标准 Chat Completions API" },
  { id: "dashscope_sdk", label: "DashScope SDK", description: "阿里云 SDK 调用" },
  { id: "websocket", label: "WebSocket", description: "实时流式连接" },
  { id: "custom_http", label: "自定义 HTTP", description: "其他 REST API" },
];

// 终端类型选项
const terminalTypes = [
  { id: "web", label: "Web", available: true },
  { id: "ios", label: "iOS", available: false, hint: "即将支持" },
  { id: "android", label: "Android", available: false, hint: "即将支持" },
];

// 根据服务商和能力类型返回模型选项
const getModelOptions = (provider: string, modelType: string) => {
  const models: Record<string, Record<string, { id: string; name: string; description: string; protocol?: string }[]>> = {
    dashscope: {
      llm: [
        { id: "qwen-turbo", name: "通义千问-Turbo", description: "快速响应", protocol: "dashscope_sdk" },
        { id: "qwen-plus", name: "通义千问-Plus", description: "均衡性能", protocol: "dashscope_sdk" },
        { id: "qwen-max", name: "通义千问-Max", description: "最强能力", protocol: "dashscope_sdk" },
      ],
      asr: [
        { id: "qwen3-asr-flash", name: "Qwen3-ASR-Flash", description: "HTTP 调用 · 简单易用", protocol: "dashscope_sdk" },
        { id: "paraformer-v2", name: "Paraformer-v2", description: "WebSocket · 实时识别 · 精度高", protocol: "websocket" },
        { id: "sensevoice-v1", name: "SenseVoice", description: "WebSocket · 多语言 · 情感识别", protocol: "websocket" },
      ],
      tts: [
        { id: "cosyvoice-v1", name: "CosyVoice", description: "语音合成", protocol: "dashscope_sdk" },
      ],
      vd: [
        { id: "qwen-omni-turbo", name: "Qwen-Omni-Turbo", description: "WebSocket · 速度快 · 实时场景", protocol: "websocket" },
        { id: "qwen3-omni-flash", name: "Qwen3-Omni-Flash", description: "WebSocket · 最新版 · 效果好", protocol: "websocket" },
      ],
    },
    openai: {
      llm: [
        { id: "gpt-4o", name: "GPT-4o", description: "最新多模态", protocol: "openai_compatible" },
        { id: "gpt-4-turbo", name: "GPT-4 Turbo", description: "高性能" },
        { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", description: "经济选择" },
      ],
    },
  };
  return models[provider]?.[modelType] || [];
};

// 音色选项（TTS）
const getVoiceOptions = () => [
  { id: "Cherry", name: "Cherry", description: "甜美女声" },
  { id: "Ethan", name: "Ethan", description: "沉稳男声" },
];

interface TestResult {
  success: boolean;
  message: string;
  latency_ms?: number;
}

type ModalStep = "closed" | "form" | "testing" | "success" | "error";

export default function CapabilityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const type = params.type as string;
  const { token } = useAuthStore();

  const capability = capabilities.find(c => c.type === type);

  const [models, setModels] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // 弹窗状态
  const [modalStep, setModalStep] = useState<ModalStep>("closed");
  const [modalProvider, setModalProvider] = useState("dashscope");
  const [modalModel, setModalModel] = useState("");
  const [modalApiKey, setModalApiKey] = useState("");
  const [modalBaseUrl, setModalBaseUrl] = useState("");
  const [modalProtocol, setModalProtocol] = useState("openai_compatible");
  const [modalTerminalType, setModalTerminalType] = useState("web");
  const [modalVoice, setModalVoice] = useState("Cherry");
  const [modalError, setModalError] = useState("");
  const [modalLatency, setModalLatency] = useState(0);

  const modelOptions = getModelOptions(modalProvider, type);
  const voiceOptions = getVoiceOptions();
  const isTTS = type === "tts";

  useEffect(() => {
    adminApi.setToken(token || null);
    if (token && type) {
      fetchModels();
    } else {
      setLoading(false);
    }
  }, [token, type]);

  const fetchModels = async () => {
    try {
      const data = await adminApi.listModelConfigs({ model_type: type });
      setModels(data);
    } catch (error) {
      console.error("Failed to fetch models:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (model: ModelConfig) => {
    try {
      await adminApi.updateModelConfig(model.id, { is_active: !model.is_active });
      fetchModels();
    } catch (error) {
      console.error("Failed to toggle active:", error);
    }
  };

  const handleSetDefault = async (model: ModelConfig) => {
    try {
      await adminApi.setDefaultModel(model.id);
      fetchModels();
    } catch (error) {
      console.error("Failed to set default:", error);
    }
  };

  const handleTest = async (model: ModelConfig) => {
    setTestingId(model.id);
    setTestResults(prev => ({ ...prev, [model.id]: { success: false, message: "测试中..." } }));

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/v1"}/admin/models/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model_type: model.model_type,
          provider: model.provider,
          model_name: model.model_name,
          config: model.config,
        }),
      });

      const result = await response.json();
      setTestResults(prev => ({ ...prev, [model.id]: result }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [model.id]: { success: false, message: "测试失败" },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await adminApi.deleteModelConfig(id);
      setDeleteConfirm(null);
      fetchModels();
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  // 弹窗操作
  const openAddModal = () => {
    setModalStep("form");
    setModalProvider("dashscope");
    setModalModel("");
    setModalApiKey("");
    setModalBaseUrl("");
    setModalProtocol("dashscope_sdk");
    setModalTerminalType("web");
    setModalError("");
    // 自动选择第一个模型
    const options = getModelOptions("dashscope", type);
    if (options.length > 0) {
      setModalModel(options[0].id);
      // 根据模型设置 protocol
      if (options[0].protocol) {
        setModalProtocol(options[0].protocol);
      }
    }
  };

  const closeAddModal = () => {
    setModalStep("closed");
  };

  // 切换服务商时自动更新模型选项
  const handleProviderChange = (providerId: string) => {
    setModalProvider(providerId);
    // 自动选择第一个模型并设置对应的 protocol
    const options = getModelOptions(providerId, type);
    if (options.length > 0) {
      setModalModel(options[0].id);
      setModalProtocol(options[0].protocol || (providerId === "dashscope" ? "dashscope_sdk" : "openai_compatible"));
    } else {
      setModalModel("");
      setModalProtocol(providerId === "dashscope" ? "dashscope_sdk" : "openai_compatible");
    }
  };

  // 切换模型时自动更新 protocol
  const handleModelChange = (modelId: string) => {
    setModalModel(modelId);
    const options = getModelOptions(modalProvider, type);
    const selected = options.find(m => m.id === modelId);
    if (selected?.protocol) {
      setModalProtocol(selected.protocol);
    }
  };

  const handleTestAndSave = async () => {
    setModalStep("testing");
    setModalError("");

    try {
      const config: Record<string, any> = {
        api_key: modalApiKey,
        protocol: modalProtocol,  // 传递调用方式
      };
      
      if (modalBaseUrl) config.base_url = modalBaseUrl;
      if (isTTS && modalVoice) config.voice = modalVoice;

      // 测试
      const testResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/v1"}/admin/models/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model_type: type,
          provider: modalProvider,
          model_name: modalModel,
          config,
        }),
      });

      const testResult = await testResponse.json();

      if (!testResult.success) {
        setModalError(testResult.message || "测试失败");
        setModalStep("error");
        return;
      }

      setModalLatency(testResult.latency_ms || 0);

      // 保存
      adminApi.setToken(token);
      await adminApi.createModelConfig({
        model_type: type as "llm" | "asr" | "tts",
        model_name: modalModel,
        provider: modalProvider,
        config,
        terminal_type: modalTerminalType,
      });

      setModalStep("success");
      setTimeout(() => {
        fetchModels();
        closeAddModal();
      }, 1500);
    } catch (err) {
      setModalError("网络错误");
      setModalStep("error");
    }
  };

  // 无效类型
  if (!capability) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push("/admin/ai-config")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          返回能力列表
        </button>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">未知的能力类型</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <button
        onClick={() => router.push("/admin/ai-config")}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        返回能力列表
      </button>

      {/* 页头 */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className={cn(
            "w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center"
          )}>
            <capability.icon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{capability.label}</h1>
            <p className="text-sm text-gray-500">{capability.description}</p>
          </div>
        </div>
      </div>

      {/* 模型列表 */}
      {loading ? (
        <div className="text-gray-500 py-8 text-center">加载中...</div>
      ) : models.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <capability.icon className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-900 font-medium mb-1">暂未配置任何模型</p>
          <p className="text-sm text-gray-500 mb-6">需要阿里云或 OpenAI 的 API Key</p>
          <button
            onClick={openAddModal}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            添加第一个模型
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 有模型时显示添加按钮 */}
          <div className="flex justify-end">
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              添加模型
            </button>
          </div>
          {models.map(model => (
            <div
              key={model.id}
              className={cn(
                "bg-white rounded-xl border p-6",
                model.is_default ? "border-blue-200 bg-blue-50/30" : "border-gray-200"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-gray-900">{model.model_name}</span>
                    {model.is_default && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                        <Star className="w-3 h-3 fill-blue-500" />
                        默认
                      </span>
                    )}
                    <span className={cn(
                      "text-xs font-medium",
                      model.is_active ? "text-emerald-600" : "text-gray-400"
                    )}>
                      {model.is_active ? "已启用" : "已禁用"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {model.provider} · {model.terminal_type || "Web"}
                  </div>
                  {testResults[model.id] && (
                    <div className={cn(
                      "text-sm mt-2",
                      testResults[model.id].success ? "text-emerald-600" : "text-red-600"
                    )}>
                      {testResults[model.id].success 
                        ? `✓ 测试通过 (${testResults[model.id].latency_ms}ms)`
                        : `✗ ${testResults[model.id].message}`
                      }
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTest(model)}
                    disabled={testingId === model.id}
                    className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {testingId === model.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "测试"
                    )}
                  </button>
                  <button
                    onClick={() => handleToggleActive(model)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {model.is_active ? (
                      <ToggleRight className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                  </button>
                  {!model.is_default && (
                    <button
                      onClick={() => handleSetDefault(model)}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      设为默认
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteConfirm(model.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 添加模型弹窗 - 一步完成 */}
      {modalStep !== "closed" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden shadow-2xl">
            {/* 头部 */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {modalStep === "form" && "添加模型"}
                {modalStep === "testing" && "测试连接"}
                {modalStep === "success" && "配置成功"}
                {modalStep === "error" && "配置失败"}
              </h2>
              <button onClick={closeAddModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 内容 */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {/* 表单 - 一步完成 */}
              {modalStep === "form" && (
                <div className="space-y-5">
                  {/* 服务商选择 - radio 样式 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">选择服务商</label>
                    <div className="space-y-2">
                      {providers.slice(0, 2).map((p) => (
                        <label
                          key={p.id}
                          className={cn(
                            "flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all",
                            modalProvider === p.id
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          )}
                        >
                          <input
                            type="radio"
                            name="provider"
                            value={p.id}
                            checked={modalProvider === p.id}
                            onChange={() => handleProviderChange(p.id)}
                            className="mt-0.5 w-4 h-4 text-blue-600"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{p.name}</span>
                              {p.recommended && (
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                  推荐
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">{p.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* API Key */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API Key <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={modalApiKey}
                      onChange={(e) => setModalApiKey(e.target.value)}
                      placeholder="输入 API Key"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1.5">
                      在{modalProvider === "dashscope" ? "阿里云控制台" : "OpenAI 官网"}获取
                    </p>
                  </div>

                  {/* 模型名称 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      模型名称 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={modalModel}
                      onChange={(e) => setModalModel(e.target.value)}
                      placeholder={modalProvider === "dashscope" 
                        ? "如 qwen-omni-turbo, qwen3-asr-flash" 
                        : "如 gpt-4o, gpt-3.5-turbo"}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1.5">
                      在{modalProvider === "dashscope" ? "阿里云模型广场" : "OpenAI 文档"}查看可用模型
                    </p>
                  </div>

                  {/* OpenAI Base URL */}
                  {modalProvider === "openai" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
                      <input
                        type="text"
                        value={modalBaseUrl}
                        onChange={(e) => setModalBaseUrl(e.target.value)}
                        placeholder="https://api.openai.com/v1"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1.5">留空则使用官方地址</p>
                    </div>
                  )}

                  {/* TTS 音色 */}
                  {isTTS && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">音色</label>
                      <select
                        value={modalVoice}
                        onChange={(e) => setModalVoice(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {voiceOptions.map((v) => (
                          <option key={v.id} value={v.id}>{v.name} - {v.description}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* 测试中 */}
              {modalStep === "testing" && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                  <p className="text-gray-600">正在测试连接...</p>
                </div>
              )}

              {/* 成功 */}
              {modalStep === "success" && (
                <div className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="w-12 h-12 text-green-600 mb-4" />
                  <p className="text-gray-900 font-medium">测试成功</p>
                  <p className="text-sm text-gray-500">延迟: {modalLatency}ms</p>
                </div>
              )}

              {/* 失败 */}
              {modalStep === "error" && (
                <div className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
                  <p className="text-gray-900 font-medium">测试失败</p>
                  <p className="text-sm text-red-600">{modalError}</p>
                </div>
              )}
            </div>

            {/* 底部按钮 */}
            {modalStep === "form" && (
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={closeAddModal}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  取消
                </button>
                <button
                  onClick={handleTestAndSave}
                  disabled={!modalModel || !modalApiKey}
                  className={cn(
                    "px-5 py-2 rounded-lg font-medium transition-colors",
                    !modalModel || !modalApiKey
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  )}
                >
                  测试并保存
                </button>
              </div>
            )}

            {modalStep === "error" && (
              <div className="px-6 py-4 border-t border-gray-200 flex justify-center">
                <button
                  onClick={() => setModalStep("form")}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  返回修改
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 删除确认 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium mb-2">确认删除</h3>
            <p className="text-gray-500 text-sm mb-4">确定要删除这个模型配置吗？此操作不可撤销。</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}