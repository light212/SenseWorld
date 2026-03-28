"use client";

import { useState } from "react";
import { MessageCircle, Zap, Clock, CheckCircle, AlertCircle, ChevronDown } from "lucide-react";
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
  const trends = data?.trends ?? [];
  const byModel = data?.byModel ?? [];

  const totalCalls = summary?.total_calls || 0;
  const totalTokens = (summary?.total_input_tokens || 0) + (summary?.total_output_tokens || 0);
  const avgLatency = summary?.avg_latency_ms || 0;
  const successRate = summary?.success_rate || 100;

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Header with dropdown */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">用量统计</h1>
          <p className="text-gray-500 mt-1">大模型调用计量数据</p>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={MessageCircle}
          label="调用次数"
          value={loading ? undefined : totalCalls.toLocaleString()}
          loading={loading}
        />
        <MetricCard
          icon={Zap}
          label="Token 用量"
          value={loading ? undefined : totalTokens.toLocaleString()}
          loading={loading}
        />
        <MetricCard
          icon={Clock}
          label="平均延迟"
          value={loading ? undefined : `${avgLatency.toFixed(0)}ms`}
          loading={loading}
        />
        <MetricCard
          icon={successRate >= 99 ? CheckCircle : AlertCircle}
          label="成功率"
          value={loading ? undefined : `${successRate.toFixed(1)}%`}
          loading={loading}
          color={successRate >= 99 ? "text-green-600" : "text-amber-600"}
        />
      </div>

      {/* 用量趋势 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">用量趋势</h2>
        {loading ? (
          <div className="h-40 bg-gray-100 rounded animate-pulse" />
        ) : trends.length > 0 ? (
          <div className="space-y-3">
            {trends.slice(-7).map((point: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{point.timestamp}</span>
                <div className="flex items-center gap-4">
                  <span className="text-gray-900 font-medium">{point.calls.toLocaleString()} 次</span>
                  <span className="text-gray-500">{(point.total_tokens || 0).toLocaleString()} tokens</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">暂无数据</p>
        )}
      </div>

      {/* 按模型分组 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">按模型统计</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : byModel.length > 0 ? (
          <div className="space-y-3">
            {byModel.map((model: any) => (
              <div key={`${model.model_type}-${model.model_name}`} className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">
                    {model.model_name}
                    <span className="ml-2 text-xs text-gray-500">({model.provider})</span>
                  </div>
                  <div className="text-sm text-gray-500">{model.model_type}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {model.total_tokens?.toLocaleString() ?? 0} tokens
                  </div>
                  <div className="text-xs text-gray-500">
                    {model.avg_latency_ms?.toFixed(0) ?? 0}ms • {model.calls.toLocaleString()} 次
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">暂无数据</p>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  loading,
  color = "text-gray-900",
}: {
  icon: any;
  label: string;
  value?: string;
  loading?: boolean;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3 mb-3">
        <Icon className="w-5 h-5 text-gray-400" />
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <div className={cn("text-2xl font-bold", loading ? "h-8 w-24 bg-gray-100 rounded animate-pulse" : color)}>
        {loading ? undefined : value}
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
