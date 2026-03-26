"use client";

import { useEffect, useState } from "react";
import { adminApi, type TerminalConfig } from "@/services/adminApi";
import { useAuthStore } from "@/stores/authStore";
import { TerminalTable } from "@/components/admin/TerminalTable";

interface TerminalFormState {
  type: string;
  name: string;
  config_overrides: string;
  feature_flags: string;
  is_active: boolean;
}

export default function AdminTerminalsPage() {
  const { token } = useAuthStore();
  const [terminals, setTerminals] = useState<TerminalConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TerminalFormState>({
    type: "web",
    name: "Web",
    config_overrides: "{}",
    feature_flags: "{}",
    is_active: true,
  });

  useEffect(() => {
    adminApi.setToken(token || null);
    if (token) {
      fetchTerminals();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchTerminals = async () => {
    try {
      setError(null);
      const data = await adminApi.listTerminals();
      setTerminals(data);
    } catch {
      setError("加载终端配置失败");
    } finally {
      setLoading(false);
    }
  };

  const parseJson = (value: string) => {
    if (!value.trim()) return {};
    return JSON.parse(value);
  };

  const handleCreateOrUpdate = async () => {
    try {
      setError(null);
      const payload = {
        type: form.type,
        name: form.name,
        config_overrides: parseJson(form.config_overrides),
        feature_flags: parseJson(form.feature_flags),
        is_active: form.is_active,
      };

      if (editingId) {
        await adminApi.updateTerminal(editingId, payload);
        setEditingId(null);
      } else {
        await adminApi.createTerminal(payload);
      }

      setForm({
        type: "web",
        name: "Web",
        config_overrides: "{}",
        feature_flags: "{}",
        is_active: true,
      });
      fetchTerminals();
    } catch {
      setError("保存终端配置失败，请检查 JSON 格式");
    }
  };

  const startEdit = (terminal: TerminalConfig) => {
    setEditingId(terminal.id);
    setForm({
      type: terminal.type,
      name: terminal.name,
      config_overrides: JSON.stringify(terminal.config_overrides || {}, null, 2),
      feature_flags: JSON.stringify(terminal.feature_flags || {}, null, 2),
      is_active: terminal.is_active,
    });
  };

  const handleDelete = async (terminal: TerminalConfig) => {
    if (!confirm("确定要删除该终端配置吗？")) return;
    try {
      setError(null);
      await adminApi.deleteTerminal(terminal.id);
      fetchTerminals();
    } catch {
      setError("删除终端配置失败");
    }
  };

  if (loading) {
    return <div className="text-gray-500">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">终端管理</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">终端类型</label>
            <input
              type="text"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">显示名称</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">配置覆盖 (JSON)</label>
            <textarea
              value={form.config_overrides}
              onChange={(e) => setForm({ ...form, config_overrides: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono text-xs"
              rows={4}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">功能开关 (JSON)</label>
            <textarea
              value={form.feature_flags}
              onChange={(e) => setForm({ ...form, feature_flags: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono text-xs"
              rows={4}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          <span className="text-sm text-gray-600">启用</span>
        </div>
        <div>
          <button
            onClick={handleCreateOrUpdate}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            {editingId ? "更新" : "创建"}
          </button>
        </div>
      </div>

      <TerminalTable terminals={terminals} onEdit={startEdit} onDelete={handleDelete} />
    </div>
  );
}
