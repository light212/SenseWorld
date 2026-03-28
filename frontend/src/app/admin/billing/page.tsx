"use client";

import { useState } from "react";
import { MessageCircle, ChevronDown, Zap } from "lucide-react";
import { useAdminUsage } from "@/hooks/useAdminApi";

type DateRange = "today" | "week" | "month";

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "today", label: "今日" },
  { value: "week", label: "本周" },
  { value: "month", label: "本月" },
];

export default function BillingPage() {
  const [dateRange, setDateRange] = useState<DateRange>("week");
  const { data, isLoading: loading, error } = useAdminUsage(dateRange);
  const summary = data?.summary ?? null;

  const totalCalls = summary?.total_calls || 0;
  const totalTokens = (summary?.total_input_tokens || 0) + (summary?.total_output_tokens || 0);

  return (
    <div className="space-y-6">
      {error && <p className="text-red-500 text-sm p-4">{error}</p>}
      {/* Header with dropdown */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">使用统计</h1>
          <p className="text-gray-500 mt-1">了解 AI 服务的使用情况</p>
        </div>
        <div className="relative">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
          >
            {DATE_RANGE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* 核心指标 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <MessageCircle className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-500">调用次数</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {loading ? (
              <div className="h-9 w-24 bg-gray-100 rounded animate-pulse" />
            ) : (
              totalCalls.toLocaleString()
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <Zap className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-500">Token 用量</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {loading ? (
              <div className="h-9 w-24 bg-gray-100 rounded animate-pulse" />
            ) : (
              totalTokens.toLocaleString()
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
