/**
 * API client for communicating with the backend.
 */

import type { ApiError, AuthResponse, LoginRequest, RegisterRequest, User } from "@/types";

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

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        detail: "An error occurred",
      }));
      throw new Error(error.detail);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
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
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Chat failed" }));
    throw new Error(error.detail);
  }

  return response.json();
}
