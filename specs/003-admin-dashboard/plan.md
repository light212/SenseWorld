# Implementation Plan: SenseWorld 后台管理系统

**Branch**: `003-admin-dashboard` | **Date**: 2026-03-26 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-admin-dashboard/spec.md`
**Architecture Review**: Required before implementation starts

## Summary

为 SenseWorld 多模态 AI 对话平台构建后台管理系统，实现：
1. **模型配置管理**（P0）：LLM/ASR/TTS 模型热更新配置，API Key 加密存储
2. **用量监控与费用分析**（P0）：调用统计、token 消耗、费用估算图表
3. **请求日志与会话追踪**（P1）：trace_id 链路追踪、P50/P95/P99 延迟统计
4. **系统全局设置**（P1）：默认模型、速率限制、超时配置
5. **终端管理**（P2）：多终端独立配置

技术方案：复用现有 FastAPI + Next.js 架构，新增 admin 模块；配置热更新采用 DB 轮询 + Redis 缓存（TTL 5s）；日志通过每日定时任务清理 90 天前数据。

**关键指标**：
- 配置热更新延迟：≤5秒
- 用量统计页面加载：≤3秒
- 日志查询响应：≤5秒（1000条内）
- 支持并发管理员：1-5人
- 日志保留期：90天

## Technical Context

**Language/Version**: Python 3.11+ (Backend), TypeScript 5.3+ (Frontend)
**Primary Dependencies**: FastAPI 0.109+, SQLAlchemy 2.0+, Alembic, Next.js 14.1, React 18, Zustand, Tailwind CSS
**Storage**: MySQL 8+ (via aiomysql), Redis 5+ (缓存)
**Testing**: pytest + pytest-asyncio (Backend), Jest + React Testing Library (Frontend)
**Target Platform**: Linux server (Docker), Web browser (Chrome/Safari/Firefox)
**Project Type**: Web application (Full-stack: API + SPA)
**Performance Goals**: 用量统计页面 <3s 加载，日志查询 <5s（1000 条内），配置热更新延迟 <5s
**Constraints**: API Key AES-256 加密存储，日志保留 90 天，站内告警通知
**Scale/Scope**: 单管理员（一期），~5 个后台页面，~15 个 API 端点

## Design Integration Plan

### Design Involvement Timeline
**Phase 1.5 (Week 2.5): 设计专项阶段**
- 在基础架构完成后，核心功能开发前介入
- 设计团队需要 5-7 个工作日完成所有设计工作
- 产出物作为 plan.md 的补充设计规范

### Design Vision & Principles

**设计愿景**：为 SenseWorld 后台管理系统打造专业、高效、易用的管理界面，让运维人员在 30 秒内完成核心操作。

**设计原则**：
1. **数据优先**：后台核心是数据展示，图表、表格清晰易读
2. **操作高效**：高频操作一键可达，配置修改即时生效
3. **状态可见**：配置变更、系统状态、告警信息实时反馈
4. **安全可控**：敏感信息脱敏显示，关键操作二次确认

### Visual Style Guide

**整体风格**：现代后台管理风格，参考 Linear/Vercel Dashboard

**配色系统**：
| 用途 | 颜色 | CSS 变量 |
|------|------|----------|
| 页面背景 | `#ffffff` | `--bg-primary` |
| 卡片背景 | `#f9fafb` | `--bg-secondary` |
| 主色 | `#3b82f6` | `--primary-500` |
| 主文字 | `#111827` | `--text-primary` |
| 次要文字 | `#6b7280` | `--text-secondary` |
| 成功 | `#22c55e` | `--success` |
| 错误 | `#ef4444` | `--error` |
| 边框 | `#e5e7eb` | `--border-default` |

**字体系统**：
- 字体族：Inter, -apple-system, sans-serif
- 正文：14px / 1.5
- 标题：16px-24px / 1.4
- 数据：等宽数字 (tabular-nums)

**间距系统**：基于 4px 单位，组件内 8-12px，组件间 16-24px

### Design Deliverables

