# WebSocket Protocol: 多模态 AI 对话平台

**Feature**: 001-multimodal-ai-chat  
**Created**: 2026-03-25  
**Status**: Draft

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
- 服务端恢复未完成的会话状态

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
  | 'audio_upload'
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

---

## 消息流程

### 完整语音对话流程

```
┌──────────┐                                          ┌──────────┐
│  Client  │                                          │  Server  │
└────┬─────┘                                          └────┬─────┘
     │                                                     │
     │  session_start { conversation_id }                  │
     │─────────────────────────────────────────────────────►│
     │                                                     │
     │  audio_chunk { data: base64 }                       │
     │─────────────────────────────────────────────────────►│
     │  (多个音频块)                                         │
     │                                                     │
     │  audio_end { duration_ms }                          │
     │─────────────────────────────────────────────────────►│
     │                                                     │
     │                      asr_result { text, confidence }│
     │◄─────────────────────────────────────────────────────│
     │                                                     │
     │                        llm_start { message_id }      │
     │◄─────────────────────────────────────────────────────│
     │                                                     │
     │                      llm_chunk { content }           │
     │◄─────────────────────────────────────────────────────│
     │  (多个文本块)                                         │
     │                                                     │
     │                      tts_audio { data: base64 }      │
     │◄─────────────────────────────────────────────────────│
     │  (多个音频块)                                         │
     │                                                     │
     │                           llm_end { total_tokens }   │
     │◄─────────────────────────────────────────────────────│
     │                                                     │
     │                           tts_end { duration_ms }    │
     │◄─────────────────────────────────────────────────────│
     │                                                     │
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

开始一个新的对话会话。

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

#### conversation_select（客户端 → 服务端）

切换到指定对话。

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

上传音频数据块（实时流式上传）。

```json
{
  "type": "audio_chunk",
  "payload": {
    "chunkIndex": 0,
    "data": "base64_encoded_audio_data",
    "format": "webm"
  },
  "timestamp": "2026-03-25T10:00:00Z"
}
```

#### audio_end（客户端 → 服务端）

音频上传结束。

```json
{
  "type": "audio_end",
  "payload": {
    "totalChunks": 10,
    "durationMs": 5000
  },
  "timestamp": "2026-03-25T10:00:00Z"
}
```

---

### 4. ASR 结果

#### asr_result（服务端 → 客户端）

语音识别最终结果。

```json
{
  "type": "asr_result",
  "payload": {
    "text": "今天天气怎么样？",
    "confidence": 0.95,
    "durationMs": 2000,
    "language": "zh"
  },
  "timestamp": "2026-03-25T10:00:00Z"
}
```

#### asr_partial（服务端 → 客户端）

实时转写的中间结果（可选功能）。

```json
{
  "type": "asr_partial",
  "payload": {
    "text": "今天天气",
    "isFinal": false
  },
  "timestamp": "2026-03-25T10:00:00Z"
}
```

---

### 5. LLM 流式输出

#### llm_start（服务端 → 客户端）

LLM 开始生成回复。

```json
{
  "type": "llm_start",
  "payload": {
    "messageId": "uuid"
  },
  "timestamp": "2026-03-25T10:00:00Z"
}
```

#### llm_chunk（服务端 → 客户端）

LLM 输出文本块。

```json
{
  "type": "llm_chunk",
  "payload": {
    "messageId": "uuid",
    "content": "北京今天天气晴朗，",
    "chunkIndex": 0
  },
  "timestamp": "2026-03-25T10:00:00Z"
}
```

#### llm_end（服务端 → 客户端）

LLM 输出结束。

```json
{
  "type": "llm_end",
  "payload": {
    "messageId": "uuid",
    "totalTokens": 150
  },
  "timestamp": "2026-03-25T10:00:00Z"
}
```

---

### 6. TTS 音频流

#### tts_audio（服务端 → 客户端）

TTS 生成的音频数据块。

```json
{
  "type": "tts_audio",
  "payload": {
    "messageId": "uuid",
    "chunkIndex": 0,
    "data": "base64_encoded_mp3_audio",
    "format": "mp3"
  },
  "timestamp": "2026-03-25T10:00:00Z"
}
```

#### tts_end（服务端 → 客户端）

TTS 输出结束。

```json
{
  "type": "tts_end",
  "payload": {
    "messageId": "uuid",
    "durationMs": 3500
  },
  "timestamp": "2026-03-25T10:00:00Z"
}
```

---

### 7. 错误处理

#### error（双向）

```json
{
  "type": "error",
  "payload": {
    "code": "ASR_FAILED",
    "message": "语音识别服务暂时不可用",
    "recoverable": true,
    "suggestion": "请使用文字输入"
  },
  "timestamp": "2026-03-25T10:00:00Z"
}
```

**错误代码**：

| Code | 说明 | Recoverable |
|------|------|-------------|
| `AUTH_FAILED` | 认证失败 | false |
| `INVALID_TOKEN` | Token 无效或过期 | false |
| `ASR_FAILED` | ASR 服务不可用 | true |
| `LLM_FAILED` | LLM 服务不可用 | true |
| `TTS_FAILED` | TTS 服务不可用 | true |
| `RATE_LIMITED` | 请求频率超限 | true |
| `INVALID_AUDIO` | 音频格式不支持 | true |

---

## 流式 TTS 策略

### 方案：按句子触发 TTS

为减少端到端延迟，LLM 输出按句子切分，每个完整句子立即触发 TTS：

```
LLM 输出: "北京今天天气晴朗，气温约25度。适合户外活动。"
                    ↓
切分: ["北京今天天气晴朗，气温约25度。", "适合户外活动。"]
                    ↓
TTS: 句子1开始合成 → 句子1音频返回 → 句子2开始合成 → 句子2音频返回
```

**优点**：
- 用户更快听到第一句回复
- 减少 LLM 等待时间

**实现要点**：
- 使用正则识别句子边界：`[。！？\n]`
- 句子最小长度：5 字符（避免过短句子）
- TTS 请求并行发送，音频按序返回

---

## 并发控制

### 单用户限制

| 限制项 | 值 |
|--------|-----|
| WebSocket 连接数 | 1 |
| 并发会话数 | 1 |
| 音频上传速率 | 最大 1MB/s |
| 消息频率 | 100 条/秒 |

### 全局限制

| 限制项 | 值 |
|--------|-----|
| 总 WebSocket 连接数 | 10,000 |
| 并发 ASR 请求 | 100 |
| 并发 TTS 请求 | 200 |

---

## 客户端实现建议

### 音频播放

使用 Web Audio API 或 MediaSource Extensions 实现：

```typescript
// 方案 1: MediaSource Extensions (推荐)
const mediaSource = new MediaSource();
const audio = new Audio(URL.createObjectURL(mediaSource));

mediaSource.addEventListener('sourceopen', () => {
  const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
  
  socket.on('tts_audio', (payload) => {
    const chunk = base64ToArrayBuffer(payload.data);
    sourceBuffer.appendBuffer(chunk);
  });
});

// 方案 2: 音频队列播放
const audioQueue: ArrayBuffer[] = [];
let isPlaying = false;

socket.on('tts_audio', (payload) => {
  audioQueue.push(base64ToArrayBuffer(payload.data));
  if (!isPlaying) playNext();
});

async function playNext() {
  if (audioQueue.length === 0) {
    isPlaying = false;
    return;
  }
  isPlaying = true;
  const audioContext = new AudioContext();
  const buffer = await audioContext.decodeAudioData(audioQueue.shift()!);
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start();
  source.onended = playNext;
}
```

---

*Protocol Version: 1.0 | Last Updated: 2026-03-25*