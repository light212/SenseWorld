"use client";

import { useEffect, useState, useCallback } from "react";
import { adminApi, type RequestLog, type RequestLogDetail, type LatencyStats } from "@/services/adminApi";
import { useAuthStore } from "@/stores/authStore";
import { LogTable } from "@/components/admin/LogTable";
import { LogDetailDrawer } from "@/components/admin/LogDetailDrawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEFAULT_PAGE_SIZE = 20;

const DATE_RANGE_OPTIONS = [
  { value: "today", label: "今天" },
  { value: "week", label: "近 7 天" },
  { value: "month", label: "近 30 天" },
];

const STATUS_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "success", label: "成功 (2xx)" },
  { value: "error", label: "错误 (4xx/5xx)" },
];

// 统计卡片组件
function StatCard({ label, value, unit, color }: { label: string; value: number | string; unit?: string; color: string }) {
  return (
    <div className={`rounded-xl p-5 ${color} shadow-sm`}>
      <div className="text-2xl font-bold tabular-nums">
        {value}
        {unit && <span className="text-sm font-normal ml-1">{unit}</span>}
      </div>
      <div className="text-sm mt-1 opacity-80">{label}</div>
    </div>
  );
}

export default function AdminLogsPage() {
  const { token } = useAuthStore();
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<RequestLogDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // 筛选条件
  const [dateRange, setDateRange] = useState("week");
  const [conversationId, setConversationId] = useState("");
  const [traceId, setTraceId] = useState("");
  const [status, setStatus] = useState("");
  
  // 分页
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, page_size: DEFAULT_PAGE_SIZE });
  
  // 统计数据
  const [stats, setStats] = useState<LatencyStats | null>(null);

  const fetchLogs = useCallback(async (page = 1) => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.listRequestLogs({
        date_range: dateRange,
        conversation_id: conversationId || undefined,
        trace_id: traceId || undefined,
        status: status || undefined,
        page,
        page_size: pageSize,
      });
      setLogs(data.items);
      setPagination({ page: data.page, pages: data.pages, total: data.total, page_size: data.page_size });
    } catch {
      setError("加载日志失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [token, dateRange, conversationId, traceId, status, pageSize]);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const data = await adminApi.getLatencyStats({ date_range: dateRange });
      setStats(data);
    } catch {
      // 静默失败，统计数据非关键
    }
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
      setDetailLoading(true);
      const detail = await adminApi.getRequestLog(log.id);
      setSelectedLog(detail);
    } catch {
      setError("加载日志详情失败");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSearch = () => {
    fetchLogs(1);
    fetchStats();
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    // 切换每页条数时回到第一页
  };

  const clearFilters = () => {
    setDateRange("week");
    setConversationId("");
    setTraceId("");
    setStatus("");
  };

  const hasFilters = conversationId || traceId || status;

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">请求日志</h1>
          <p className="text-sm text-gray-500 mt-1">追踪和分析 API 请求的性能与状态</p>
        </div>
        <button
          onClick={() => { fetchLogs(1); fetchStats(); }}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          刷新
        </button>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            label="平均响应时间" 
            value={Math.round(stats.avg)} 
            unit="ms" 
            color="bg-blue-50 text-blue-700" 
          />
          <StatCard 
            label="P50 响应时间" 
            value={stats.p50} 
            unit="ms" 
            color="bg-emerald-50 text-emerald-700" 
          />
          <StatCard 
            label="P95 响应时间" 
            value={stats.p95} 
            unit="ms" 
            color="bg-amber-50 text-amber-700" 
          />
          <StatCard 
            label="P99 响应时间" 
            value={stats.p99} 
            unit="ms" 
            color="bg-red-50 text-red-700" 
          />
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* 筛选区域 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-900">筛选条件</h2>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                清除筛选
              </button>
            )}
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 时间范围 */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">时间范围</label>
              <Select value={dateRange} onValueChange={(v) => v && setDateRange(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Trace ID */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Trace ID</label>
              <input
                type="text"
                value={traceId}
                onChange={(e) => setTraceId(e.target.value)}
                placeholder="输入 Trace ID"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 会话 ID */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">会话 ID</label>
              <input
                type="text"
                value={conversationId}
                onChange={(e) => setConversationId(e.target.value)}
                placeholder="输入会话 ID"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* 状态筛选 */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">状态</label>
              <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="全部状态" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 查询按钮 */}
            <div className="flex items-end">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    查询中...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    查询
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 日志表格 */}
      <LogTable
        logs={logs}
        onSelect={openDetail}
        pagination={pagination}
        onPageChange={fetchLogs}
        onPageSizeChange={handlePageSizeChange}
        loading={loading}
      />

      {/* 详情抽屉 */}
      <LogDetailDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />

      {/* 加载详情的覆盖层 */}
      {detailLoading && (
        <div className="fixed inset-0 z-40 bg-black/20 flex items-center justify-center">
          <div className="bg-white rounded-xl p-4 shadow-xl flex items-center gap-3">
            <svg className="w-5 h-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm text-gray-600">加载详情...</span>
          </div>
        </div>
      )}
    </div>
  );
}
