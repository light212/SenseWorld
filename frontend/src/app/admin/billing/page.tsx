"use client";

import { useEffect, useState } from "react";
import { DollarSign, MessageCircle, Mic, Volume2, Video, ChevronDown, Zap } from "lucide-react";
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
  vd: { label: "看的能力", icon: Video, color: "bg-amber-500" },
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
  const totalCalls = summary?.total_calls || 0;
  const totalTokens = (summary?.total_input_tokens || 0) + (summary?.total_output_tokens || 0);

  return (
    <div className="space-y-6">
      {/* Header with dropdown */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">费用与统计</h1>
          <p className="text-gray-500 mt-1">了解 AI 服务的使用情况和费用</p>
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

      {/* 核心指标 - 统一白色背景 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <DollarSign className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-500">总费用</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {loading ? (
              <div className="h-9 w-24 bg-gray-100 rounded animate-pulse" />
            ) : (
              `¥${totalCost.toFixed(2)}`
            )}
          </div>
        </div>
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

      {/* 费用趋势 */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">费用趋势</h2>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="h-48 flex items-center justify-center text-gray-400">加载中...</div>
          ) : trends.length > 0 ? (
            <div className="h-48 flex items-end gap-2">
              {trends.map((point, index) => {
                const maxCost = Math.max(...trends.map(t => t.cost), 0.01);
                const height = maxCost > 0 ? (point.cost / maxCost) * 100 : 0;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2 min-w-0 group">
                    <div className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      ¥{point.cost.toFixed(2)}
                    </div>
                    <div 
                      className="w-full bg-blue-500 hover:bg-blue-600 rounded-t transition-colors cursor-pointer min-h-[4px]" 
                      style={{ height: `${Math.max(height, 2)}%` }} 
                    />
                    <span className="text-xs text-gray-400 truncate">
                      {dateRange === "today" 
                        ? `${new Date(point.timestamp).getHours()}:00` 
                        : new Date(point.timestamp).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })
                      }
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400">暂无数据</div>
          )}
        </div>
      </div>

      {/* 各能力费用 */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">各能力费用占比</h2>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="h-32 flex items-center justify-center text-gray-400">加载中...</div>
          ) : byModel.length > 0 ? (
            <div className="space-y-4">
              {byModel.map(stat => {
                const cap = capabilityLabels[stat.model_type] || { label: stat.model_type, icon: MessageCircle, color: "bg-gray-500" };
                const percentage = summary?.total_cost ? (stat.cost / summary.total_cost) * 100 : 0;
                const Icon = cap.icon;
                return (
                  <div key={stat.model_type + stat.model_name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700">{cap.label}</span>
                        <span className="text-gray-400">· {stat.model_name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-gray-900">¥{stat.cost.toFixed(2)}</span>
                        <span className="text-gray-400 ml-2">{percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", cap.color)} style={{ width: `${Math.min(percentage, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-32 flex flex-col items-center justify-center text-gray-400">
              <DollarSign className="w-8 h-8 mb-2 opacity-50" />
              <p>暂无费用数据</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
