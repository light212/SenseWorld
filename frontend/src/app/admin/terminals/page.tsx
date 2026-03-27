"use client";

import { useEffect, useState } from "react";
import { Monitor, Plus, RefreshCw, Check, X } from "lucide-react";
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

const defaultForm: TerminalFormState = {
  type: "web",
  name: "Web",
  config_overrides: "{}",
  feature_flags: "{}",
  is_active: true,
};

export default function AdminTerminalsPage() {
  const { token } = useAuthStore();
  const [terminals, setTerminals] = useState<TerminalConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<TerminalFormState>(defaultForm);

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
      setLoading(true);
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
      setSaving(true);
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

      setForm(defaultForm);
      setShowForm(false);
      fetchTerminals();
    } catch {
      setError("保存终端配置失败，请检查 JSON 格式");
    } finally {
      setSaving(false);
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
    setShowForm(true);
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

  const cancelEdit = () => {
    setEditingId(null);
    setForm(defaultForm);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">终端管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理不同终端的配置和功能开关</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTerminals}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm(defaultForm); }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg shadow-sm hover:from-blue-700 hover:to-blue-600 transition-all"
          >
            <Plus className="w-4 h-4" />
            新增终端
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl flex items-center gap-2">
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingId ? "编辑终端" : "新增终端"}
            </h2>
            <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">终端类型</label>
                <input
                  type="text"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  placeholder="web / ios / android"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">显示名称</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Web 端"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">配置覆盖 (JSON)</label>
                <textarea
                  value={form.config_overrides}
                  onChange={(e) => setForm({ ...form, config_overrides: e.target.value })}
                  placeholder='{"key": "value"}'
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">功能开关 (JSON)</label>
                <textarea
                  value={form.feature_flags}
                  onChange={(e) => setForm({ ...form, feature_flags: e.target.value })}
                  placeholder='{"feature": true}'
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              <span className="text-sm text-gray-700">启用此终端</span>
            </div>
            
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleCreateOrUpdate}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg shadow-sm hover:from-blue-700 hover:to-blue-600 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {editingId ? "更新" : "创建"}
              </button>
              <button
                onClick={cancelEdit}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">
          <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
          <p className="text-sm">加载中...</p>
        </div>
      ) : terminals.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">
          <Monitor className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">暂无终端配置</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700"
          >
            + 创建第一个终端
          </button>
        </div>
      ) : (
        <TerminalTable terminals={terminals} onEdit={startEdit} onDelete={handleDelete} />
      )}
    </div>
  );
}
