<!--
Sync Impact Report:
- Version change: 0.0.0 → 1.0.0
- Added principles: Schema Change Protocol (NON-NEGOTIABLE)
- Added sections: Backend Deployment Workflow, Quality Gates
- Templates requiring updates: ✅ N/A (initial version)
-->

# SenseWorld Constitution

## Core Principles

### I. Schema Change Protocol (NON-NEGOTIABLE)

当任务涉及**数据结构变动**时，MUST 重新执行后台部署流程。数据结构变动包括但不限于：

- 数据库表结构变更（新增表、新增/修改/删除字段、索引变更）
- ORM 模型定义变更（SQLAlchemy Model）
- Pydantic Schema 变更（请求/响应模型）
- API 契约变更（新增/修改端点、字段）

**强制执行步骤**：
1. 生成 Alembic 迁移脚本：`alembic revision --autogenerate -m "描述"`
2. 检查生成的迁移脚本是否正确
3. 应用迁移：`alembic upgrade head`
4. 重启后端服务验证启动无报错
5. 运行最小导入验证：`python -c "from app.main import app; print('ok')"`

### II. Incremental Implementation

每次任务聚焦单一功能点，避免大范围改动：
- 一个 PR 只做一件事
- 改动前先确认影响范围
- 改动后立即验证

### III. Observability

所有服务 MUST 支持结构化日志，包含 trace_id、user_id 等上下文字段。

## Backend Deployment Workflow

后台部署流程（数据结构变更时 MUST 执行）：

```bash
# 1. 安装依赖（如有新增）
cd backend && pip install -e .

# 2. 生成迁移（如有模型变更）
alembic revision --autogenerate -m "<描述>"

# 3. 检查迁移脚本
cat alembic/versions/<最新迁移文件>.py

# 4. 应用迁移
alembic upgrade head

# 5. 重启服务
lsof -ti tcp:8000 | xargs -r kill
/path/to/backend/.venv/bin/uvicorn app.main:app --reload --port 8000 --app-dir /path/to/backend
```

## Quality Gates

- 后端启动验证 MUST 通过：`from app.main import app` 无报错
- 数据库迁移 MUST 可正向和反向执行
- API 文档 MUST 自动生成（FastAPI /docs）

## Governance

- 本宪法优先于所有其他实践
- 修订需记录变更原因和影响
- 所有任务完成前 MUST 检查是否触发 Schema Change Protocol

**Version**: 1.0.0 | **Ratified**: 2026-03-26 | **Last Amended**: 2026-03-26