1. **详细设计文档** (`design.md`)
   - 页面布局规范
   - 组件设计规范
   - 交互流程设计
   - 状态设计（加载、错误、空状态）

2. **页面设计**（5个核心页面）
   - Dashboard 首页（概览）
   - 模型配置页
   - 用量监控页
   - 日志查询页
   - 系统设置页

3. **组件设计规范**
   - 图表组件（用量趋势、费用分析）
   - 表格组件（日志查询、配置列表）
   - 表单组件（配置表单、API Key 输入）
   - 告警组件（徽章、通知）

4. **设计资源**
   - Figma 设计稿
   - 切图资源
   - 图标库

### Design Review Gates

| Gate | Criteria | Status |
|------|----------|--------|
| 视觉风格一致 | 所有页面采用统一配色、字体、间距 | ⏳ 待确认 |
| 组件规范完整 | 所有组件有设计规范文档 | ⏳ 待确认 |
| 交互流程清晰 | 关键流程有交互图 | ⏳ 待确认 |
| 无障碍达标 | WCAG AA 标准，对比度 ≥4.5:1 | ⏳ 待确认 |
| 技术可行 | 开发团队确认可实现 | ⏳ 待确认 |

### Dependencies Analysis

#### Backend Dependencies
- **加密库**：cryptography (AES-256 加密)
- **任务调度**：APScheduler (定时清理任务)
- **缓存**：redis-py (Redis 客户端)
- **数据验证**：Pydantic v2 (请求/响应模型)
- **数据库**：aiomysql + SQLAlchemy 2.0 (异步 ORM)

#### Frontend Dependencies
- **图表库**：Chart.js 或 ECharts (用量统计图表)
- **表格组件**：TanStack Table (日志查询表格)
- **状态管理**：Zustand (已存在)
- **HTTP 客户端**：Axios 或 fetch API
- **UI 组件**：Headless UI + Tailwind CSS (已存在)

#### Infrastructure Dependencies
- **数据库**：MySQL 8.0+ (已存在)
- **缓存**：Redis 5+ (已存在)
- **容器化**：Docker + Docker Compose (已存在)
- **部署**：现有 CI/CD 流程

## Architecture Review & Integration

### Architect Involvement Timeline

**Pre-Phase 0 (Before Development Starts)**
- 架构师需要在开发开始前介入，参与技术方案评审
- 重点审查架构决策和技术选型
- 确保与现有系统架构的一致性

**Phase 1 (Ongoing)**
- 架构师参与关键技术决策
- 审查数据库设计和API设计
- 确保架构原则的遵循

### Architecture Review Gates

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| 代码结构清晰 | ✅ PASS | 复用现有 backend/frontend 分层结构 |
| 测试覆盖 | ✅ PASS | 计划包含 API 集成测试 + 前端单元测试 |
| 安全合规 | ✅ PASS | API Key 加密存储，admin 权限隔离 |
| 可观测性 | ✅ PASS | 请求日志、用量监控、trace_id 链路 |
| 架构一致性 | ✅ PASS | 符合现有 FastAPI + Next.js 架构模式 |
| 扩展性设计 | ✅ PASS | 支持未来多租户和分布式部署 |
| 性能设计 | ✅ PASS | 缓存策略、数据库优化、前端性能考虑 |

### Architecture Decisions Log

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| 复用现有 FastAPI + Next.js 架构 | 降低学习成本，保持技术栈统一 | 新建独立服务、微服务架构 |
| DB 轮询 + Redis 缓存热更新 | 简单可靠，满足5秒更新要求 | WebSocket 实时推送、长轮询 |
| MySQL 存储日志数据 | 利用现有基础设施，简化部署 | 专用日志系统（ELK）、时序数据库 |
| AES-256 加密 API Key | 满足安全要求，库支持成熟 | 应用层加密、数据库加密 |

### Cross-Cutting Concerns Review

**Security Architecture**
- [ ] 权限控制架构符合安全最佳实践
- [ ] 数据加密方案经过安全团队审核
- [ ] API 安全设计（认证、授权、输入验证）

