"use client";

import type { RequestLog } from "@/services/adminApi";

interface LogTableProps {
  logs: RequestLog[];
  onSelect: (log: RequestLog) => void;
}

export function LogTable({ logs, onSelect }: LogTableProps) {
  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
        暂无请求日志
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="text-left px-4 py-3">Trace ID</th>
            <th className="text-left px-4 py-3">会话</th>
            <th className="text-left px-4 py-3">状态</th>
            <th className="text-left px-4 py-3">耗时</th>
            <th className="text-left px-4 py-3">时间</th>
            <th className="text-right px-4 py-3">操作</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-t">
              <td className="px-4 py-3 text-xs text-gray-600">{log.trace_id}</td>
              <td className="px-4 py-3 text-xs text-gray-600">{log.conversation_id || "-"}</td>
              <td className="px-4 py-3 text-xs text-gray-600">{log.status_code}</td>
              <td className="px-4 py-3 text-xs text-gray-600">{log.latency_ms} ms</td>
              <td className="px-4 py-3 text-xs text-gray-600">
                {new Date(log.created_at).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => onSelect(log)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  查看详情
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
