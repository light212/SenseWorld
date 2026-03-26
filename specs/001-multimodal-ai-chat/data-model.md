# Data Model: 多模态 AI 对话平台

**Feature**: 001-multimodal-ai-chat  
**Created**: 2026-03-25  
**Status**: Complete

## 实体关系图

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│     User     │ 1───n │   Conversation   │ 1───n │   Message    │
├──────────────┤       ├──────────────────┤       ├──────────────┤
│ id           │       │ id               │       │ id           │
│ email        │       │ user_id (FK)     │       │ conv_id (FK) │
│ password_hash│       │ title            │       │ role         │
│ display_name │       │ created_at       │       │ content      │
│ preferences  │       │ updated_at       │       │ created_at   │
│ created_at   │       │ last_message_at  │       │ has_audio    │
│ updated_at   │       │ message_count    │       │ audio_url    │
└──────────────┘       │ is_deleted       │       │ metadata     │
                       └──────────────────┘       └──────────────┘
```

---

## 实体定义

### 1. User（用户）

用户是系统的核心实体，代表使用平台进行对话的注册用户。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 用户唯一标识 |
| email | VARCHAR(255) | UNIQUE, NOT NULL | 登录邮箱 |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt 哈希密码 |
| display_name | VARCHAR(100) | NOT NULL | 显示名称 |
| preferences | JSONB | DEFAULT '{}' | 用户偏好设置 |
| is_active | BOOLEAN | DEFAULT TRUE | 账户是否激活 |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | 更新时间 |

**偏好设置 (preferences) 结构**:
```json
{
  "voice_enabled": true,
  "auto_play_response": true,
  "tts_voice": "alloy",
  "language": "zh-CN"
}
```

**索引**:
- `idx_user_email` ON email

---

### 2. Conversation（对话）

对话代表用户与 AI 之间的一次完整会话，包含多轮消息交互。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 对话唯一标识 |
| user_id | UUID | FK → User.id, NOT NULL | 所属用户 |
| title | VARCHAR(200) | | 对话标题（自动生成或用户设定） |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| updated_at | TIMESTAMP | NOT NULL | 更新时间 |
| last_message_at | TIMESTAMP | | 最后一条消息时间 |
| message_count | INTEGER | DEFAULT 0 | 消息数量 |
| is_deleted | BOOLEAN | DEFAULT FALSE | 软删除标记 |
| metadata | JSONB | DEFAULT '{}' | 扩展元数据 |

**元数据 (metadata) 结构**:
```json
{
  "summary": "关于天气的讨论",
  "tags": ["天气", "生活"],
  "model_version": "gpt-4-turbo"
}
```

**索引**:
- `idx_conversation_user_id` ON user_id
- `idx_conversation_last_message` ON user_id, last_message_at DESC
- `idx_conversation_deleted` ON user_id WHERE is_deleted = FALSE

---

### 3. Message（消息）

消息是对话中的单条内容，可以是用户输入或 AI 回复。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 消息唯一标识 |
| conversation_id | UUID | FK → Conversation.id, NOT NULL | 所属对话 |
| role | VARCHAR(20) | NOT NULL | 消息角色：user / assistant / system |
| content | TEXT | NOT NULL | 消息文本内容 |
| created_at | TIMESTAMP | NOT NULL | 创建时间 |
| has_audio | BOOLEAN | DEFAULT FALSE | 是否有语音 |
| audio_duration | INTEGER | | 语音时长（毫秒） |
| metadata | JSONB | DEFAULT '{}' | 扩展元数据 |

**元数据 (metadata) 结构**:
```json
{
  "input_type": "voice",
  "asr_confidence": 0.95,
  "tokens_used": 150,
  "model": "gpt-4-turbo"
}
```

**索引**:
- `idx_message_conversation` ON conversation_id, created_at ASC

**注意**: 语音数据不持久化存储，仅在实时处理时使用。`has_audio` 标记消息是否来源于语音输入或有语音输出。

---

## 状态转换

### 对话状态

```
[新建] ──创建消息──→ [活跃] ──用户删除──→ [已删除]
                        │
                    7天无活动
                        ↓
                    [归档] (可选，未来功能)
```

### 消息处理状态（运行时）

```
[录音中] ──完成录音──→ [识别中] ──ASR完成──→ [待发送]
                                              │
                                          用户确认
                                              ↓
[已发送] ←──────────────────────────────── [发送中]
    │
    ↓
[AI回复中] ──流式输出──→ [回复完成]
```

---

## 验证规则

### User
- `email`: 有效邮箱格式，长度 ≤ 255
- `display_name`: 长度 1-100 字符
- `password`: 原始密码至少 8 字符，包含字母和数字

### Conversation
- `title`: 长度 ≤ 200 字符
- 用户最多同时拥有 100 个活跃对话

### Message
- `content`: 长度 ≤ 10,000 字符
- `role`: 仅允许 'user', 'assistant', 'system'
- 单次对话消息数量 ≤ 200 条

---

## Redis 缓存结构

### 活跃对话上下文

存储当前活跃对话的消息上下文，用于 LLM 调用。

**Key**: `conversation:{conversation_id}:context`  
**Type**: List  
**TTL**: 1 小时（每次访问刷新）

```json
[
  {"role": "system", "content": "You are a helpful assistant..."},
  {"role": "user", "content": "今天天气怎么样？"},
  {"role": "assistant", "content": "请问您想了解哪个城市的天气？"},
  {"role": "user", "content": "北京"}
]
```

### WebSocket 连接映射

**Key**: `ws:user:{user_id}`  
**Type**: String  
**Value**: WebSocket 连接 ID  
**TTL**: 连接断开时删除

### 用户会话 Token

**Key**: `session:{user_id}:{token_hash}`  
**Type**: Hash  
**TTL**: 7 天

```
{
  "created_at": "2026-03-25T10:00:00Z",
  "user_agent": "Mozilla/5.0...",
  "ip": "192.168.1.1"
}
```

---

## 数据迁移策略

### 初始迁移 (V1)
1. 创建 users 表
2. 创建 conversations 表
3. 创建 messages 表
4. 创建必要索引

### 未来扩展预留
- `conversations.metadata` 可扩展存储模型配置
- `messages.metadata` 可扩展存储音频文件引用（视频理解功能）
- 预留 `tags` 表用于对话分类（后续版本）

---

## 数据保留策略

| 数据类型 | 保留期限 | 说明 |
|----------|----------|------|
| 用户账户 | 永久（用户可主动删除） | 删除后 30 天内可恢复 |
| 对话历史 | 永久（用户可主动删除） | 软删除后 30 天物理删除 |
| 消息记录 | 随对话保留 | 与对话一起删除 |
| Redis 缓存 | 按 TTL 自动过期 | 最长 1 小时 |
| 语音数据 | 不存储 | 仅实时处理 |
