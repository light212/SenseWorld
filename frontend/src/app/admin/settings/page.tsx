"use client";

import { useEffect, useState } from "react";
import { Settings, Save, RefreshCw } from "lucide-react";
import { adminApi, type SystemSetting } from "@/services/adminApi";
import { useAuthStore } from "@/stores/authStore";

export default function AdminSettingsPage() {
  const { token } = useAuthStore();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    adminApi.setToken(token || null);
    if (token) {
      fetchSettings();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchSettings = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await adminApi.listSettings();
      setSettings(data);
    } catch {
      setError("加载系统设置失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (key: string, value: string) => {
    try {
      setError(null);
      setSaving(key);
      await adminApi.updateSetting(key, value);
      fetchSettings();
    } catch {
      setError("更新设置失败，请检查输入");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">系统设置</h1>
          <p className="text-sm text-gray-500 mt-1">管理系统级配置参数</p>
        </div>
        <button
          onClick={fetchSettings}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          刷新
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl flex items-center gap-2">
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            ✕
          </button>
        </div>
      )}

      {/* Settings Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">
            <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
            <p className="text-sm">加载中...</p>
          </div>
        ) : settings.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无系统设置</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">设置项</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">值</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">类型</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">说明</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {settings.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">{item.key}</code>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        defaultValue={item.value}
                        className="flex-1 max-w-xs px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onBlur={(e) => {
                          if (e.target.value !== item.value) {
                            handleUpdate(item.key, e.target.value);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const input = e.target as HTMLInputElement;
                            if (input.value !== item.value) {
                              handleUpdate(item.key, input.value);
                            }
                          }
                        }}
                      />
                      {saving === item.key && (
                        <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-md ${
                      item.value_type === "string" ? "bg-blue-50 text-blue-700" :
                      item.value_type === "number" ? "bg-green-50 text-green-700" :
                      item.value_type === "boolean" ? "bg-purple-50 text-purple-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {item.value_type}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500">
                    {item.description || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Help Text */}
      <div className="text-xs text-gray-400 flex items-center gap-1">
        <Save className="w-3 h-3" />
        修改后按 Enter 或失去焦点自动保存
      </div>
    </div>
  );
}
