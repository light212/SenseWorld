"use client";

import { useEffect, useState } from "react";
import { adminApi, type UsageSummary, type UsageTrendPoint } from "@/services/adminApi";
import { useAuthStore } from "@/stores/authStore";
import { UsageChart } from "@/components/admin/UsageChart";
import { UsageSummaryCards } from "@/components/admin/UsageSummaryCards";

export default function AdminUsagePage() {
  const { token } = useAuthStore();
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [trends, setTrends] = useState<UsageTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.setToken(token || null);
    if (token) {
      fetchData();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchData = async () => {
    try {
      setError(null);
      const [summaryData, trendsData] = await Promise.all([
        adminApi.getUsageSummary({ date_range: "week" }),
        adminApi.getUsageTrends({ date_range: "week", granularity: "day" }),
      ]);
      setSummary(summaryData);
      setTrends(trendsData);
    } catch (err) {
      setError("加载用量数据失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-gray-500">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">用量监控</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      <UsageSummaryCards summary={summary} />
      <UsageChart data={trends.map((item) => ({
        timestamp: item.timestamp,
        calls: item.calls,
        cost: item.cost,
      }))} />
    </div>
  );
}
