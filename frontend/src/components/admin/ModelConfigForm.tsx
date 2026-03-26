"use client";

import { Save, X } from "lucide-react";

export interface ModelConfigFormValues {
  model_type: "llm" | "asr" | "tts";
  model_name: string;
  provider: string;
  api_key: string;
  config_text: string;
  price_per_1k_input_tokens: string;
  price_per_1k_output_tokens: string;
  is_default: boolean;
  terminal_type: string;
  is_active: boolean;
}

interface ModelConfigFormProps {
  title: string;
  submitLabel: string;
  values: ModelConfigFormValues;
  onChange: (values: ModelConfigFormValues) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const modelTypes = ["llm", "asr", "tts"] as const;
const providers = ["dashscope", "openai", "other"] as const;
const terminals = ["all", "web", "ios", "android", "miniprogram"] as const;

export function ModelConfigForm({
  title,
  submitLabel,
  values,
  onChange,
  onSubmit,
  onCancel,
}: ModelConfigFormProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-medium mb-4">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">模型类型</label>
          <select
            value={values.model_type}
            onChange={(e) => onChange({ ...values, model_type: e.target.value as ModelConfigFormValues["model_type"] })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {modelTypes.map((type) => (
              <option key={type} value={type}>
                {type.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">提供商</label>
          <select
            value={values.provider}
            onChange={(e) => onChange({ ...values, provider: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {providers.map((provider) => (
              <option key={provider} value={provider}>
                {provider}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">终端类型</label>
          <select
            value={values.terminal_type}
            onChange={(e) => onChange({ ...values, terminal_type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {terminals.map((terminal) => (
              <option key={terminal} value={terminal}>
                {terminal}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">模型名称</label>
          <input
            type="text"
            value={values.model_name}
            onChange={(e) => onChange({ ...values, model_name: e.target.value })}
            placeholder="qwen3-tts-instruct-flash"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
          <input
            type="password"
            value={values.api_key}
            onChange={(e) => onChange({ ...values, api_key: e.target.value })}
            placeholder="sk-***"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">输入单价 (元/千tokens)</label>
          <input
            type="number"
            step="0.000001"
            value={values.price_per_1k_input_tokens}
            onChange={(e) => onChange({ ...values, price_per_1k_input_tokens: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">输出单价 (元/千tokens)</label>
          <input
            type="number"
            step="0.000001"
            value={values.price_per_1k_output_tokens}
            onChange={(e) => onChange({ ...values, price_per_1k_output_tokens: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">默认模型</label>
          <input
            type="checkbox"
            checked={values.is_default}
            onChange={(e) => onChange({ ...values, is_default: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">启用</label>
          <input
            type="checkbox"
            checked={values.is_active}
            onChange={(e) => onChange({ ...values, is_active: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">配置 (JSON)</label>
          <textarea
            value={values.config_text}
            onChange={(e) => onChange({ ...values, config_text: e.target.value })}
            rows={5}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={onSubmit}
          className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          <Save className="w-4 h-4" />
          {submitLabel}
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <X className="w-4 h-4" />
          取消
        </button>
      </div>
    </div>
  );
}
