"use client";

import { memo, useMemo } from "react";
import type { RequestLog } from "@/services/adminApi";
import { getApiName, getMethodStyle } from "@/lib/apiNameMapping";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

interface PaginationInfo {
  page: number;
  pages: number;
  total: number;
  page_size: number;
}

interface LogTableProps {
  logs: RequestLog[];
  onSelect: (log: RequestLog) => void;
  pagination?: PaginationInfo;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  loading?: boolean;
}

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10" },
  { value: "20", label: "20" },
  { value: "50", label: "50" },
  { value: "100", label: "100" },
];

// 状态码颜色映射
function getStatusStyle(code: number) {
  if (code >= 200 && code < 300) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
  }
  if (code >= 400 && code < 500) {
    return "bg-amber-50 text-amber-700 ring-amber-600/20";
  }
  if (code >= 500) {
    return "bg-red-50 text-red-700 ring-red-600/20";
  }
  return "bg-gray-50 text-gray-700 ring-gray-600/20";
}

// 耗时颜色映射
function getLatencyStyle(ms: number) {
  if (ms < 200) return "text-emerald-600";
  if (ms < 500) return "text-amber-600";
  return "text-red-600";
}

// 格式化时间
function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return minutes < 1 ? "刚刚" : `${minutes} 分钟前`;
  }
  
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  }
  
  return date.toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 截断 Trace ID
function truncateTraceId(id: string) {
  if (id.length <= 12) return id;
  return `${id.slice(0, 6)}...${id.slice(-4)}`;
}

// 加载骨架屏
function TableSkeleton() {
  return (
    <div className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-gray-100">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-4 bg-gray-200 rounded w-32" />
          <div className="h-5 bg-gray-200 rounded w-12" />
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-20" />
          <div className="h-4 bg-gray-200 rounded w-16 ml-auto" />
        </div>
      ))}
    </div>
  );
}

// 空状态
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 className="text-sm font-medium text-gray-900 mb-1">暂无请求日志</h3>
      <p className="text-xs text-gray-500">当有新的 API 请求时，日志会显示在这里</p>
    </div>
  );
}

// 分页组件
function Pagination({ 
  pagination, 
  onPageChange,
  onPageSizeChange 
}: { 
  pagination: PaginationInfo; 
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}) {
  const pageNumbers = useMemo(() => {
    const pages: (number | "...")[] = [];
    const { page, pages: total } = pagination;
    
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    
    pages.push(1);
    if (page > 3) pages.push("...");
    
    for (let i = Math.max(2, page - 1); i <= Math.min(total - 1, page + 1); i++) {
      pages.push(i);
    }
    
    if (page < total - 2) pages.push("...");
    pages.push(total);
    
    return pages;
  }, [pagination]);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
      <div className="flex items-center gap-4">
        <p className="text-xs text-gray-500">
          显示 <span className="font-medium text-gray-700">{(pagination.page - 1) * pagination.page_size + 1}</span>
          {" - "}
          <span className="font-medium text-gray-700">{Math.min(pagination.page * pagination.page_size, pagination.total)}</span>
          {" 共 "}
          <span className="font-medium text-gray-700">{pagination.total}</span>
          {" 条"}
        </p>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">每页</span>
          <Select
            value={String(pagination.page_size)}
            onValueChange={(v) => v && onPageSizeChange?.(Number(v))}
          >
            <SelectTrigger size="sm" className="w-16">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-gray-500">条</span>
        </div>
      </div>
      {pagination.pages > 1 && (
        <nav className="flex items-center gap-1">
          <button
            onClick={() => onPageChange?.(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="上一页"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {pageNumbers.map((num, i) => (
            num === "..." ? (
              <span key={`ellipsis-${i}`} className="px-2 text-gray-400">...</span>
            ) : (
              <button
                key={num}
                onClick={() => onPageChange?.(num)}
                className={`min-w-[32px] h-8 text-xs font-medium rounded-md transition-colors ${
                  num === pagination.page
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {num}
              </button>
            )
          ))}
          
          <button
            onClick={() => onPageChange?.(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="下一页"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </nav>
      )}
    </div>
  );
}

export const LogTable = memo(function LogTable({ 
  logs, 
  onSelect, 
  pagination, 
  onPageChange,
  onPageSizeChange,
  loading 
}: LogTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <TableSkeleton />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50/80">
            <tr className="border-b border-gray-200">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                Trace ID
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                接口
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                状态
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                耗时
              </th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                时间
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.map((log) => {
              const apiInfo = getApiName(log.request_type);
              return (
              <tr 
                key={log.id} 
                className="group hover:bg-blue-50/50 transition-colors cursor-pointer"
                onClick={() => onSelect(log)}
              >
                <td className="px-4 py-3">
                  <code className="text-xs font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                    {truncateTraceId(log.trace_id)}
                  </code>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-medium px-1 py-0.5 rounded ${getMethodStyle(apiInfo.method)}`}>
                        {apiInfo.method}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {apiInfo.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 font-mono truncate max-w-[200px]" title={apiInfo.path}>
                      {apiInfo.path}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${getStatusStyle(log.status_code)}`}>
                    {log.status_code}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-medium tabular-nums ${getLatencyStyle(log.latency_ms)}`}>
                    {log.latency_ms}
                    <span className="text-xs font-normal ml-0.5">ms</span>
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-600" title={new Date(log.created_at).toLocaleString()}>
                    {formatTime(log.created_at)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(log);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    详情
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
      {pagination && (
        <Pagination pagination={pagination} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />
      )}
    </div>
  );
});
