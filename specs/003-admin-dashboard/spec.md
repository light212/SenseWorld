# Feature Specification: SenseWorld 后台管理系统

**Feature Branch**: `003-admin-dashboard`  
**Created**: 2026-03-26  
**Status**: Draft  
**Input**: User description: "为 SenseWorld 多模态 AI 对话平台提供统一的后台管理能力，支持模型配置、用量监控、用户管理等功能"

## Summary

为 SenseWorld 多模态 AI 对话平台构建后台管理系统，使运维人员能够在不修改代码和重启服务的情况下，动态配置 LLM/ASR/TTS 模型参数、监控 API 调用用量和费用、查看请求日志和会话追踪、管理终端配置。系统面向平台管理员和运维人员，提供可视化的配置管理和数据分析能力。

## User Scenarios & Testing

### User Story 1 - 模型配置管理 (Priority: P0) 🎯 MVP

运维人员需要快速切换和配置 AI 模型，在不修改代码或重启服务的情况下调整 LLM、ASR、TTS 模型参数。

**Why this priority**: 模型配置是整个平台运行的核心，直接影响用户对话体验，且支持热更新能大幅提升运维效率。

**Independent Test**: 管理员登录后台，修改 LLM 模型配置并保存，前端对话立即使用新配置生成回复。

**Acceptance Scenarios**:

1. **Given** 管理员已登录后台, **When** 管理员在 LLM 配置页面选择新的模型（如从 GPT-4 切换到 Claude）, **Then** 系统保存配置且前端对话立即使用新模型
2. **Given** 管理员已登录后台, **When** 管理员修改 temperature 参数并保存, **Then** 配置实时生效，无需重启服务
3. **Given** 管理员配置了新的 API Key, **When** 管理员保存配置, **Then** API Key 加密存储，界面仅显示部分掩码

---

### User Story 2 - 用量监控与费用分析 (Priority: P0) 🎯 MVP

产品经理和管理员需要查看各模型的调用情况、token 消耗和费用估算，以便做出成本决策。

**Why this priority**: 费用可控是平台可持续运营的基础，用量数据是优化决策的依据。

**Independent Test**: 管理员进入用量监控页面，可以看到今日/本周/本月的各模型调用次数、token 消耗和估算费用图表。

**Acceptance Scenarios**:

1. **Given** 管理员在用量监控页面, **When** 选择"本周"时间范围, **Then** 系统显示本周各模型的调用次数折线图
2. **Given** 管理员在用量监控页面, **When** 查看费用统计, **Then** 系统显示按模型分类的费用估算，包括 LLM/ASR/TTS 各自费用
3. **Given** 费用超过配置的阈值, **When** 系统检测到超限, **Then** 向管理员发送告警通知

---

### User Story 3 - 请求日志与会话追踪 (Priority: P1)

运维人员需要查看 API 请求日志，追踪完整对话链路（用户输入 → ASR → LLM → TTS → 输出），排查问题和优化性能。

**Why this priority**: 问题排查和性能优化需要完整的日志链路支持。

**Independent Test**: 运维人员搜索特定 conversation_id，能看到该会话的完整请求链路和各阶段耗时。

**Acceptance Scenarios**:

1. **Given** 运维人员在日志页面, **When** 输入 conversation_id 搜索, **Then** 系统显示该会话所有请求记录，按时间排序
2. **Given** 运维人员查看某条请求详情, **When** 点击展开, **Then** 显示请求参数、响应内容、各阶段耗时（ASR/LLM/TTS）
3. **Given** 存在异常请求, **When** 运维人员筛选"错误"状态, **Then** 系统显示所有失败请求，包含错误码和堆栈信息

---

### User Story 4 - 系统全局设置 (Priority: P1)

管理员需要配置系统级参数，如默认模型组合、速率限制、超时时间等。

**Why this priority**: 全局配置影响系统整体行为，是运维必备功能。

**Independent Test**: 管理员修改全局超时配置，保存后所有新请求应用新的超时设置。

**Acceptance Scenarios**:

1. **Given** 管理员在系统设置页面, **When** 修改默认 LLM 模型并保存, **Then** 新用户对话使用该默认模型
2. **Given** 管理员配置了速率限制（如每分钟 100 次）, **When** 某用户请求超限, **Then** 系统返回 429 错误并记录日志

---

### User Story 5 - 终端管理 (Priority: P2)

管理员需要为不同终端（Web、iOS、Android、小程序）配置独立的模型和功能开关。

