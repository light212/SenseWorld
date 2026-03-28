/**
 * SWR-based hooks for admin API data fetching.
 * Provides stale-while-revalidate caching for admin pages.
 */
import useSWR from "swr";
import { adminApi } from "@/services/adminApi";
import { useAuthStore } from "@/stores/authStore";

const DEDUPE_INTERVAL = 5000; // 5s 内相同请求去重

export function useAdminStats() {
  const { token } = useAuthStore();
  return useSWR(
    token ? ["admin-stats", token] : null,
    () => {
      adminApi.setToken(token!);
      return adminApi.getStats();
    },
    { dedupingInterval: DEDUPE_INTERVAL }
  );
}

export function useAdminModels() {
  const { token } = useAuthStore();
  return useSWR(
    token ? ["admin-models", token] : null,
    () => {
      adminApi.setToken(token!);
      return adminApi.listModelConfigs();
    },
    { dedupingInterval: DEDUPE_INTERVAL }
  );
}

export function useAdminUsage(dateRange: string) {
  const { token } = useAuthStore();
  return useSWR(
    token ? ["admin-usage", dateRange, token] : null,
    async () => {
      adminApi.setToken(token!);
      const [summary, trends, byModel] = await Promise.all([
        adminApi.getUsageSummary({ date_range: dateRange }),
        adminApi.getUsageTrends({
          date_range: dateRange,
          granularity: dateRange === "today" ? "hour" : "day",
        }),
        adminApi.getUsageByModel({ date_range: dateRange }),
      ]);
      return { summary, trends, byModel };
    },
    { dedupingInterval: DEDUPE_INTERVAL }
  );
}

// 日志相关 Hooks 已删除（日志功能已禁用）
// useAdminLogs, useAdminLatencyStats
