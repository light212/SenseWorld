# WebSocket Protocol: 多模态 AI 对话平台

**Feature**: 001-multimodal-ai-chat  
**Created**: 2026-03-25  
**Status**: Complete

---

## 概述

WebSocket 用于实时语音对话的流式数据传输，包括：
- 音频数据上传
- ASR 转写结果推送
- LLM 流式输出
- TTS 音频流推送
- 错误和控制消息

---

## 连接管理

### 连接端点

```
wss://api.senseworld.ai/ws/chat?token={jwt_token}
```

### 认证流程

1. 客户端连接时携带 JWT Token
2. 服务端验证 Token，提取 user_id
3. 验证成功：建立连接，返回 `connected` 消息
4. 验证失败：返回 `error` 消息并关闭连接

### 心跳机制

- **间隔**：30 秒
- **客户端**：发送 `ping`
- **服务端**：回复 `pong`
- **超时**：60 秒无响应则断开连接

### 重连策略

- 指数退避：1s → 2s → 4s → 8s → 最大 30s
- 重连时携带相同 Token
- 服务端恢复未完成的会话状态（若可用）

---

## 消息格式

所有消息使用 JSON 格式：

```typescript
interface WebSocketMessage {
  type: MessageType;
  payload: any;
  timestamp: string;  // ISO 8601
  requestId?: string; // 可选，用于请求-响应匹配
}

type MessageType =
  // 连接管理
  | 'connected'
  | 'ping'
  | 'pong'
  // 会话控制
  | 'session_start'
  | 'session_end'
  | 'conversation_select'
  // 音频上传
  | 'audio_chunk'
  | 'audio_end'
  // ASR
  | 'asr_result'
  | 'asr_partial'
  // LLM
  | 'llm_start'
  | 'llm_chunk'
  | 'llm_end'
  // TTS
  | 'tts_audio'
  | 'tts_end'
  // 错误
  | 'error';
```

### 通用约束

- `timestamp` 必须为 ISO 8601
- `requestId` 建议由客户端生成 UUID，用于追踪一次对话请求
- `audio_chunk` 数据为 base64 编码，单块建议 <= 256KB
- 客户端应保证同一 `requestId` 的消息顺序发送
- 服务端应按 `chunkIndex` 顺序消费音频块

---

## 消息流程

### 完整语音对话流程

```
Client                                             Server
  |  session_start { conversationId }                |
  |------------------------------------------------->|
  |  audio_chunk { data } (多块)                     |
  |------------------------------------------------->|
  |  audio_end { durationMs, totalChunks }           |
  |------------------------------------------------->|
  |                       asr_partial { text }       |
  |<-------------------------------------------------|
  |                       asr_result { text }        |
  |<-------------------------------------------------|
  |                          llm_start { messageId } |
  |<-------------------------------------------------|
  |                          llm_chunk { content }   |
  |<-------------------------------------------------|
  |                       tts_audio { data }         |
  |<-------------------------------------------------|
  |                           llm_end { totalTokens }|
  |<-------------------------------------------------|
  |                           tts_end { durationMs } |
  |<-------------------------------------------------|
```

---

## 消息类型详解

### 1. 连接管理

#### connected（服务端 → 客户端）

```json
{
  "type": "connected",
  "payload": {
    "userId": "uuid",
    "sessionId": "uuid"
  },
  "timestamp": "2026-03-25T10:00:00Z"
}
```

#### ping / pong

```json
{ "type": "ping", "payload": {}, "timestamp": "2026-03-25T10:00:00Z" }
{ "type": "pong", "payload": {}, "timestamp": "2026-03-25T10:00:00Z" }
```

---

### 2. 会话控制

#### session_start（客户端 → 服务端）

```json
{
  "type": "session_start",
  "payload": {
    "conversationId": "uuid",
    "inputMode": "voice"
  },
  "timestamp": "2026-03-25T10:00:00Z"
}
```

#### session_end（客户端 → 服务端）

用于结束一次对话会话（释放服务端上下文）。

```json
{
  "type": "session_end",
  "payload": {
    "conversationId": "uuid",
    "reason": "user_end"
  },
  "timestamp": "2026-03-25T10:00:10Z"
}
```

