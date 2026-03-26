# Tasks: SenseWorld 后台管理系统

**Input**: Design documents from `/specs/003-admin-dashboard/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: 未在 spec 中要求测试任务，本清单不强制生成测试任务。

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 [P] 添加定时任务依赖到 backend/pyproject.toml (apscheduler)
- [x] T002 [P] 添加图表依赖到 frontend/package.json (recharts)
- [x] T003 配置 ENCRYPTION_KEY 与 REDIS_URL 示例到 backend/.env.example 并在 backend/app/config.py 读取
- [x] T004 [P] 创建 Admin API 客户端封装在 frontend/src/services/adminApi.ts
- [x] T005 在 backend/app/main.py 注册 admin 路由并确认 /api/v1/admin 前缀可用

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [x] T006 新增管理员权限依赖 backend/app/api/v1/deps.py 并在 backend/app/api/v1/admin.py 统一引用
- [x] T007 在 frontend/src/app/admin/layout.tsx 增加基础路由守卫与导航布局
- [x] T008 新增定时清理任务 backend/app/tasks/cleanup.py 并在 backend/app/main.py 的 lifespan 挂载

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - 模型配置管理 (Priority: P0) 🎯 MVP

**Goal**: 管理员可在后台配置 LLM/ASR/TTS 模型并热更新生效

**Independent Test**: 管理员修改 LLM 模型配置并保存，前端对话 5 秒内使用新配置

### Implementation for User Story 1

- [x] T009 [P] 扩展模型字段与索引 in backend/app/models/model_config.py
- [x] T010 [P] 新增 API Key 加密工具 in backend/app/core/encryption.py
- [x] T011 新增 ModelConfig 迁移文件 in backend/alembic/versions/ (添加 api_key_encrypted/价格/默认/终端字段)
- [x] T012 实现配置服务 in backend/app/services/config_service.py (CRUD + default + cache)
- [x] T013 更新模型配置 API in backend/app/api/v1/admin.py (掩码返回 + set-default)
- [x] T014 [P] 新增模型配置表单与列表组件 in frontend/src/components/admin/ModelConfigForm.tsx 与 frontend/src/components/admin/ModelConfigTable.tsx
- [x] T015 完善模型配置页面 in frontend/src/app/admin/models/page.tsx (接入 adminApi)

**Checkpoint**: User Story 1 应可独立完成功能验收

---

## Phase 4: User Story 2 - 用量监控与费用分析 (Priority: P0) 🎯 MVP

**Goal**: 管理员可查看用量统计、费用估算和阈值告警

**Independent Test**: 在用量监控页可查看本周统计图表，并出现超阈值站内告警

### Implementation for User Story 2

- [x] T016 [P] 新增用量日志模型 in backend/app/models/usage_log.py
- [x] T017 [P] 新增告警模型 in backend/app/models/alert.py
- [x] T018 实现用量统计服务 in backend/app/services/usage_service.py (聚合查询 + 费用计算)
- [x] T019 实现告警服务 in backend/app/services/alert_service.py (阈值检测 + 站内通知)
- [x] T020 更新用量与告警 API in backend/app/api/v1/admin.py (/usage/*, /alerts/*)
- [x] T021 扩展前端 API 客户端 in frontend/src/services/adminApi.ts (usage/alerts)
- [x] T022 [P] 新增用量图表与摘要组件 in frontend/src/components/admin/UsageChart.tsx 与 frontend/src/components/admin/UsageSummaryCards.tsx
- [x] T023 完善用量监控页 in frontend/src/app/admin/usage/page.tsx
- [x] T024 在 frontend/src/components/admin/AlertBadge.tsx 实现未读告警徽章并挂载到 frontend/src/app/admin/layout.tsx

**Checkpoint**: User Story 2 应可独立完成功能验收

---

## Phase 5: User Story 3 - 请求日志与会话追踪 (Priority: P1)

**Goal**: 运维可查询请求日志与对话链路耗时

**Independent Test**: 通过 conversation_id 查询日志并查看完整链路耗时

### Implementation for User Story 3

- [x] T025 [P] 新增请求日志模型 in backend/app/models/request_log.py
- [x] T026 实现日志服务 in backend/app/services/request_log_service.py (写入 + 延迟统计)
- [x] T027 在 backend/app/core/middleware.py 增加请求日志记录中间件
- [x] T028 更新日志查询 API in backend/app/api/v1/admin.py (/logs, /logs/latency-stats)
- [x] T029 [P] 新增日志表格与详情组件 in frontend/src/components/admin/LogTable.tsx 与 frontend/src/components/admin/LogDetailDrawer.tsx
- [x] T030 完善日志查询页 in frontend/src/app/admin/logs/page.tsx (筛选/分页/详情)

**Checkpoint**: User Story 3 应可独立完成功能验收

---

## Phase 6: User Story 4 - 系统全局设置 (Priority: P1)

**Goal**: 管理员可配置系统级默认模型、速率限制、超时等参数

**Independent Test**: 修改超时设置后，新请求使用新超时配置

### Implementation for User Story 4

- [x] T031 [P] 新增系统设置模型 in backend/app/models/system_setting.py
- [x] T032 实现系统设置服务 in backend/app/services/system_setting_service.py (CRUD + 验证)
- [x] T033 更新系统设置 API in backend/app/api/v1/admin.py (/settings)
- [x] T034 应用设置到运行时 in backend/app/config.py 与 backend/app/services/config_service.py
- [x] T035 完善系统设置页 in frontend/src/app/admin/settings/page.tsx

**Checkpoint**: User Story 4 应可独立完成功能验收

---

## Phase 7: User Story 5 - 终端管理 (Priority: P2)

**Goal**: 支持按终端类型配置模型与功能开关

**Independent Test**: iOS 终端配置独立模型后，iOS 请求生效

### Implementation for User Story 5

- [x] T036 [P] 新增终端模型 in backend/app/models/terminal.py
- [x] T037 实现终端管理服务 in backend/app/services/terminal_service.py
- [x] T038 扩展 API 契约 in specs/003-admin-dashboard/contracts/admin-api.yaml (新增 /admin/terminals)
- [x] T039 更新终端管理 API in backend/app/api/v1/admin.py
- [x] T040 [P] 新增终端管理页面与组件 in frontend/src/app/admin/terminals/page.tsx 与 frontend/src/components/admin/TerminalTable.tsx
- [x] T041 更新导航入口 in frontend/src/app/admin/layout.tsx

**Checkpoint**: User Story 5 应可独立完成功能验收

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T042 [P] 更新架构说明文档 in docs/architecture/admin-config.md
- [x] T043 添加日志与用量索引迁移 in backend/alembic/versions/ (usage_logs/request_logs 索引)
- [x] T044 统一日志脱敏与截断逻辑 in backend/app/services/request_log_service.py
- [x] T045 验证 quickstart 流程并修订 specs/003-admin-dashboard/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P0)**: No dependencies after Foundational
- **US2 (P0)**: No dependencies after Foundational
- **US3 (P1)**: No dependencies after Foundational
- **US4 (P1)**: No dependencies after Foundational
- **US5 (P2)**: No dependencies after Foundational

### Parallel Opportunities

- Phase 1 tasks T001/T002/T004 can run in parallel
- Model/usage/log/settings/terminal models can be worked on in parallel across different files
- Frontend components for different pages can be built in parallel

---

## Parallel Example: User Story 1

```bash
Task: "扩展模型字段与索引 in backend/app/models/model_config.py"
Task: "新增 API Key 加密工具 in backend/app/core/encryption.py"
Task: "新增模型配置表单与列表组件 in frontend/src/components/admin/ModelConfigForm.tsx 与 frontend/src/components/admin/ModelConfigTable.tsx"
```

## Parallel Example: User Story 2

```bash
Task: "新增用量日志模型 in backend/app/models/usage_log.py"
Task: "新增告警模型 in backend/app/models/alert.py"
Task: "新增用量图表与摘要组件 in frontend/src/components/admin/UsageChart.tsx 与 frontend/src/components/admin/UsageSummaryCards.tsx"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational
3. 完成 Phase 3: User Story 1
4. **停止并验证**：单独验收 US1

### Incremental Delivery

1. Setup + Foundational
2. US1 → 验收
3. US2 → 验收
4. US3 → 验收
5. US4 → 验收
6. US5 → 验收

### Parallel Team Strategy

- Dev A: US1 (模型配置)
- Dev B: US2 (用量监控)
- Dev C: US3 (日志追踪)
- Dev D: US4/US5 (设置与终端)