**Scalability Architecture**
- [ ] 支持未来用户规模增长
- [ ] 数据库设计支持大数据量
- [ ] 缓存策略优化性能

**Operational Architecture**
- [ ] 监控和告警架构完整
- [ ] 日志和追踪系统有效
- [ ] 部署和运维流程清晰

## Project Structure

### Documentation (this feature)

```text
specs/003-admin-dashboard/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── admin-api.yaml   # Admin API OpenAPI spec
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── api/v1/
│   │   └── admin.py           # Admin API routes (已存在，需扩展)
│   ├── models/
│   │   ├── model_config.py    # 模型配置 (已存在，需扩展)
│   │   ├── usage_log.py       # 用量日志 (新增)
│   │   ├── request_log.py     # 请求日志 (新增)
│   │   ├── system_setting.py  # 系统设置 (新增)
│   │   └── alert.py           # 告警通知 (新增)
│   ├── services/
│   │   ├── config_service.py  # 配置服务 (新增)
│   │   ├── usage_service.py   # 用量统计服务 (新增)
│   │   └── alert_service.py   # 告警服务 (新增)
│   └── tasks/
│       └── cleanup.py         # 定时清理任务 (新增)
└── tests/
    └── api/
        └── test_admin.py      # Admin API 测试 (新增)

frontend/
├── src/
│   ├── app/admin/
│   │   ├── layout.tsx         # Admin 布局 (已存在)
│   │   ├── page.tsx           # Dashboard 首页 (已存在)
│   │   ├── models/page.tsx    # 模型配置页 (已存在，需完善)
│   │   ├── usage/page.tsx     # 用量监控页 (新增)
│   │   ├── logs/page.tsx      # 日志查询页 (新增)
│   │   └── settings/page.tsx  # 系统设置页 (新增)
│   ├── components/admin/
│   │   ├── UsageChart.tsx     # 用量图表组件 (新增)
│   │   ├── LogTable.tsx       # 日志表格组件 (新增)
│   │   └── AlertBadge.tsx     # 告警徽章组件 (新增)
│   └── services/
│       └── adminApi.ts        # Admin API 客户端 (新增)
└── tests/
    └── admin/                 # Admin 组件测试 (新增)
```

**Structure Decision**: 复用现有 backend/frontend 分离架构，Admin 功能作为独立模块添加到 `/admin` 路由下。

## Complexity Tracking

> Constitution Check passed without violations. No justifications needed.

| Area | Complexity | Rationale |
|------|------------|-----------|
| 数据模型 | Low | 4 个新表，字段简单明确 |
| API 设计 | Medium | ~15 端点，需处理分页、筛选、聚合 |
| 前端页面 | Medium | 5 个页面，包含图表和表格组件 |
| 热更新机制 | Low | 简单缓存 + TTL，无复杂事件系统 |
| 定时任务 | Low | 单一清理任务，使用 APScheduler |
| 权限控制 | Low | 基于现有认证系统，admin/user 二级角色 |
| 数据加密 | Medium | API Key AES-256 加密存储，需要密钥管理 |

## Implementation Timeline

**Phase 1 (Week 1-2): 数据模型与基础架构**
- [ ] 创建新的数据库模型（UsageLog、RequestLog、SystemSetting、Alert）
- [ ] 实现数据库迁移脚本
- [ ] 配置加密服务（API Key 加密/解密）
- [ ] 基础 Admin API 结构搭建

**Phase 1.5 (Week 2.5): 设计介入阶段**
- [ ] UI/UX 设计评审会议
- [ ] 后台管理系统整体界面设计
- [ ] 各功能页面原型设计（模型配置、用量监控、日志查询、系统设置）
- [ ] 图表和表格组件设计规范
- [ ] 交互流程设计文档
- [ ] 设计系统与现有组件库整合

**Phase 2 (Week 3-4): 核心功能实现**
- [ ] 模型配置管理 API 和前端页面（基于设计稿）
- [ ] 用量监控统计 API 和图表组件（基于设计稿）
- [ ] 请求日志查询 API 和表格组件（基于设计稿）
- [ ] 系统设置管理 API 和前端页面（基于设计稿）