#### conversation_select（客户端 → 服务端）

```json
{
  "type": "conversation_select",
  "payload": {
    "conversationId": "uuid"
  },
  "timestamp": "2026-03-25T10:00:00Z"
}
```

---

### 3. 音频上传

#### audio_chunk（客户端 → 服务端）

```json
{
  "type": "audio_chunk",
  "payload": {
    "data": "base64...",
    "format": "webm",
    "codec": "opus",
    "sampleRate": 16000,
    "chunkIndex": 12
  },
  "timestamp": "2026-03-25T10:00:00Z",
  "requestId": "uuid"
}
```

#### audio_end（客户端 → 服务端）

```json
{
  "type": "audio_end",
  "payload": {
    "durationMs": 3200,
    "totalChunks": 15
  },
  "timestamp": "2026-03-25T10:00:00Z",
  "requestId": "uuid"
}
```

---

### 4. ASR

#### asr_result（服务端 → 客户端）

```json
{
  "type": "asr_result",
  "payload": {
    "text": "你好，今天天气怎么样？",
    "confidence": 0.95,
    "language": "zh-CN"
  },
  "timestamp": "2026-03-25T10:00:02Z",
  "requestId": "uuid"
}
```

#### asr_partial（服务端 → 客户端，可选）

```json
{
  "type": "asr_partial",
  "payload": {
    "text": "你好，今天...",
    "isFinal": false
  },
  "timestamp": "2026-03-25T10:00:01Z",
  "requestId": "uuid"
}
```

---

### 5. LLM

#### llm_start（服务端 → 客户端）

```json
{
  "type": "llm_start",
  "payload": {
    "messageId": "uuid",
    "model": "default"
  },
  "timestamp": "2026-03-25T10:00:03Z",
  "requestId": "uuid"
}
```

#### llm_chunk（服务端 → 客户端）

```json
{
  "type": "llm_chunk",
  "payload": {
    "content": "今天天气很好"
  },
  "timestamp": "2026-03-25T10:00:03Z",
  "requestId": "uuid"
}
```

#### llm_end（服务端 → 客户端）

```json
{
  "type": "llm_end",
  "payload": {
    "totalTokens": 128
  },
  "timestamp": "2026-03-25T10:00:04Z",
  "requestId": "uuid"
}
```

---

### 6. TTS

#### tts_audio（服务端 → 客户端）

```json
{
  "type": "tts_audio",
  "payload": {
    "data": "base64...",
    "format": "mp3",
    "chunkIndex": 3
  },
  "timestamp": "2026-03-25T10:00:04Z",
  "requestId": "uuid"
}
```

#### tts_end（服务端 → 客户端）

```json
{
  "type": "tts_end",
  "payload": {
    "durationMs": 3500
  },
  "timestamp": "2026-03-25T10:00:05Z",
  "requestId": "uuid"
}
```

---

### 7. 错误

#### error（服务端 → 客户端）

```json
{
  "type": "error",
  "payload": {
    "code": "ASR_UNAVAILABLE",
    "message": "语音识别服务暂时不可用",
    "retryable": true
  },
  "timestamp": "2026-03-25T10:00:05Z",
  "requestId": "uuid"
}
```

### 错误码约定

| Code | 含义 | 重试建议 |
|------|------|----------|
| AUTH_FAILED | 认证失败 | 否 |
| RATE_LIMITED | 触发限流 | 是（延迟重试） |
| ASR_UNAVAILABLE | ASR 不可用 | 是 |
| LLM_TIMEOUT | LLM 超时 | 是 |
| TTS_UNAVAILABLE | TTS 不可用 | 是 |
| INVALID_PAYLOAD | 消息格式错误 | 否 |
| INTERNAL_ERROR | 服务端异常 | 是 |

---

## 客户端实现建议

### 流控与背压

- 若收到 `RATE_LIMITED`，客户端应暂停发送音频并在 1-2 秒后重试
- 前端录音应按 100-250ms 切片发送，避免单包过大
- 如果 WebSocket 缓冲区过大，客户端应临时停止发送并提示用户

### 请求关联

- 每次录音发送使用新的 `requestId`
- 同一 `requestId` 的 LLM/TTS 回复用于绑定到同一消息气泡