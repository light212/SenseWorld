"use client";

import { Edit, Trash2 } from "lucide-react";
import type { TerminalConfig } from "@/services/adminApi";

interface TerminalTableProps {
  terminals: TerminalConfig[];
  onEdit: (terminal: TerminalConfig) => void;
  onDelete: (terminal: TerminalConfig) => void;
}

export function TerminalTable({ terminals, onEdit, onDelete }: TerminalTableProps) {
  if (terminals.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
        暂无终端配置
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="text-left px-4 py-3">终端类型</th>
            <th className="text-left px-4 py-3">名称</th>
            <th className="text-left px-4 py-3">状态</th>
            <th className="text-right px-4 py-3">操作</th>
          </tr>
        </thead>
        <tbody>
          {terminals.map((terminal) => (
            <tr key={terminal.id} className="border-t">
              <td className="px-4 py-3 text-xs text-gray-600">{terminal.type}</td>
              <td className="px-4 py-3 text-xs text-gray-600">{terminal.name}</td>
              <td className="px-4 py-3 text-xs text-gray-600">
                {terminal.is_active ? "启用" : "停用"}
              </td>
              <td className="px-4 py-3 text-right space-x-2">
                <button
                  onClick={() => onEdit(terminal)}
                  className="inline-flex items-center text-xs text-gray-600 hover:text-gray-800"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  编辑
                </button>
                <button
                  onClick={() => onDelete(terminal)}
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
