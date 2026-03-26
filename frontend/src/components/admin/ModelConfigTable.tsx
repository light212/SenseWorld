"use client";

import { Edit, Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModelConfig } from "@/services/adminApi";

interface ModelConfigTableProps {
  configs: ModelConfig[];
  onEdit: (config: ModelConfig) => void;
  onDelete: (config: ModelConfig) => void;
  onSetDefault: (config: ModelConfig) => void;
}

export function ModelConfigTable({
  configs,
  onEdit,
  onDelete,
  onSetDefault,
}: ModelConfigTableProps) {
  if (configs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
        暂无模型配置
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="text-left px-4 py-3">模型</th>
            <th className="text-left px-4 py-3">类型</th>
            <th className="text-left px-4 py-3">终端</th>
            <th className="text-left px-4 py-3">价格</th>
            <th className="text-left px-4 py-3">状态</th>
            <th className="text-left px-4 py-3">更新</th>
            <th className="text-right px-4 py-3">操作</th>
          </tr>
        </thead>
        <tbody>
          {configs.map((config) => (
            <tr key={config.id} className="border-t">
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{config.model_name}</div>
                <div className="text-xs text-gray-500">{config.provider}</div>
              </td>
              <td className="px-4 py-3 uppercase text-xs text-gray-600">{config.model_type}</td>
              <td className="px-4 py-3 text-xs text-gray-600">{config.terminal_type}</td>
              <td className="px-4 py-3 text-xs text-gray-600">
                {config.price_per_1k_input_tokens.toFixed(4)} / {config.price_per_1k_output_tokens.toFixed(4)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs",
                    config.is_active
                      ? "bg-green-50 text-green-600"
                      : "bg-gray-100 text-gray-500"
                  )}
                >
                  {config.is_active ? "启用" : "停用"}
                </span>
                {config.is_default && (
                  <span className="ml-2 inline-flex items-center text-xs text-blue-600">
                    <Star className="w-3 h-3 mr-1" />
                    默认
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {new Date(config.updated_at).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right space-x-2">
                <button
                  onClick={() => onSetDefault(config)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  设为默认
                </button>
                <button
                  onClick={() => onEdit(config)}
                  className="inline-flex items-center text-xs text-gray-600 hover:text-gray-800"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  编辑
                </button>
                <button
                  onClick={() => onDelete(config)}
                  className="inline-flex items-center text-xs text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  删除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
