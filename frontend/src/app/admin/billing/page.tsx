"use client";

import { useEffect, useState } from "react";
import { DollarSign, MessageCircle, Mic, Volume2, Video, TrendingUp, AlertTriangle, Settings } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { adminApi, type UsageSummary, type UsageTrendPoint, type ModelUsageStats } from "@/services/adminApi";
import { cn } from "@/lib/utils";

type DateRange = "today" | "week" | "month";

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "today", label: "今日" },
  { value: "week", label: "本周" },
  { value: "month", label: "本月" },
];

const capabilityLabels: Record<string, { label: string; icon: typeof MessageCircle; color: string }> = {
  llm: { label: "对话能力", icon: MessageCircle, color: "bg-blue-500" },
  asr: { label: "听的能力", icon: Mic, color: "bg-emerald-500" },
  tts: { label: "说的能力", icon: Volume2, color: "bg-purple-500" },
  vd: { label: "看的能力", icon: Video, color: "bg-orange-500" },
};

export default function BillingPage() {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>("week");
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [trends, setTrends] = useState<UsageTrendPoint[]>([]);
  const [byModel, setByModel] = useState<ModelUsageStats[]>([]);

  useEffect(() => {
    adminApi.setToken(token || null);
    if (token) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [token, dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [summaryData, trendsData, byModelData] = await Promise.all([
        adminApi.getUsageSummary({ date_range: dateRange }),
        adminApi.getUsageTrends({ date_range: dateRange, granularity: dateRange === "today" ? "hour" : "day" }),
        adminApi.getUsageByModel({ date_range: dateRange }),
      ]);
      setSummary(summaryData);
      setTrends(trendsData);
      setByModel(byModelData);
    } catch (error) {
      console.error("Failed to fetch billing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalCost = summary?.total_cost || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">费用与统计</h1>
          <p className="text-sm text-gray-500 mt-1">了解 AI 服务的使用情况和费用</p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1">
          {DATE_RANGE_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => setDateRange(option.value)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                dateRange === option.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 核心指标 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-8 h-8 opacity-80" />
            <span className="text-sm opacity-80">总费用</span>
          </div>
          <div className="text-4xl font-bold">¥{loading ? "..." : totalCost.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="text-sm text-gray-500 mb-2">对话次数</div>
          <div className="text-3xl font-bold text-gray-900">{loading ? "..." : (summary?.total_calls || 0).toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="text-sm text-gray-500 mb-2">Token 用量</div>
          <div className="text-3xl font-bold text-gray-900">
            {loading ? "..." : ((summary?.total_input_tokens || 0) + (summary?.total_output_tokens || 0)).toLocaleString()}
          </div>
        </div>
      </div>

      {/* 费用趋势 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">费用趋势</h2>
        {loading ? (
          <div className="h-48 flex items-center justify-center text-gray-400">加载中...</div>
        ) : trends.length > 0 ? (
          <div className="h-48 flex items-end gap-1">
            {trends.map((point, index) => {
              const maxCost = Math.max(...trends.map(t => t.cost), 0.01);
              const height = maxCost > 0 ? (point.cost / maxCost) * 100 : 0;
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                  <div className="text-xs text-gray-500">¥{point.cost.toFixed(2)}</div>
                  <div className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t min-h-[4px]" style={{ height: `${Math.max(height, 2)}%` }} />
                  <span className="text-xs text-gray-400 truncate">
                    {dateRange === "today" ? `${new Date(point.timestamp).getHours()}:00` : new Date(point.timestamp).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-400">暂无数据</div>
        )}
      </div>

      {/* 各能力费用 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">各能力费用占比</h2>
        {loading ? (
          <div className="h-32 flex items-center justify-center text-gray-400">加载中...</div>
        ) : byModel.length > 0 ? (
          <div className="space-y-4">
            {byModel.map(stat => {
              const cap = capabilityLabels[stat.model_type] || { label: stat.model_type, icon: MessageCircle, color: "bg-gray-500" };
              const percentage = summary?.total_cost ? (stat.cost / summary.total_cost) * 100 : 0;
              return (
                <div key={stat.model_type + stat.model_name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded", cap.color)} />
                      <span className="text-gray-700">{cap.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">¥{stat.cost.toFixed(2)}</span>
                      <span className="text-gray-400 ml-2">{percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", cap.color)} style={{ width: `${Math.min(percentage, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-gray-400">暂无数据</div>
        )}
      </div>
    </div>
  );
}