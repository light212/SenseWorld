"use client";

import { useEffect, useState } from "react";
import { adminApi, type RequestLog, type RequestLogDetail } from "@/services/adminApi";
import { useAuthStore } from "@/stores/authStore";
import { LogTable } from "@/components/admin/LogTable";
import { LogDetailDrawer } from "@/components/admin/LogDetailDrawer";

export default function AdminLogsPage() {
  const { token } = useAuthStore();
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState("");
  const [status, setStatus] = useState("");
  const [selectedLog, setSelectedLog] = useState<RequestLogDetail | null>(null);

  useEffect(() => {
    adminApi.setToken(token || null);
    if (token) {
      fetchLogs();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchLogs = async () => {
    try {
      setError(null);
      const data = await adminApi.listRequestLogs({
        date_range: "week",
        conversation_id: conversationId || undefined,
        status: status || undefined,
      });
      setLogs(data.items);
    } catch (err) {
      setError("加载日志失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (log: RequestLog) => {
    try {
      const detail = await adminApi.getRequestLog(log.id);
      setSelectedLog(detail);
    } catch {
      setError("加载日志详情失败");
    }
  };

  if (loading) {
    return <div className="text-gray-500">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">请求日志</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Conversation ID</label>
          <input
            type="text"
            value={conversationId}
            onChange={(e) => setConversationId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            placeholder="输入会话 ID"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">状态</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg"
          >
            <option value="">全部</option>
            <option value="success">成功</option>
            <option value="error">错误</option>
          </select>
        </div>
        <button
          onClick={fetchLogs}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          查询
        </button>
      </div>

      <LogTable logs={logs} onSelect={openDetail} />
      <LogDetailDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}