**Phase 3 (Week 5): 高级功能与集成**
- [ ] 告警通知系统
- [ ] 定时清理任务
- [ ] 热更新机制完善
- [ ] 权限控制和审计日志

**Phase 4 (Week 6): 测试与优化**
- [ ] API 集成测试
- [ ] 前端组件测试
- [ ] 性能测试和优化
- [ ] 文档完善和部署准备

## Risk Analysis

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|--------------------|
| 配置热更新延迟过高 | Low | Medium | 优化缓存策略，考虑使用 Redis Pub/Sub |
| 日志查询性能问题 | Medium | High | 实现分页、索引优化、查询限制 |
| API Key 加密密钥管理 | Medium | High | 使用密钥管理服务，定期轮换 |
| 费用计算精度问题 | Low | Medium | 使用高精度数值类型，统一计算逻辑 |
| 权限控制漏洞 | Low | High | 严格的代码审查，安全测试 |

## Performance Considerations

1. **数据库优化**：
   - 为日志表添加合适索引（时间、用户ID、trace_id）
   - 使用分页查询避免大数据量加载
   - 考虑分区表处理历史数据

2. **缓存策略**：
   - 配置信息 Redis 缓存 TTL 5秒
   - 用量统计数据缓存 1分钟
   - 避免缓存敏感信息

3. **前端性能**：
   - 图表数据懒加载
   - 表格虚拟滚动
   - API 请求防抖

## Security Considerations

1. **数据保护**：
   - API Key 必须 AES-256 加密存储
   - 前端永远不显示完整的 API Key
   - 审计日志记录所有配置变更

2. **访问控制**：
   - 严格的 admin 权限验证
   - API 端点权限中间件
   - 防止越权访问

3. **数据安全**：
   - 日志数据脱敏处理
   - 敏感操作二次确认
   - 定期安全审计

## Monitoring & Observability

1. **系统监控**：
   - Admin API 请求监控
   - 配置变更审计日志
   - 异常操作告警

2. **业务监控**：
   - 模型配置变更追踪
   - 费用异常告警
   - 用量趋势分析

3. **运维监控**：
   - 清理任务执行状态
   - 缓存命中率监控
   - 数据库性能监控

## Future Extensibility

1. **预留接口**：
   - 用户管理接口设计
   - Prompt 模板管理
   - 知识库管理框架

2. **架构扩展**：
   - 支持多租户配置
   - 分布式部署支持
   - 微服务架构演进

3. **功能扩展**：
   - 多语言支持
   - 移动端管理界面
   - 第三方集成接口

## Acceptance Criteria

### 功能验收标准
- [ ] **模型配置管理**：管理员可在 30 秒内完成模型切换，配置热更新延迟 ≤5秒
- [ ] **用量监控**：支持日/周/月统计，费用计算误差 ≤0.01元，图表加载时间 ≤3秒
- [ ] **日志查询**：支持按 conversation_id、user_id、时间范围查询，1000条数据查询时间 ≤5秒
- [ ] **系统设置**：全局配置修改后立即生效，支持速率限制和超时配置
- [ ] **权限控制**：仅 admin 角色可访问后台，操作记录审计日志

### 技术验收标准
- [ ] **API 测试**：所有 Admin API 端点测试覆盖率 ≥80%
- [ ] **前端测试**：关键组件单元测试覆盖率 ≥70%
- [ ] **安全测试**：API Key 加密存储验证，权限控制测试通过
- [ ] **性能测试**：满足性能指标要求（页面加载、查询响应、热更新延迟）
- [ ] **兼容性测试**：Chrome、Safari、Firefox 主流版本兼容

### 部署验收标准
- [ ] **数据库迁移**：所有新表结构正确创建，数据迁移脚本可正常执行
- [ ] **配置管理**：加密密钥配置正确，Redis 缓存正常工作
- [ ] **定时任务**：清理任务正常调度，日志清理功能正常
- [ ] **监控告警**：系统监控指标正常，告警功能可用
- [ ] **文档完整**：API 文档、部署文档、运维文档齐全
