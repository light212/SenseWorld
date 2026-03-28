/**
 * TypeScript type definitions for the application.
 */

// User types
export interface User {
  id: string;
  email: string;
  displayName: string;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  voiceEnabled: boolean;
  autoPlayResponse: boolean;
  ttsVoice: string;
  language: string;
}

// Conversation types
export interface Conversation {
  id: string;
  userId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  messageCount: number;
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
}

// Message types
export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  hasAudio: boolean;
  audioDuration?: number;
  audioUrl?: string; // 前端临时 blob URL，不持久化
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  inputType?: "voice" | "text";
  asrConfidence?: number;
  tokensUsed?: number;
  model?: string;
  audioBlob?: Blob; // 语音消息的音频 Blob（前端临时存储）
}

// Auth types
export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

// WebSocket message types
export type WebSocketMessageType =
  | "connected"
  | "ping"
  | "pong"
  | "session_start"
  | "session_end"
  | "conversation_select"
  | "audio_chunk"
  | "audio_end"
  | "asr_result"
  | "asr_partial"
  | "llm_start"
  | "llm_chunk"
  | "llm_end"
  | "tts_audio"
  | "tts_end"
  | "error";

export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType;
  payload: T;
  timestamp: string;
  requestId?: string;
}

// API response types
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiError {
  detail: string;
  code?: string;
}
