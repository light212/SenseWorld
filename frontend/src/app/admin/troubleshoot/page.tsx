"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, AlertCircle, CheckCircle, X, RefreshCw, ChevronDown, FileText, Filter } from "lucide-react";
import { adminApi, type RequestLog, type RequestLogDetail, type LatencyStats } from "@/services/adminApi";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

const DATE_RANGE_OPTIONS = [
  { value: "today", label: "今天" },
  { value: "week", label: "近 7 天" },
  { value: "month", label: "近 30 天" },
];

const STATUS_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "success", label: "成功" },
  { value: "error", label: "错误" },
];

const REQUEST_TYPE_LABELS: Record<string, string> = {
  llm: "对话能力",
  asr: "听的能力",
  tts: "说的能力",
  vd: "看的能力",
};

export default function TroubleshootPage() {
  const { token } = useAuthStore();
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<RequestLogDetail | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [dateRange, setDateRange] = useState("week");
  const [searchQuery, setSearchQuery] = useState("");
  const [status, setStatus] = useState("");

  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [stats, setStats] = useState<LatencyStats | null>(null);

  const fetchLogs = useCallback(async (page = 1) => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.listRequestLogs({
        date_range: dateRange,
        conversation_id: searchQuery || undefined,
        status: status || undefined,
        page,
        page_size: 20,
      });
      setLogs(data.items);
      setPagination({ page: data.page, pages: data.pages, total: data.total });
    } catch {
      setError("加载日志失败");
    } finally {
      setLoading(false);
    }
  }, [token, dateRange, searchQuery, status]);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const data = await adminApi.getLatencyStats({ date_range: dateRange });
      setStats(data);
    } catch {}
  }, [token, dateRange]);

  useEffect(() => {
    adminApi.setToken(token || null);
    if (token) {
      fetchLogs(1);
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [token, fetchLogs, fetchStats]);

  const openDetail = async (log: RequestLog) => {
    try {
      const detail = await adminApi.getRequestLog(log.id);
      setSelectedLog(detail);
    } catch {
      setError("加载详情失败");
    }
  };

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">问题排查</h1>
          <p className="text-gray-500 mt-1">查看对话记录，定位和解决问题</p>
        </div>
        <button 
          onClick={() => { fetchLogs(1); fetchStats(); }} 
          disabled={loading} 
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          刷新
        </button>
      </div>

      {/* 性能统计 - 统一灰色边框 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900 tabular-nums">
              {Math.round(stats.avg)}<span className="text-sm font-normal text-gray-500 ml-1">ms</span>
            </div>
            <div className="text-sm text-gray-500 mt-1">平均响应</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900 tabular-nums">
              {stats.p50}<span className="text-sm font-normal text-gray-500 ml-1">ms</span>
            </div>
            <div className="text-sm text-gray-500 mt-1">P50</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900 tabular-nums">
              {stats.p95}<span className="text-sm font-normal text-gray-500 ml-1">ms</span>
            </div>
            <div className="text-sm text-gray-500 mt-1">P95</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900 tabular-nums">
              {stats.p99}<span className="text-sm font-normal text-gray-500 ml-1">ms</span>
            </div>
            <div className="text-sm text-gray-500 mt-1">P99</div>
          </div>
        </div>
      )}

      {/* 搜索 - 两行布局 */}
      <div className="bg-white rounded-xl border border-gray-200">
        {/* 第一行：搜索框 */}
        <div className="p-4 flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchLogs(1)}
              placeholder="搜索对话 ID 或 Trace ID"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button 
            onClick={() => fetchLogs(1)} 
            disabled={loading} 
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            搜索
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "px-4 py-2.5 border rounded-lg flex items-center gap-2 transition-colors",
              showFilters ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"
            )}
          >
            <Filter className="w-4 h-4" />
            筛选
            <ChevronDown className={cn("w-4 h-4 transition-transform", showFilters && "rotate-180")} />
          </button>
        </div>

        {/* 第二行：筛选条件（可折叠） */}
        {showFilters && (
          <div className="px-4 pb-4 flex gap-3 border-t border-gray-100 pt-4">
            <div className="relative">
              <select 
                value={dateRange} 
                onChange={(e) => setDateRange(e.target.value)} 
                className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DATE_RANGE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <div className="relative">
              <select 
                value={status} 
                onChange={(e) => setStatus(e.target.value)} 
                className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* 错误 */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* 日志列表 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-900 font-medium mb-1">暂无日志</p>
            <p className="text-sm text-gray-500">试试调整筛选条件或时间范围</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">时间</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">类型</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">耗时</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(log.created_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{REQUEST_TYPE_LABELS[log.request_type] || log.request_type}</td>
                  <td className="px-4 py-3">
                    {log.status_code >= 200 && log.status_code < 300 ? (
                      <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle className="w-4 h-4" />成功
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600 text-sm">
                        <AlertCircle className="w-4 h-4" />错误 {log.status_code}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm tabular-nums text-gray-600">{formatLatency(log.latency_ms)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openDetail(log)} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      查看详情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 分页 */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">共 {pagination.total} 条记录</span>
          <div className="flex gap-2">
            <button
              onClick={() => fetchLogs(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              上一页
            </button>
            <span className="px-3 py-1.5 text-gray-600">{pagination.page} / {pagination.pages}</span>
            <button
              onClick={() => fetchLogs(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages || loading}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* 详情抽屉 */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setSelectedLog(null)} />
          <div className="relative w-full max-w-lg bg-white h-full overflow-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">请求详情</h3>
              <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">基本信息</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Trace ID</span>
                    <span className="font-mono text-gray-900">{selectedLog.trace_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">时间</span>
                    <span className="text-gray-900">{new Date(selectedLog.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">处理过程</h4>
                <div className="space-y-2">
                  {selectedLog.asr_latency_ms && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600 w-20">🎤 听的能力</span>
                      <span className="text-sm tabular-nums text-gray-900">{selectedLog.asr_latency_ms}ms</span>
                      <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                    </div>
                  )}
                  {selectedLog.llm_latency_ms && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600 w-20">💬 对话能力</span>
                      <span className="text-sm tabular-nums text-gray-900">{selectedLog.llm_latency_ms}ms</span>
                      <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                    </div>
                  )}
                  {selectedLog.tts_latency_ms && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600 w-20">🔊 说的能力</span>
                      <span className="text-sm tabular-nums text-gray-900">{selectedLog.tts_latency_ms}ms</span>
                      <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                    </div>
                  )}
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-blue-700 w-20">总耗时</span>
                    <span className="text-sm font-medium tabular-nums text-blue-700">{formatLatency(selectedLog.latency_ms)}</span>
                  </div>
                </div>
              </div>
              {selectedLog.error_message && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-red-700 mb-2">错误信息</h4>
                  <pre className="text-sm text-red-600 whitespace-pre-wrap">{selectedLog.error_message}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
