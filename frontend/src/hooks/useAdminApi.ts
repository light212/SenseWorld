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

export function useAdminLogs(params: {
  dateRange: string;
  searchQuery: string;
  status: string;
  page: number;
}) {
  const { token } = useAuthStore();
  return useSWR(
    token ? ["admin-logs", params.dateRange, params.searchQuery, params.status, params.page, token] : null,
    () => {
      adminApi.setToken(token!);
      return adminApi.listRequestLogs({
        date_range: params.dateRange,
        conversation_id: params.searchQuery || undefined,
        status: params.status || undefined,
        page: params.page,
        page_size: 20,
      });
    },
    {
      dedupingInterval: DEDUPE_INTERVAL,
      revalidateOnFocus: false, // 日志页不需要焦点时刷新
    }
  );
}

export function useAdminLatencyStats(dateRange: string) {
  const { token } = useAuthStore();
  return useSWR(
    token ? ["admin-latency-stats", dateRange, token] : null,
    () => {
      adminApi.setToken(token!);
      return adminApi.getLatencyStats({ date_range: dateRange });
    },
    { dedupingInterval: DEDUPE_INTERVAL, revalidateOnFocus: false }
  );
}
