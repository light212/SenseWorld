/**
 * 统一 API 客户端
 * 封装 fetch 调用，处理认证、错误等
 */

import { API_BASE_URL } from './config';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  token?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, token } = options;

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    
    const finalHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (token) {
      finalHeaders['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method,
      headers: finalHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async get<T>(endpoint: string, token?: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', token });
  }

  async post<T>(endpoint: string, body: unknown, token?: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body, token });
  }

  async put<T>(endpoint: string, body: unknown, token?: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body, token });
  }

  async delete<T>(endpoint: string, token?: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', token });
  }
}

export const api = new ApiClient(API_BASE_URL);