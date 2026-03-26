"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { adminApi, type ModelConfig } from "@/services/adminApi";
import { ModelConfigForm, type ModelConfigFormValues } from "@/components/admin/ModelConfigForm";
import { ModelConfigTable } from "@/components/admin/ModelConfigTable";

export default function AdminModelsPage() {
  const { token } = useAuthStore();
  const [configs, setConfigs] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState<ModelConfigFormValues>({
    model_type: "llm",
    model_name: "",
    provider: "dashscope",
    api_key: "",
    config_text: "{}",
    price_per_1k_input_tokens: "0",
    price_per_1k_output_tokens: "0",
    is_default: false,
    terminal_type: "all",
    is_active: true,
  });

  useEffect(() => {
    adminApi.setToken(token || null);
    if (token) {
      fetchConfigs();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchConfigs = async () => {
    try {
      setError(null);
      const data = await adminApi.listModelConfigs();
      setConfigs(data);
    } catch (error) {
      setError("加载模型配置失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const parseConfig = () => {
    if (!formData.config_text.trim()) {
      return {};
    }
    try {
      return JSON.parse(formData.config_text);
    } catch (parseError) {
      setError("配置 JSON 格式不正确");
      throw parseError;
    }
  };

  const handleCreate = async () => {
    try {
      setError(null);
      const payload = {
        model_type: formData.model_type,
        model_name: formData.model_name,
        provider: formData.provider,
        api_key: formData.api_key || undefined,
        config: parseConfig(),
        price_per_1k_input_tokens: Number(formData.price_per_1k_input_tokens || 0),
        price_per_1k_output_tokens: Number(formData.price_per_1k_output_tokens || 0),
        is_default: formData.is_default,
        terminal_type: formData.terminal_type,
        is_active: formData.is_active,
      };

      await adminApi.createModelConfig(payload);
      setShowCreate(false);
      setEditingId(null);
      setFormData({
        model_type: "llm",
        model_name: "",
        provider: "dashscope",
        api_key: "",
        config_text: "{}",
        price_per_1k_input_tokens: "0",
        price_per_1k_output_tokens: "0",
        is_default: false,
        terminal_type: "all",
        is_active: true,
      });
      fetchConfigs();
    } catch (error) {
      setError("创建配置失败，请检查输入");
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      setError(null);
      const payload: Record<string, unknown> = {
        model_name: formData.model_name,
        provider: formData.provider,
        config: parseConfig(),
        price_per_1k_input_tokens: Number(formData.price_per_1k_input_tokens || 0),
        price_per_1k_output_tokens: Number(formData.price_per_1k_output_tokens || 0),
        is_default: formData.is_default,
        terminal_type: formData.terminal_type,
        is_active: formData.is_active,
      };

      if (formData.api_key.trim()) {
        payload.api_key = formData.api_key.trim();
      }

      await adminApi.updateModelConfig(id, payload);
      setEditingId(null);
      fetchConfigs();
    } catch (error) {
      setError("更新配置失败，请检查输入");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个配置吗？")) return;

    try {
      setError(null);
      await adminApi.deleteModelConfig(id);
      fetchConfigs();
    } catch (error) {
      setError("删除配置失败，请稍后重试");
    }
  };

  const startEdit = (config: ModelConfig) => {
    setShowCreate(false);
    setEditingId(config.id);
    setFormData({
      model_type: config.model_type,
      model_name: config.model_name,
      provider: config.provider,
      api_key: "",
      config_text: JSON.stringify(config.config || {}, null, 2),
      price_per_1k_input_tokens: String(config.price_per_1k_input_tokens ?? 0),
      price_per_1k_output_tokens: String(config.price_per_1k_output_tokens ?? 0),
      is_default: config.is_default,
      terminal_type: config.terminal_type || "all",
      is_active: config.is_active,
    });
  };

  const handleSetDefault = async (config: ModelConfig) => {
    try {
      setError(null);
      await adminApi.setDefaultModel(config.id);
      fetchConfigs();
    } catch (error) {
      setError("设置默认模型失败，请稍后重试");
    }
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
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增配置
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <ModelConfigForm
          title="新增模型配置"
          submitLabel="保存"
          values={formData}
          onChange={setFormData}
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {editingId && !showCreate && (
        <ModelConfigForm
          title="编辑模型配置"
          submitLabel="更新"
          values={formData}
          onChange={setFormData}
          onSubmit={() => handleUpdate(editingId)}
          onCancel={() => setEditingId(null)}
        />
      )}

      <ModelConfigTable
        configs={configs}
        onEdit={startEdit}
        onDelete={(config) => handleDelete(config.id)}
        onSetDefault={handleSetDefault}
      />

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">类型</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">模型名称</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">提供商</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">状态</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {configs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  暂无配置
                </td>
              </tr>
            ) : (
              configs.map((config) => (
                <tr key={config.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex px-2 py-1 text-xs font-medium rounded",
                      config.model_type === "llm" && "bg-blue-100 text-blue-700",
                      config.model_type === "asr" && "bg-green-100 text-green-700",
                      config.model_type === "tts" && "bg-purple-100 text-purple-700"
                    )}>
                      {config.model_type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{config.model_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{config.provider}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex px-2 py-1 text-xs font-medium rounded",
                      config.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    )}>
                      {config.is_active ? "启用" : "禁用"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(config.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}