/**
 * API client for communicating with the backend.
 */

import type { ApiError as ApiErrorType, AuthResponse, LoginRequest, RegisterRequest, User } from "@/types";
import { ApiError, logger, measurePerformance, getErrorMessage } from "@/lib/errorHandling";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/v1";

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${this.token}`;
    }

    return measurePerformance(`API ${options.method || "GET"} ${endpoint}`, async () => {
      try {
        const response = await fetch(url, {
          ...options,
          headers,
        });

        // 获取 trace_id 用于调试
        const traceId = response.headers.get("X-Trace-ID") || undefined;

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({
            error: { message: "请求失败", code: "UNKNOWN_ERROR" }
          }));
          
          // 使用新的 ApiError 类
          if (errorBody.error) {
            throw new ApiError(
              errorBody.error.message || "请求失败",
              errorBody.error.code || "UNKNOWN_ERROR",
              response.status,
              traceId,
              errorBody.error.details
            );
          }
          
          // 兼容旧的错误格式
          const legacyError: ApiErrorType = errorBody;
          throw new ApiError(
            legacyError.detail || "请求失败",
            "UNKNOWN_ERROR",
            response.status,
            traceId
          );
        }

        // Handle 204 No Content
        if (response.status === 204) {
          return {} as T;
        }

        return response.json();
      } catch (error) {
        if (error instanceof ApiError) {
          logger.warn(`API Error: ${error.code} - ${error.message}`, { 
            endpoint, 
            traceId: error.traceId 
          });
          throw error;
        }
        
        // 网络错误等
        logger.error(`API Request failed: ${endpoint}`, error);
        throw new ApiError(
          getErrorMessage(error),
          "NETWORK_ERROR",
          0
        );
      }
    });
  }

  // Auth endpoints
  async register(data: RegisterRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<void> {
    return this.request<void>("/auth/logout", {
      method: "POST",
    });
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>("/auth/me");
  }
}

export const api = new ApiClient(API_BASE_URL);

// Chat API
export interface ChatRequest {
  conversation_id: string;
  content: string;
}

export interface ChatMessageResponse {
  id: string;
  role: string;
  content: string;
  has_audio: boolean;
  created_at: string;
}

export async function sendChatMessage(
  token: string,
  data: ChatRequest
): Promise<ChatMessageResponse> {
  return measurePerformance("sendChatMessage", async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const traceId = response.headers.get("X-Trace-ID") || undefined;

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ 
          error: { message: "发送消息失败" } 
        }));
        
        throw new ApiError(
          errorBody.error?.message || errorBody.detail || "发送消息失败",
          errorBody.error?.code || "CHAT_ERROR",
          response.status,
          traceId
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      
      logger.error("sendChatMessage failed", error);
      throw new ApiError(getErrorMessage(error), "NETWORK_ERROR", 0);
    }
  });
}