**Why this priority**: 多终端支持是平台扩展的基础，但一期以 Web 端为主。

**Independent Test**: 管理员为 iOS 终端配置独立的 TTS 音色，iOS 用户听到的语音使用该配置。

**Acceptance Scenarios**:

1. **Given** 管理员在终端管理页面, **When** 为 iOS 端配置独立的 LLM 模型, **Then** iOS 端请求使用指定模型
2. **Given** 管理员查看终端统计, **When** 选择"Web"终端, **Then** 显示 Web 端独立的用户数、请求数、活跃度

---

### Edge Cases

- 管理员配置无效的 API Key 时？系统验证失败并提示，不保存无效配置
- 多个管理员同时修改同一配置时？显示冲突提示，最后保存者覆盖
- 日志量过大导致查询超时时？支持时间范围限制和分页加载
- 费用计算精度问题？保留小数点后 4 位，显示时四舍五入到 2 位

## Requirements

### Functional Requirements

**模型管理**
- **FR-001**: 系统必须支持 LLM 模型配置（provider、模型名、API Key、temperature、max_tokens、top_p）
- **FR-002**: 系统必须支持 ASR 模型配置（provider、模型名、API Key、语言、采样率）
- **FR-003**: 系统必须支持 TTS 模型配置（provider、模型名、API Key、音色、语速、音量）
- **FR-004**: API Key 必须加密存储，界面仅显示部分掩码（如 sk-****1234）
- **FR-005**: 配置修改必须支持热更新，无需重启服务

**用量监控**
- **FR-006**: 系统必须记录每次模型调用（时间、用户、模型、输入 token、输出 token）
- **FR-007**: 系统必须提供日/周/月维度的调用统计和费用估算
- **FR-008**: 系统必须支持费用阈值告警配置

**日志观测**
- **FR-009**: 系统必须记录每次 API 请求（trace_id、时间、用户、模型、状态码、耗时）
- **FR-010**: 系统必须支持按 conversation_id、user_id、时间范围查询日志
- **FR-011**: 系统必须展示完整对话链路（ASR → LLM → TTS 各阶段耗时）
- **FR-012**: 系统必须提供 P50/P95/P99 延迟统计

**系统设置**
- **FR-013**: 系统必须支持全局默认模型配置
- **FR-014**: 系统必须支持全局速率限制配置
- **FR-015**: 系统必须支持全局超时配置

**终端管理**
- **FR-016**: 系统必须支持按终端类型（Web/iOS/Android/小程序）独立配置
- **FR-017**: 系统必须支持按终端类型统计用量

**权限控制**
- **FR-018**: 后台管理系统必须仅限管理员访问
- **FR-019**: 系统必须记录管理员操作审计日志

### Key Entities

- **ModelConfig**: 模型配置（provider、model_name、api_key_encrypted、parameters、is_default、terminal_type）
- **UsageLog**: 用量记录（model_type、model_name、user_id、input_tokens、output_tokens、cost、created_at）
- **RequestLog**: 请求日志（trace_id、conversation_id、user_id、request_type、status_code、latency_ms、created_at）
- **SystemSetting**: 系统设置（key、value、description、updated_at）
- **Terminal**: 终端配置（type、name、config_overrides、feature_flags、is_active）

## Success Criteria

### Measurable Outcomes

- **SC-001**: 管理员可以在 30 秒内完成模型切换配置
- **SC-002**: 配置热更新延迟不超过 5 秒
- **SC-003**: 用量统计页面加载时间不超过 3 秒
- **SC-004**: 日志查询响应时间不超过 5 秒（单次查询最多 1000 条）
- **SC-005**: API Key 存储满足 AES-256 加密标准
- **SC-006**: 系统支持保留 90 天的请求日志和用量数据

## Assumptions

- 管理员已通过现有认证系统登录，具有 admin 角色
- 后端复用现有 FastAPI 架构，新增 admin 模块
- 前端使用独立的 /admin 路由，复用现有组件库
- 费用估算基于各 provider 公开定价，不考虑自定义折扣
- 一期仅支持 Web 端后台访问，暂不支持移动端
- 日志存储使用现有 MySQL 数据库，后续可迁移到专用日志系统

## Out of Scope (本期不包含)

- 用户管理（CRUD、角色权限）- 二期实现
- Prompt 管理（系统 Prompt 模板）- 二期实现
- 知识库管理（RAG）- 二期实现
- VD 视频理解模型配置 - 预留接口，后续实现
