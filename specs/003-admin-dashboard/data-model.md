# Data Model: SenseWorld 后台管理系统

**Feature**: 003-admin-dashboard  
**Date**: 2026-03-26

## Entity Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   ModelConfig   │     │    UsageLog     │     │   RequestLog    │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)         │     │ id (PK)         │
│ model_type      │◄────│ model_type      │     │ trace_id        │
│ model_name      │     │ model_name      │     │ conversation_id │
│ provider        │     │ user_id         │     │ user_id         │
│ api_key_enc     │     │ input_tokens    │     │ request_type    │
│ config (JSON)   │     │ output_tokens   │     │ status_code     │
│ price_input     │     │ cost            │     │ latency_ms      │
│ price_output    │     │ created_at      │     │ request_body    │
│ is_default      │     └─────────────────┘     │ response_body   │
│ terminal_type   │                             │ error_message   │
│ is_active       │     ┌─────────────────┐     │ created_at      │
│ created_at      │     │  SystemSetting  │     └─────────────────┘
│ updated_at      │     ├─────────────────┤
└─────────────────┘     │ id (PK)         │     ┌─────────────────┐
                        │ key (UK)        │     │     Alert       │
                        │ value           │     ├─────────────────┤
                        │ description     │     │ id (PK)         │
                        │ updated_at      │     │ type            │
                        │ updated_by      │     │ title           │
                        └─────────────────┘     │ message         │
                                                │ is_read         │
                                                │ created_at      │
                                                └─────────────────┘
```

---

## Entity Definitions

### ModelConfig (扩展现有)

模型配置实体，存储 LLM/ASR/TTS 各类模型的配置信息。

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | CHAR(36) | PK | UUID 主键 |
| model_type | VARCHAR(50) | NOT NULL, INDEX | 模型类型: llm, asr, tts |
| model_name | VARCHAR(100) | NOT NULL | 模型名称: qwen-turbo, whisper-1 |
| provider | VARCHAR(50) | NOT NULL | 提供商: dashscope, openai, azure |
| api_key_encrypted | TEXT | NULL | AES-256-GCM 加密的 API Key |
| config | JSON | DEFAULT '{}' | 模型特定参数 (temperature, voice 等) |
| price_per_1k_input_tokens | DECIMAL(10,6) | DEFAULT 0 | 输入 token 单价 (元/千tokens) |
| price_per_1k_output_tokens | DECIMAL(10,6) | DEFAULT 0 | 输出 token 单价 |
| is_default | BOOLEAN | DEFAULT FALSE | 是否为该类型默认模型 |
| terminal_type | VARCHAR(20) | DEFAULT 'all' | 适用终端: all, web, ios, android, miniprogram |
| is_active | BOOLEAN | DEFAULT TRUE | 是否启用 |
| created_at | DATETIME | NOT NULL | 创建时间 |
| updated_at | DATETIME | NOT NULL | 更新时间 |

**Indexes**:
- `idx_model_type` (model_type)
- `idx_model_type_terminal` (model_type, terminal_type)
- `idx_is_default` (is_default) WHERE is_default = TRUE

**Config JSON Schema** (by model_type):
```json
// LLM
{
  "temperature": 0.7,
  "max_tokens": 2048,
  "top_p": 0.9,
  "system_prompt": "optional system prompt"
}

// ASR
{
  "language": "zh-CN",
  "sample_rate": 16000,
  "format": "pcm"
}

