/**
 * Admin API client for dashboard operations.
 */

import { ApiError, logger, measurePerformance, getErrorMessage } from "@/lib/errorHandling";

const ADMIN_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/v1";

export interface ModelConfig {
  id: string;
  model_type: "llm" | "asr" | "tts";
  model_name: string;
  provider: string;
  api_key_masked?: string;
  config: Record<string, unknown>;
  price_per_1k_input_tokens: number;
  price_per_1k_output_tokens: number;
  is_default: boolean;
  terminal_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ModelConfigCreate {
  model_type: "llm" | "asr" | "tts";
  model_name: string;
  provider: string;
  api_key?: string;
  config?: Record<string, unknown>;
  price_per_1k_input_tokens?: number;
  price_per_1k_output_tokens?: number;
  is_default?: boolean;
  terminal_type?: string;
  is_active?: boolean;
}

export interface ModelConfigUpdate {
  model_name?: string;
  provider?: string;
  api_key?: string;
  config?: Record<string, unknown>;
  price_per_1k_input_tokens?: number;
  price_per_1k_output_tokens?: number;
  is_default?: boolean;
  terminal_type?: string;
  is_active?: boolean;
}

export interface UsageSummary {
  total_calls: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost: number;
  by_model_type: Record<string, { calls: number; cost: number }>;
}

export interface UsageTrendPoint {
  timestamp: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cost: number;
}

export interface ModelUsageStats {
  model_type: string;
  model_name: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  percentage: number;
}

export interface RequestLog {
  id: string;
  trace_id: string;
  conversation_id?: string;
  user_id?: string;
  request_type: string;
  status_code: number;
  latency_ms: number;
  created_at: string;
}

export interface RequestLogDetail extends RequestLog {
  asr_latency_ms?: number;
  llm_latency_ms?: number;
  tts_latency_ms?: number;
  request_body?: string | Record<string, unknown>;
  response_body?: string | Record<string, unknown>;
  error_message?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface RequestLogPage {
  items: RequestLog[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface LatencyStats {
  p50: number;
  p95: number;
  p99: number;
  avg: number;
  min: number;
  max: number;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  value_type: "string" | "number" | "boolean" | "json";
  description?: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  type: "cost_exceeded" | "error_spike" | "config_change";
  level: "info" | "warning" | "error";
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface AlertPage {
  items: Alert[];
  total: number;
  page: number;
  page_size: number;
}

export interface TerminalConfig {
  id: string;
  type: string;
  name: string;
  config_overrides: Record<string, unknown>;
  feature_flags: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TerminalCreate {
  type: string;
  name: string;
  config_overrides?: Record<string, unknown>;
  feature_flags?: Record<string, unknown>;
  is_active?: boolean;
}

export interface TerminalUpdate {
  name?: string;
  config_overrides?: Record<string, unknown>;
  feature_flags?: Record<string, unknown>;
  is_active?: boolean;
}

class AdminApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const method = options.method || "GET";

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${this.token}`;
    }

    return measurePerformance(`Admin API ${method} ${endpoint}`, async () => {
      try {
        const response = await fetch(url, { ...options, headers });
        const traceId = response.headers.get("X-Trace-ID") || undefined;

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({
            error: { message: "请求失败", code: "UNKNOWN_ERROR" },
          }));

          if (errorBody.error) {
            throw new ApiError(
              errorBody.error.message || "请求失败",
              errorBody.error.code || "UNKNOWN_ERROR",
              response.status,
              traceId,
              errorBody.error.details
            );
          }

          throw new ApiError("请求失败", "UNKNOWN_ERROR", response.status, traceId);
        }

        if (response.status === 204) {
          return {} as T;
        }

        return response.json();
      } catch (error) {
        if (error instanceof ApiError) {
          logger.warn(`Admin API Error: ${error.code} - ${error.message}`, {
            endpoint,
            traceId: error.traceId,
          });
          throw error;
        }

        logger.error(`Admin API Request failed: ${endpoint}`, error);
        throw new ApiError(getErrorMessage(error), "NETWORK_ERROR", 0);
      }
    });
  }

  // Model Config
  async listModelConfigs(params: {
    model_type?: string;
    terminal_type?: string;
    is_active?: boolean;
  } = {}): Promise<ModelConfig[]> {
    const query = new URLSearchParams();
    if (params.model_type) query.set("model_type", params.model_type);
    if (params.terminal_type) query.set("terminal_type", params.terminal_type);
    if (params.is_active !== undefined) query.set("is_active", String(params.is_active));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return this.request<ModelConfig[]>(`/admin/models${suffix}`);
  }

  async createModelConfig(data: ModelConfigCreate): Promise<ModelConfig> {
    return this.request<ModelConfig>("/admin/models", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateModelConfig(configId: string, data: ModelConfigUpdate): Promise<ModelConfig> {
    return this.request<ModelConfig>(`/admin/models/${configId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteModelConfig(configId: string): Promise<void> {
    return this.request<void>(`/admin/models/${configId}`, { method: "DELETE" });
  }

  async setDefaultModel(configId: string): Promise<ModelConfig> {
    return this.request<ModelConfig>(`/admin/models/${configId}/set-default`, {
      method: "POST",
    });
  }

  // Usage
  async getUsageSummary(params: {
    date_range?: string;
    model_type?: string;
    terminal_type?: string;
  } = {}): Promise<UsageSummary> {
    const query = new URLSearchParams();
    if (params.date_range) query.set("date_range", params.date_range);
    if (params.model_type) query.set("model_type", params.model_type);
    if (params.terminal_type) query.set("terminal_type", params.terminal_type);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return this.request<UsageSummary>(`/admin/usage/summary${suffix}`);
  }

  async getUsageTrends(params: {
    date_range?: string;
    granularity?: string;
    model_type?: string;
  } = {}): Promise<UsageTrendPoint[]> {
    const query = new URLSearchParams();
    if (params.date_range) query.set("date_range", params.date_range);
    if (params.granularity) query.set("granularity", params.granularity);
    if (params.model_type) query.set("model_type", params.model_type);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return this.request<UsageTrendPoint[]>(`/admin/usage/trends${suffix}`);
  }

  async getUsageByModel(params: { date_range?: string } = {}): Promise<ModelUsageStats[]> {
    const query = new URLSearchParams();
    if (params.date_range) query.set("date_range", params.date_range);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return this.request<ModelUsageStats[]>(`/admin/usage/by-model${suffix}`);
  }

  // Logs
  async listRequestLogs(params: {
    date_range?: string;
    conversation_id?: string;
    trace_id?: string;
    user_id?: string;
    status?: string;
    page?: number;
    page_size?: number;
  } = {}): Promise<RequestLogPage> {
    const query = new URLSearchParams();
    if (params.date_range) query.set("date_range", params.date_range);
    if (params.conversation_id) query.set("conversation_id", params.conversation_id);
    if (params.trace_id) query.set("trace_id", params.trace_id);
    if (params.user_id) query.set("user_id", params.user_id);
    if (params.status) query.set("status", params.status);
    if (params.page) query.set("page", String(params.page));
    if (params.page_size) query.set("page_size", String(params.page_size));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return this.request<RequestLogPage>(`/admin/logs${suffix}`);
  }

  async getRequestLog(logId: string): Promise<RequestLogDetail> {
    return this.request<RequestLogDetail>(`/admin/logs/${logId}`);
  }

  async getLatencyStats(params: {
    date_range?: string;
    request_type?: string;
  } = {}): Promise<LatencyStats> {
    const query = new URLSearchParams();
    if (params.date_range) query.set("date_range", params.date_range);
    if (params.request_type) query.set("request_type", params.request_type);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return this.request<LatencyStats>(`/admin/logs/latency-stats${suffix}`);
  }

  // Settings
  async listSettings(): Promise<SystemSetting[]> {
    return this.request<SystemSetting[]>("/admin/settings");
  }

  async getSetting(key: string): Promise<SystemSetting> {
    return this.request<SystemSetting>(`/admin/settings/${key}`);
  }

  async updateSetting(key: string, value: string): Promise<SystemSetting> {
    return this.request<SystemSetting>(`/admin/settings/${key}`, {
      method: "PUT",
      body: JSON.stringify({ value }),
    });
  }

  // Alerts
  async listAlerts(params: {
    is_read?: boolean;
    type?: string;
    page?: number;
    page_size?: number;
  } = {}): Promise<AlertPage> {
    const query = new URLSearchParams();
    if (params.is_read !== undefined) query.set("is_read", String(params.is_read));
    if (params.type) query.set("type", params.type);
    if (params.page) query.set("page", String(params.page));
    if (params.page_size) query.set("page_size", String(params.page_size));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return this.request<AlertPage>(`/admin/alerts${suffix}`);
  }

  async getUnreadAlertCount(): Promise<{ count: number }> {
    return this.request<{ count: number }>("/admin/alerts/unread-count");
  }

  async markAlertRead(alertId: string): Promise<void> {
    return this.request<void>(`/admin/alerts/${alertId}/read`, {
      method: "POST",
    });
  }

  async markAllAlertsRead(): Promise<void> {
    return this.request<void>("/admin/alerts/read-all", { method: "POST" });
  }

  // Terminals
  async listTerminals(): Promise<TerminalConfig[]> {
    return this.request<TerminalConfig[]>("/admin/terminals");
  }

  async createTerminal(data: TerminalCreate): Promise<TerminalConfig> {
    return this.request<TerminalConfig>("/admin/terminals", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateTerminal(id: string, data: TerminalUpdate): Promise<TerminalConfig> {
    return this.request<TerminalConfig>(`/admin/terminals/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteTerminal(id: string): Promise<void> {
    return this.request<void>(`/admin/terminals/${id}`, { method: "DELETE" });
  }

  async getStats(): Promise<{ total_users: number; total_conversations: number; total_messages: number }> {
    return this.request("/admin/stats");
  }
}

export const adminApi = new AdminApiClient(ADMIN_API_BASE_URL);
