"use client";

import { useEffect, useState } from "react";
import { adminApi, type SystemSetting } from "@/services/adminApi";
import { useAuthStore } from "@/stores/authStore";

export default function AdminSettingsPage() {
  const { token } = useAuthStore();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      await adminApi.updateSetting(key, value);
      fetchSettings();
    } catch {
      setError("更新设置失败，请检查输入");
    }
  };

  if (loading) {
    return <div className="text-gray-500">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">系统设置</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3">Key</th>
              <th className="text-left px-4 py-3">Value</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-right px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {settings.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-4 py-3 text-xs text-gray-600">{item.key}</td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    defaultValue={item.value}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    onBlur={(e) => {
                      if (e.target.value !== item.value) {
                        handleUpdate(item.key, e.target.value);
                      }
                    }}
                  />
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">{item.value_type}</td>
                <td className="px-4 py-3 text-right text-xs text-gray-500">保存即生效</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