// TTS
{
  "voice": "zhitian_emo",
  "speed": 1.0,
  "volume": 50,
  "pitch": 0
}
```

---

### UsageLog (新增)

用量日志实体，记录每次模型调用的 token 消耗和费用。

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | CHAR(36) | PK | UUID 主键 |
| model_type | VARCHAR(50) | NOT NULL, INDEX | 模型类型 |
| model_name | VARCHAR(100) | NOT NULL | 模型名称 |
| user_id | CHAR(36) | NULL, INDEX | 用户 ID (可为匿名) |
| conversation_id | CHAR(36) | NULL, INDEX | 会话 ID |
| input_tokens | INT | NOT NULL, DEFAULT 0 | 输入 token 数 |
| output_tokens | INT | NOT NULL, DEFAULT 0 | 输出 token 数 |
| cost | DECIMAL(10,6) | NOT NULL, DEFAULT 0 | 费用 (元) |
| terminal_type | VARCHAR(20) | DEFAULT 'web' | 请求来源终端 |
| created_at | DATETIME | NOT NULL, INDEX | 创建时间 |

**Indexes**:
- `idx_created_at` (created_at)
- `idx_model_type_created` (model_type, created_at)
- `idx_user_created` (user_id, created_at)

**Retention**: 90 天，每日凌晨 3:00 清理过期数据

---

### RequestLog (新增)

请求日志实体，记录 API 请求的完整链路信息。

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | CHAR(36) | PK | UUID 主键 |
| trace_id | VARCHAR(64) | NOT NULL, INDEX | 链路追踪 ID |
| conversation_id | CHAR(36) | NULL, INDEX | 会话 ID |
| user_id | CHAR(36) | NULL, INDEX | 用户 ID |
| request_type | VARCHAR(50) | NOT NULL | 请求类型: chat, asr, tts |
| status_code | INT | NOT NULL | HTTP 状态码 |
| latency_ms | INT | NOT NULL | 总耗时 (毫秒) |
| asr_latency_ms | INT | NULL | ASR 阶段耗时 |
| llm_latency_ms | INT | NULL | LLM 阶段耗时 |
| tts_latency_ms | INT | NULL | TTS 阶段耗时 |
| request_body | TEXT | NULL | 请求体 (脱敏后) |
| response_body | TEXT | NULL | 响应体 (截断) |
| error_message | TEXT | NULL | 错误信息 |
| ip_address | VARCHAR(45) | NULL | 客户端 IP |
| user_agent | VARCHAR(500) | NULL | User-Agent |
| created_at | DATETIME | NOT NULL, INDEX | 创建时间 |

**Indexes**:
- `idx_trace_id` (trace_id)
- `idx_conversation_id` (conversation_id)
- `idx_created_at` (created_at)
- `idx_status_created` (status_code, created_at)

**Retention**: 90 天

---

### SystemSetting (新增)

系统设置实体，存储全局配置项。

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | CHAR(36) | PK | UUID 主键 |
| key | VARCHAR(100) | UNIQUE, NOT NULL | 配置键名 |
| value | TEXT | NOT NULL | 配置值 (JSON 字符串) |
| value_type | VARCHAR(20) | DEFAULT 'string' | 值类型: string, number, boolean, json |
| description | VARCHAR(500) | NULL | 配置说明 |
| updated_at | DATETIME | NOT NULL | 更新时间 |
| updated_by | CHAR(36) | NULL | 更新者 ID |

**Predefined Keys**:
| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `default_llm_model` | string | 'qwen-turbo' | 默认 LLM 模型 |
| `default_asr_model` | string | 'paraformer-v2' | 默认 ASR 模型 |
| `default_tts_model` | string | 'cosyvoice-v1' | 默认 TTS 模型 |
| `rate_limit_rpm` | number | 60 | 每分钟请求限制 |
| `request_timeout_ms` | number | 30000 | 请求超时 (毫秒) |
| `cost_alert_threshold` | number | 100 | 费用告警阈值 (元/天) |
| `log_retention_days` | number | 90 | 日志保留天数 |

---

### Alert (新增)

告警通知实体，存储站内告警消息。

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | CHAR(36) | PK | UUID 主键 |
| type | VARCHAR(50) | NOT NULL | 告警类型: cost_exceeded, error_spike, config_change |
| level | VARCHAR(20) | DEFAULT 'warning' | 级别: info, warning, error |
| title | VARCHAR(200) | NOT NULL | 告警标题 |
| message | TEXT | NOT NULL | 告警详情 |
| metadata | JSON | DEFAULT '{}' | 附加数据 |
| is_read | BOOLEAN | DEFAULT FALSE | 是否已读 |
| created_at | DATETIME | NOT NULL, INDEX | 创建时间 |

**Indexes**:
- `idx_is_read_created` (is_read, created_at)
- `idx_type_created` (type, created_at)

---

## Validation Rules

### ModelConfig
- `model_type` 必须为 `llm`, `asr`, `tts` 之一
- `terminal_type` 必须为 `all`, `web`, `ios`, `android`, `miniprogram` 之一
- 同一 `model_type` + `terminal_type` 组合最多一个 `is_default=TRUE`
- `api_key_encrypted` 存储前必须通过 AES-256-GCM 加密

### UsageLog
- `input_tokens` 和 `output_tokens` 必须 >= 0
- `cost` 计算公式：`(input_tokens * price_input + output_tokens * price_output) / 1000`

### RequestLog
- `latency_ms` 必须 >= 0
- `status_code` 必须为有效 HTTP 状态码 (100-599)
- `request_body` 和 `response_body` 需脱敏处理（移除敏感字段）

### SystemSetting
- `key` 格式为 snake_case
- `value` 更新时需验证与 `value_type` 匹配

---

## State Transitions

### Alert Lifecycle
```
┌──────────┐    create     ┌──────────┐    mark_read    ┌──────────┐
│  (none)  │ ───────────► │  unread  │ ──────────────► │   read   │
└──────────┘               └──────────┘                 └──────────┘
```

### ModelConfig Activation
```
┌──────────┐   activate    ┌──────────┐
│ inactive │ ───────────► │  active  │
└──────────┘ ◄─────────── └──────────┘
              deactivate
```

---

## Migration Notes

1. **ModelConfig 扩展**：需要 ALTER TABLE 添加新字段
   - `api_key_encrypted` TEXT
   - `price_per_1k_input_tokens` DECIMAL(10,6)
   - `price_per_1k_output_tokens` DECIMAL(10,6)
   - `is_default` BOOLEAN
   - `terminal_type` VARCHAR(20)

2. **新表创建顺序**：
   1. `system_settings` (无依赖)
   2. `usage_logs` (无依赖)
   3. `request_logs` (无依赖)
   4. `alerts` (无依赖)

3. **数据迁移**：
   - 现有 `model_configs.config` JSON 中如有 api_key，需迁移到 `api_key_encrypted`
