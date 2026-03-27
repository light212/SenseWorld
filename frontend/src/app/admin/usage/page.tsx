"use client";

import { useEffect, useState } from "react";
import { Calendar, TrendingUp, DollarSign, Zap } from "lucide-react";
import { adminApi, type UsageSummary, type UsageTrendPoint } from "@/services/adminApi";
import { useAuthStore } from "@/stores/authStore";
import { UsageChart } from "@/components/admin/UsageChart";
import { UsageSummaryCards } from "@/components/admin/UsageSummaryCards";

const dateRanges = [
  { id: "today", label: "今日" },
  { id: "week", label: "本周" },
  { id: "month", label: "本月" },
];

export default function AdminUsagePage() {
  const { token } = useAuthStore();
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [trends, setTrends] = useState<UsageTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("week");

  useEffect(() => {
    adminApi.setToken(token || null);
    if (token) {
      fetchData();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, dateRange]);

  const fetchData = async () => {
    try {
      setError(null);
      setLoading(true);
      const [summaryData, trendsData] = await Promise.all([
        adminApi.getUsageSummary({ date_range: dateRange }),
        adminApi.getUsageTrends({ date_range: dateRange, granularity: "day" }),
      ]);
      setSummary(summaryData);
      setTrends(trendsData);
    } catch (err) {
      setError("加载用量数据失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">用量监控</h1>
          <p className="text-sm text-gray-500 mt-1">查看 API 调用和费用统计</p>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm p-1">
          {dateRanges.map((range) => (
            <button
              key={range.id}
              onClick={() => setDateRange(range.id)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                dateRange === range.id
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl flex items-center gap-2">
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-5 shadow-sm">
              <div className="h-11 w-11 bg-gray-100 rounded-xl animate-pulse mb-4" />
              <div className="h-8 w-20 bg-gray-100 rounded animate-pulse mb-2" />
              <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <UsageSummaryCards summary={summary} />
      )}

      {/* Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">趋势图表</h2>
        {loading ? (
          <div className="h-64 bg-gray-50 rounded-lg animate-pulse" />
        ) : (
          <UsageChart data={trends.map((item) => ({
            timestamp: item.timestamp,
            calls: item.calls,
            cost: item.cost,
          }))} />
        )}
      </div>
    </div>
  );
}
