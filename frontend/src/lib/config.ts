/**
 * 统一 API 配置
 * 所有 API 调用应使用此文件的常量
 */

// API Base URL
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

// API 端点
export const API_ENDPOINTS = {
  // 认证
  auth: {
    login: `${API_BASE_URL}/v1/auth/login`,
    register: `${API_BASE_URL}/v1/auth/register`,
    me: `${API_BASE_URL}/v1/auth/me`,
  },
  // 会话
  conversations: `${API_BASE_URL}/v1/conversations`,
  conversation: (id: string) => `${API_BASE_URL}/v1/conversations/${id}`,
  conversationMessages: (id: string) => `${API_BASE_URL}/v1/conversations/${id}/messages`,
  // 聊天
  chatStream: `${API_BASE_URL}/v1/chat/stream`,
  // 音频
  audio: (id: string) => `${API_BASE_URL}/v1/audio/${id}`,
  // 管理
  admin: {
    models: `${API_BASE_URL}/v1/admin/models`,
    modelTest: `${API_BASE_URL}/v1/admin/models/test`,
  },
} as const;

// WebSocket URL
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/chat";