"use client";

import { useEffect, useRef } from "react";
import type { RequestLogDetail } from "@/services/adminApi";
import { getApiName, getMethodStyle } from "@/lib/apiNameMapping";

interface LogDetailDrawerProps {
  log: RequestLogDetail | null;
  onClose: () => void;
}

// 状态码颜色映射
function getStatusStyle(code: number) {
  if (code >= 200 && code < 300) {
    return { bg: "bg-emerald-500", text: "text-emerald-700", label: "成功" };
  }
  if (code >= 400 && code < 500) {
    return { bg: "bg-amber-500", text: "text-amber-700", label: "客户端错误" };
  }
  if (code >= 500) {
    return { bg: "bg-red-500", text: "text-red-700", label: "服务端错误" };
  }
  return { bg: "bg-gray-500", text: "text-gray-700", label: "未知" };
}

// 耗时评级
function getLatencyGrade(ms: number) {
  if (ms < 200) return { color: "text-emerald-600", label: "极快" };
  if (ms < 500) return { color: "text-amber-600", label: "正常" };
  return { color: "text-red-600", label: "较慢" };
}

// JSON 高亮显示
function JsonViewer({ data, title }: { data: string | Record<string, unknown> | null | undefined; title: string }) {
  if (!data) return null;
  
  const content = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</h4>
      <div className="relative">
        <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs font-mono overflow-auto max-h-64 scrollbar-thin">
          {content}
        </pre>
        <button
          onClick={() => navigator.clipboard.writeText(content)}
          className="absolute top-2 right-2 p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
          title="复制"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// 信息行组件
function InfoRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className={`text-sm text-gray-900 text-right ml-4 ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

export function LogDetailDrawer({ log, onClose }: LogDetailDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (log) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [log, onClose]);

  if (!log) return null;

  const statusStyle = getStatusStyle(log.status_code);
  const latencyGrade = getLatencyGrade(log.latency_ms);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Drawer */}
      <div 
        ref={drawerRef}
        className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl flex flex-col transform transition-transform duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${statusStyle.bg}`} />
            <h2 className="text-lg font-semibold text-gray-900">请求详情</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="关闭"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {/* 概览卡片 */}
          <div className="p-6 border-b border-gray-100">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <div className={`text-2xl font-bold ${statusStyle.text}`}>{log.status_code}</div>
                <div className="text-xs text-gray-500 mt-1">{statusStyle.label}</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <div className={`text-2xl font-bold tabular-nums ${latencyGrade.color}`}>{log.latency_ms}</div>
                <div className="text-xs text-gray-500 mt-1">{latencyGrade.label} · ms</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                {(() => {
                  const apiInfo = getApiName(log.request_type);
                  return (
                    <>
                      <div className="flex items-center justify-center gap-2">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${getMethodStyle(apiInfo.method)}`}>
                          {apiInfo.method}
                        </span>
                        <span className="text-base font-semibold text-gray-700">{apiInfo.name}</span>
                      </div>
                      <div className="text-xs text-gray-400 font-mono mt-1 truncate" title={apiInfo.path}>
                        {apiInfo.path}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* 基本信息 */}
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">基本信息</h3>
            <div className="bg-gray-50 rounded-xl px-4">
              <InfoRow label="Trace ID" value={log.trace_id} mono />
              <InfoRow label="会话 ID" value={log.conversation_id || "-"} mono />
              <InfoRow label="用户 ID" value={log.user_id || "-"} mono />
              <InfoRow label="IP 地址" value={log.ip_address || "-"} mono />
              <InfoRow 
                label="时间" 
                value={new Date(log.created_at).toLocaleString("zh-CN", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })} 
              />
            </div>
          </div>

          {/* 性能指标 */}
          {(log.asr_latency_ms || log.llm_latency_ms || log.tts_latency_ms) && (
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">性能明细</h3>
              <div className="flex gap-3">
                {log.asr_latency_ms !== undefined && log.asr_latency_ms !== null && (
                  <div className="flex-1 p-3 bg-blue-50 rounded-xl text-center">
                    <div className="text-lg font-semibold text-blue-700 tabular-nums">{log.asr_latency_ms}ms</div>
                    <div className="text-xs text-blue-600">ASR</div>
                  </div>
                )}
                {log.llm_latency_ms !== undefined && log.llm_latency_ms !== null && (
                  <div className="flex-1 p-3 bg-purple-50 rounded-xl text-center">
                    <div className="text-lg font-semibold text-purple-700 tabular-nums">{log.llm_latency_ms}ms</div>
                    <div className="text-xs text-purple-600">LLM</div>
                  </div>
                )}
                {log.tts_latency_ms !== undefined && log.tts_latency_ms !== null && (
                  <div className="flex-1 p-3 bg-teal-50 rounded-xl text-center">
                    <div className="text-lg font-semibold text-teal-700 tabular-nums">{log.tts_latency_ms}ms</div>
                    <div className="text-xs text-teal-600">TTS</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 错误信息 */}
          {log.error_message && (
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-xs font-medium text-red-500 uppercase tracking-wider mb-3">错误信息</h3>
              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <p className="text-sm text-red-700">{log.error_message}</p>
              </div>
            </div>
          )}

          {/* 请求/响应体 */}
          <div className="px-6 py-4 space-y-4">
            <JsonViewer data={log.request_body} title="请求体" />
            <JsonViewer data={log.response_body} title="响应体" />
          </div>

          {/* User Agent */}
          {log.user_agent && (
            <div className="px-6 py-4 border-t border-gray-100">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">User Agent</h4>
              <p className="text-xs text-gray-600 font-mono bg-gray-50 p-3 rounded-lg break-all">
                {log.user_agent}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/50">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
