"use client";

import type { RequestLogDetail } from "@/services/adminApi";

interface LogDetailDrawerProps {
  log: RequestLogDetail | null;
  onClose: () => void;
}

export function LogDetailDrawer({ log, onClose }: LogDetailDrawerProps) {
  if (!log) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-xl p-6 overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">日志详情</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            关闭
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div><span className="text-gray-500">Trace ID:</span> {log.trace_id}</div>
          <div><span className="text-gray-500">Conversation:</span> {log.conversation_id || "-"}</div>
          <div><span className="text-gray-500">Status:</span> {log.status_code}</div>
          <div><span className="text-gray-500">Latency:</span> {log.latency_ms} ms</div>
          <div><span className="text-gray-500">Type:</span> {log.request_type}</div>
          {log.error_message && (
            <div className="text-red-600">{log.error_message}</div>
          )}
          {log.request_body && (
            <pre className="bg-gray-50 border rounded p-2 whitespace-pre-wrap text-xs">
              {typeof log.request_body === "string"
                ? log.request_body
                : JSON.stringify(log.request_body, null, 2)}
            </pre>
          )}
          {log.response_body && (
            <pre className="bg-gray-50 border rounded p-2 whitespace-pre-wrap text-xs">
              {typeof log.response_body === "string"
                ? log.response_body
                : JSON.stringify(log.response_body, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
