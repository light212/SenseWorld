"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Edit, X, Check, Loader2, ToggleLeft, ToggleRight, Star, MoreVertical } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

interface ModelConfig {
  id: string;
  model_type: string;
  model_name: string;
  provider: string;
  protocol: string;
  config: Record<string, any>;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface TestResult {
  success: boolean;
  message: string;
  latency_ms?: number;
}

const modelTypes = ["llm", "asr", "tts", "vd"];
const providers = ["dashscope", "openai", "other"];

// 调用方式
const protocols = [
  { id: "openai_compatible", label: "OpenAI 兼容", description: "标准 Chat Completions API" },
  { id: "dashscope_sdk", label: "DashScope SDK", description: "阿里云 SDK 调用" },
  { id: "websocket", label: "WebSocket", description: "实时流式连接" },
  { id: "custom_http", label: "自定义 HTTP", description: "其他 REST API" },
];

// 模型类型中文映射
const modelTypeLabels: Record<string, string> = {
  llm: "大语言模型",
  asr: "语音识别",
  tts: "语音合成",
  vd: "视频理解",
};

// 终端类型
const terminalTypes = [
  { id: "web", label: "Web", available: true },
  { id: "ios", label: "iOS", available: false, hint: "即将支持" },
  { id: "android", label: "Android", available: false, hint: "即将支持" },
  { id: "miniprogram", label: "小程序", available: false, hint: "即将支持" },
];

// 根据调用方式返回配置字段
const getProtocolFields = (protocol: string) => {
  switch (protocol) {
    case "openai_compatible":
      return [
        { key: "base_url", label: "API Base URL", placeholder: "https://api.openai.com/v1" },
        { key: "api_key", label: "API Key", placeholder: "sk-..." },
        { key: "model", label: "模型名称", placeholder: "gpt-4" },
      ];
    case "dashscope_sdk":
      return [
        { key: "api_key", label: "API Key", placeholder: "DashScope API Key" },
        { key: "model", label: "模型名称", placeholder: "qwen-turbo" },
        { key: "voice", label: "语音（TTS）", placeholder: "Cherry" },
      ];
    case "websocket":
      return [
        { key: "ws_url", label: "WebSocket URL", placeholder: "wss://..." },
        { key: "api_key", label: "API Key", placeholder: "认证密钥" },
      ];
    case "custom_http":
      return [
        { key: "url", label: "API URL", placeholder: "https://..." },
        { key: "headers", label: "请求头 (JSON)", placeholder: '{"Authorization": "Bearer ..."}' },
        { key: "auth_type", label: "认证方式", placeholder: "bearer / api_key" },
      ];
    default:
      return [];
  }
};

export default function AdminModelsPage() {
  const { token } = useAuthStore();
  const [configs, setConfigs] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [configJson, setConfigJson] = useState("{}");
  const [formData, setFormData] = useState({
    model_type: "llm",
    model_name: "",
    provider: "dashscope",
    protocol: "openai_compatible",
    config: {} as Record<string, any>,
  });

  useEffect(() => {
    fetchConfigs();
  }, [token]);

  const fetchConfigs = async () => {
    try {
      const response = await fetch("http://localhost:8000/v1/admin/models", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setConfigs(data);
      }
    } catch (error) {
      console.error("Failed to fetch configs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const config = JSON.parse(configJson);
      const response = await fetch("http://localhost:8000/v1/admin/models", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...formData, config }),
      });

      if (response.ok) {
        setShowCreate(false);
        resetForm();
        fetchConfigs();
      } else {
        const error = await response.json();
        alert(error.detail || "创建失败");
      }
    } catch (error) {
      console.error("Failed to create config:", error);
      alert("操作失败");
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const config = JSON.parse(configJson);
      const response = await fetch(`http://localhost:8000/v1/admin/models/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...formData, config }),
      });

      if (response.ok) {
        setEditingId(null);
        resetForm();
        fetchConfigs();
      } else {
        const error = await response.json();
        alert(error.detail || "更新失败");
      }
    } catch (error) {
      console.error("Failed to update config:", error);
      alert("操作失败");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:8000/v1/admin/models/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setDeleteConfirm(null);
        fetchConfigs();
      }
    } catch (error) {
      console.error("Failed to delete config:", error);
    }
  };

  const handleToggleActive = async (config: ModelConfig) => {
    try {
      const response = await fetch(`http://localhost:8000/v1/admin/models/${config.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !config.is_active }),
      });

