# Tasks: 多模态 AI 对话平台

**Input**: Design documents from `/specs/001-multimodal-ai-chat/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: 未要求 TDD 或强制测试任务，本列表不包含测试任务
**Organization**: 按用户故事分组，确保每个故事可独立实现与验收

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 项目初始化与基础工程结构

- [x] T001 创建后端工程结构并初始化 FastAPI 项目于 backend/
- [x] T002 创建前端工程结构并初始化 Next.js 项目于 frontend/
- [x] T003 [P] 添加后端配置与环境变量模板在 backend/app/config.py 和 backend/.env.example
- [x] T004 [P] 添加前端环境变量模板在 frontend/.env.example
- [x] T005 [P] 创建基础 README 说明在 backend/README.md 与 frontend/README.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 所有用户故事的基础设施（必须先完成）

- [x] T006 设置数据库连接与会话管理在 backend/app/core/database.py
- [x] T007 初始化 Alembic 迁移配置在 backend/alembic/ 与 backend/alembic.ini
- [x] T008 [P] 定义 User/Conversation/Message ORM 模型在 backend/app/models/user.py、backend/app/models/conversation.py、backend/app/models/message.py
- [x] T009 创建基础 Pydantic schemas 在 backend/app/schemas/auth.py、backend/app/schemas/conversation.py、backend/app/schemas/message.py
- [x] T010 实现 JWT 认证与密码哈希在 backend/app/core/security.py
- [x] T011 配置全局错误处理与日志中间件在 backend/app/main.py
- [x] T012 建立 API 路由骨架在 backend/app/api/v1/__init__.py 与 backend/app/api/v1/auth.py、conversation.py、message.py
- [x] T013 实现 WebSocket 基础连接处理在 backend/app/api/websocket.py
- [x] T014 配置 Redis 客户端与会话缓存支持在 backend/app/core/database.py
- [x] T015 创建前端 API 客户端基础封装在 frontend/src/services/api.ts
- [x] T016 创建前端 WebSocket 封装 Hook 在 frontend/src/hooks/useWebSocket.ts

**Checkpoint**: Foundational 完成后，所有用户故事可并行推进

---

## Phase 3: User Story 1 - 语音对话交互 (Priority: P1) 🎯 MVP

**Goal**: 语音输入 → ASR → LLM → TTS → 语音播放

**Independent Test**: 用户点击录音、说话、发送并听到 AI 语音回复

### Implementation for User Story 1

- [x] T017 [P] 实现后端 ASR 服务封装在 backend/app/services/asr_service.py
- [x] T018 [P] 实现后端 TTS 服务封装在 backend/app/services/tts_service.py
- [x] T019 [P] 实现后端 LLM 服务封装在 backend/app/services/llm_service.py
- [x] T020 实现语音转文字接口在 backend/app/api/v1/speech.py
- [x] T021 实现语音输入消息处理逻辑在 backend/app/services/conversation_service.py
- [x] T022 [P] 实现前端录音与波形反馈组件在 frontend/src/components/chat/VoiceInput.tsx
- [x] T023 [P] 实现前端音频播放组件在 frontend/src/components/chat/AudioPlayer.tsx
- [x] T024 集成语音输入流程与发送逻辑在 frontend/src/components/chat/ChatWindow.tsx

---

## Phase 4: User Story 2 - 流式实时响应 (Priority: P1)

**Goal**: LLM 文本与 TTS 音频流式输出与播放

**Independent Test**: 发送长问题后文字逐步出现，语音边生成边播放

### Implementation for User Story 2

- [x] T025 实现 WebSocket 消息协议与事件类型在 specs/001-multimodal-ai-chat/contracts/websocket.md
- [x] T026 实现后端流式 LLM 输出推送在 backend/app/api/websocket.py
- [x] T027 实现后端 TTS 流式合成与分块发送在 backend/app/services/tts_service.py
- [x] T028 [P] 实现前端流式文本渲染在 frontend/src/components/chat/MessageList.tsx
- [x] T029 [P] 实现前端流式音频播放逻辑在 frontend/src/hooks/useAudioPlayer.ts
- [x] T030 集成流式 WebSocket 消息处理在 frontend/src/hooks/useWebSocket.ts

---

## Phase 5: User Story 6 - 多轮对话上下文 (Priority: P1)

**Goal**: 多轮对话上下文保持与隔离

**Independent Test**: 连续多轮对话可引用上文，且不同会话互不干扰

### Implementation for User Story 6

- [x] T031 实现对话上下文缓存逻辑在 backend/app/services/conversation_service.py
- [x] T032 [P] 持久化消息记录在 backend/app/services/conversation_service.py
- [x] T033 [P] 实现上下文隔离与会话切换支持在 backend/app/services/conversation_service.py
- [x] T034 [P] 前端会话状态管理在 frontend/src/stores/conversationStore.ts
- [x] T035 集成上下文发送策略在 backend/app/services/llm_service.py

---

## Phase 6: User Story 3 - 文字输入备选 (Priority: P2)

**Goal**: 文字输入作为语音的替代输入方式

**Independent Test**: 用户打字发送并收到文字/语音回复

### Implementation for User Story 3

- [x] T036 [P] 实现文字输入组件在 frontend/src/components/chat/TextInput.tsx
- [x] T037 实现文字消息发送接口在 backend/app/api/v1/message.py
- [x] T038 集成文字输入发送流程在 frontend/src/components/chat/ChatWindow.tsx
- [x] T039 实现回复呈现方式选择逻辑在 frontend/src/components/chat/ChatWindow.tsx

---

## Phase 7: User Story 5 - 首次使用引导 (Priority: P2)

**Goal**: 新用户麦克风授权与首次使用引导

**Independent Test**: 新用户首次进入可完成授权并开始对话

### Implementation for User Story 5

- [x] T040 实现麦克风权限检测逻辑在 frontend/src/hooks/useVoiceRecorder.ts
- [x] T041 实现首次使用引导 UI 在 frontend/src/components/chat/VoiceInput.tsx
- [x] T042 添加引导与教程状态存储在 frontend/src/stores/conversationStore.ts
- [x] T043 实现授权被拒绝的备选提示在 frontend/src/components/chat/VoiceInput.tsx

---

## Phase 8: User Story 7 - 错误恢复与重试 (Priority: P2)

**Goal**: 语音识别错误可编辑或重录

**Independent Test**: 用户可编辑转写文字或重新录音后发送

### Implementation for User Story 7

- [x] T044 实现转写结果可编辑 UI 在 frontend/src/components/chat/VoiceInput.tsx
- [x] T045 实现重新录制与取消录制逻辑在 frontend/src/hooks/useVoiceRecorder.ts
- [x] T046 在后端增加错误响应统一格式在 backend/app/schemas/message.py
- [x] T047 前端显示错误提示与重试入口在 frontend/src/components/chat/ChatWindow.tsx

---

## Phase 9: User Story 4 - 对话历史管理 (Priority: P2)

**Goal**: 查看、创建、删除对话历史

**Independent Test**: 用户可查看列表、打开历史对话、删除记录

### Implementation for User Story 4

- [x] T048 实现对话列表接口在 backend/app/api/v1/conversation.py
- [x] T049 实现对话详情与消息列表接口在 backend/app/api/v1/conversation.py 和 backend/app/api/v1/message.py
- [x] T050 实现删除对话接口在 backend/app/api/v1/conversation.py
- [x] T051 [P] 实现对话列表 UI 在 frontend/src/components/chat/ConversationList.tsx
- [x] T052 集成对话切换与加载在 frontend/src/components/chat/ChatWindow.tsx

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: 跨故事改进与收尾工作

- [x] T053 [P] 添加可访问性支持（键盘导航/ARIA）在 frontend/src/components/chat/
- [x] T054 [P] 增加性能与时延指标埋点在 backend/app/services/ 和 frontend/src/hooks/
- [x] T055 [P] 更新 quickstart 文档在 specs/001-multimodal-ai-chat/quickstart.md
- [x] T056 安全与隐私合规检查清单在 specs/001-multimodal-ai-chat/checklists/security.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖，可立即开始
- **Foundational (Phase 2)**: 依赖 Setup 完成，阻塞所有用户故事
- **User Stories (Phase 3-9)**: 依赖 Foundational 完成
- **Polish (Phase 10)**: 依赖所有目标用户故事完成

### User Story Dependencies

- **US-1/US-2/US-6 (P1)**: 可在 Foundational 后并行执行
- **US-3/US-5/US-7 (P2)**: 可在 P1 稳定后并行推进
- **US-4 (P2)**: 建议在核心对话稳定后实施

### Parallel Opportunities

- Phase 1: T003, T004, T005 可并行
- Phase 2: T008, T009, T010, T015, T016 可并行
- US-1: T017, T018, T019, T022, T023 可并行
- US-2: T028, T029 可并行
- US-6: T031, T032, T033, T034 可并行
- US-3: T036 可并行
- US-5: T040, T041, T043 可并行
- US-7: T044, T045, T047 可并行
- US-4: T051 可并行

---

## Parallel Execution Examples

### US-1 (语音对话交互)

- 并行任务: T017 (ASR 服务) + T018 (TTS 服务) + T019 (LLM 服务) + T022 (VoiceInput) + T023 (AudioPlayer)

### US-2 (流式实时响应)

- 并行任务: T028 (流式文本渲染) + T029 (音频流播放)

### US-6 (多轮对话上下文)

- 并行任务: T031 (上下文缓存) + T032 (消息持久化) + T034 (前端状态管理)

### US-4 (对话历史管理)

- 并行任务: T048 (对话列表接口) + T051 (对话列表 UI)