      if (response.ok) {
        fetchConfigs();
      }
    } catch (error) {
      console.error("Failed to toggle active:", error);
    }
  };

  const handleSetDefault = async (config: ModelConfig) => {
    try {
      const response = await fetch(`http://localhost:8000/v1/admin/models/${config.id}/set-default`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        fetchConfigs();
      }
    } catch (error) {
      console.error("Failed to set default:", error);
    }
  };

  const handleTest = async (config: ModelConfig) => {
    setTestingId(config.id);
    setTestResults((prev) => ({ ...prev, [config.id]: { success: false, message: "测试中..." } }));

    try {
      const response = await fetch("http://localhost:8000/v1/admin/models/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model_type: config.model_type,
          provider: config.provider,
          model_name: config.model_name,
          config: config.config,
        }),
      });

      const result = await response.json();
      setTestResults((prev) => ({ ...prev, [config.id]: result }));
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [config.id]: { success: false, message: "测试失败" },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const startEdit = (config: ModelConfig) => {
    setEditingId(config.id);
    setFormData({
      model_type: config.model_type,
      model_name: config.model_name,
      provider: config.provider,
      protocol: config.protocol || "openai_compatible",
      config: config.config,
    });
    setConfigJson(JSON.stringify(config.config, null, 2));
  };

  const resetForm = () => {
    setFormData({
      model_type: "llm",
      model_name: "",
      provider: "dashscope",
      protocol: "openai_compatible",
      config: {},
    });
    setConfigJson("{}");
  };

  if (loading) {
    return <div className="text-gray-500">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">模型配置</h1>
        <button
          onClick={() => {
            setShowCreate(true);
            resetForm();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增配置
        </button>
      </div>

      {/* Create/Edit Form */}
      {(showCreate || editingId) && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-medium mb-4">
            {showCreate ? "新增模型配置" : "编辑模型配置"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 模型类型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">模型类型</label>
              <select
                value={formData.model_type}
                onChange={(e) => setFormData({ ...formData, model_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {modelTypes.map((type) => (
                  <option key={type} value={type}>
                    {modelTypeLabels[type] || type.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            
            {/* 提供商 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">提供商</label>
              <select
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {providers.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            
            {/* 模型名称 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">模型名称</label>
              <input
                type="text"
                value={formData.model_name}
                onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                placeholder="qwen3-tts-instruct-flash"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 调用方式 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">调用方式</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {protocols.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, protocol: p.id })}
                    className={cn(
                      "p-3 rounded-lg border text-left transition-colors",
                      formData.protocol === p.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <div className="font-medium text-sm">{p.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{p.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 动态配置字段 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">配置参数</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {getProtocolFields(formData.protocol).map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs text-gray-600 mb-1">{field.label}</label>
                    <input
                      type="text"
                      placeholder={field.placeholder}
                      value={formData.config?.[field.key] || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          config: { ...formData.config, [field.key]: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 高级配置 (JSON) */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                高级配置 (JSON)
              </label>
              <textarea
                value={configJson}
                onChange={(e) => setConfigJson(e.target.value)}
                rows={3}
                placeholder='{"custom_field": "value"}'
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>

            {/* 终端类型 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                适用终端
              </label>
              <div className="flex flex-wrap gap-2">
                {terminalTypes.map((terminal) => (
                  <button
                    key={terminal.id}
                    type="button"
                    disabled={!terminal.available}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      terminal.available
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    )}
                    title={terminal.available ? "" : terminal.hint}
                  >
                    {terminal.label}
                    {!terminal.available && (
                      <span className="ml-1 text-xs">({terminal.hint})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => (showCreate ? handleCreate() : handleUpdate(editingId!))}
              className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Check className="w-4 h-4" />
              保存
            </button>
            <button
              onClick={() => {
                setShowCreate(false);
                setEditingId(null);
                resetForm();
              }}
              className="flex items-center gap-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <X className="w-4 h-4" />
              取消
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">类型</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">模型名称</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">提供商</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">调用方式</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">终端</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">状态</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">默认</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">测试</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {configs.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                  暂无配置，点击"新增配置"添加
                </td>
              </tr>
            ) : (
              configs.map((config) => (
                <tr key={config.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex px-2 py-1 text-xs font-medium rounded",
                        config.model_type === "llm" && "bg-blue-100 text-blue-700",
                        config.model_type === "asr" && "bg-green-100 text-green-700",
                        config.model_type === "tts" && "bg-purple-100 text-purple-700",
                        config.model_type === "vd" && "bg-orange-100 text-orange-700"
                      )}
                    >
                      {modelTypeLabels[config.model_type] || config.model_type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{config.model_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{config.provider}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-600">
                      {protocols.find((p) => p.id === config.protocol)?.label || config.protocol}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-blue-50 text-blue-600">
                      Web
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(config)}
                      className={cn(
                        "flex items-center gap-1 text-xs font-medium transition-colors",
                        config.is_active ? "text-green-600" : "text-gray-400"
                      )}
                    >
                      {config.is_active ? (
                        <>
                          <ToggleRight className="w-4 h-4" />
                          启用
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-4 h-4" />
                          禁用
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleSetDefault(config)}
                      className={cn(
                        "flex items-center gap-1 text-xs font-medium transition-colors",
                        config.is_default ? "text-yellow-600" : "text-gray-400 hover:text-gray-600"
                      )}
                    >
                      <Star className={cn("w-4 h-4", config.is_default && "fill-yellow-500")} />
                      {config.is_default ? "默认" : "设为默认"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleTest(config)}
                      disabled={testingId === config.id}
                      className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                      {testingId === config.id ? (
                        <Loader2 className="w-3 h-3 animate-spin inline" />
                      ) : testResults[config.id]?.success ? (
                        <span className="text-green-600">✓ {testResults[config.id].latency_ms}ms</span>
                      ) : testResults[config.id] ? (
                        <span className="text-red-600 text-xs">{testResults[config.id].message}</span>
                      ) : (
                        "测试"
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEdit(config)}
                        className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(config.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium mb-2">确认删除</h3>
            <p className="text-gray-500 text-sm mb-4">
              确定要删除这个模型配置吗？此操作不可撤销。
            </p>
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