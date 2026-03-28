# Quickstart: SenseWorld 后台管理系统

**Feature**: 003-admin-dashboard  
**Date**: 2026-03-26

## Prerequisites

- Python 3.11+
- Node.js 18+
- MySQL 8+
- Redis 5+

## Setup

### 1. Backend Setup

```bash
cd backend

# 安装新依赖
pip install apscheduler>=3.10.0

# 或更新 pyproject.toml 后
pip install -e ".[dev]"
```

### 2. Frontend Setup

```bash
cd frontend

# 安装图表库
npm install recharts@^2.12.0
```

### 3. Environment Variables

```bash
# backend/.env (新增)
ENCRYPTION_KEY=your-32-byte-encryption-key-here  # AES-256 密钥
REDIS_URL=redis://localhost:6379/0
```

生成加密密钥：
```python
import os
import base64
print(base64.b64encode(os.urandom(32)).decode())
```

### 4. Database Migration

```bash
cd backend

# 生成迁移文件
alembic revision --autogenerate -m "add_admin_dashboard_tables"

# 执行迁移
alembic upgrade head
```

## Development

### Start Backend

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

### Start Frontend

```bash
cd frontend
npm run dev
```

### Access Admin Dashboard

- URL: http://localhost:3000/admin
- 需要管理员账号登录 (role = 'admin')

## API Testing

### 1. 获取模型配置列表

```bash
curl -X GET "http://localhost:8000/api/v1/admin/models" \
  -H "Authorization: Bearer $TOKEN"
```

### 2. 创建模型配置

```bash
curl -X POST "http://localhost:8000/api/v1/admin/models" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model_type": "llm",
    "model_name": "qwen-turbo",
    "provider": "dashscope",
    "api_key": "sk-your-api-key",
    "config": {"temperature": 0.7, "max_tokens": 2048},
    "price_per_1k_input_tokens": 0.002,
    "price_per_1k_output_tokens": 0.006,
    "is_default": true
  }'
```

### 3. 获取用量统计

```bash
curl -X GET "http://localhost:8000/api/v1/admin/usage/summary?date_range=week" \
  -H "Authorization: Bearer $TOKEN"
```

### 4. 查询请求日志

```bash
curl -X GET "http://localhost:8000/api/v1/admin/logs?date_range=today&status=error" \
  -H "Authorization: Bearer $TOKEN"
```

## Key Files

### Backend

| File | Description |
|------|-------------|
| `app/api/v1/admin.py` | Admin API 路由（已存在，需扩展） |
| `app/models/usage_log.py` | 用量日志模型（新增） |
| `app/models/request_log.py` | 请求日志模型（新增） |
| `app/models/system_setting.py` | 系统设置模型（新增） |
| `app/models/alert.py` | 告警模型（新增） |
| `app/services/config_service.py` | 配置服务 + Redis 缓存（新增） |
| `app/services/usage_service.py` | 用量统计服务（新增） |
| `app/services/alert_service.py` | 告警服务（新增） |
| `app/core/encryption.py` | API Key 加密工具（新增） |
| `app/tasks/cleanup.py` | 定时清理任务（新增） |

### Frontend

| File | Description |
|------|-------------|
| `src/app/admin/layout.tsx` | Admin 布局（已存在） |
| `src/app/admin/models/page.tsx` | 模型配置页（已存在，需完善） |
| `src/app/admin/usage/page.tsx` | 用量监控页（新增） |
| `src/app/admin/logs/page.tsx` | 日志查询页（新增） |
| `src/app/admin/settings/page.tsx` | 系统设置页（新增） |
| `src/components/admin/UsageChart.tsx` | 用量图表（新增） |
| `src/components/admin/LogTable.tsx` | 日志表格（新增） |
| `src/components/admin/AlertBadge.tsx` | 告警徽章（新增） |
| `src/services/adminApi.ts` | Admin API 客户端（新增） |

## Testing

### Backend Tests

```bash
cd backend
pytest tests/api/test_admin.py -v
```

### Frontend Tests

```bash
cd frontend
npm test -- --testPathPattern=admin
```

## Validation Checklist

- [ ] 管理员可以 CRUD 模型配置
- [ ] API Key 在数据库中加密存储
- [ ] 修改配置后 5 秒内生效（热更新）
- [ ] 用量统计页面显示正确的图表
- [ ] 日志查询支持按 conversation_id 筛选
- [ ] 告警 badge 显示未读数量
- [ ] 定时任务每日清理 90 天前数据

## Common Issues

### 1. API Key 解密失败

确保 `ENCRYPTION_KEY` 环境变量与加密时使用的密钥一致。

### 2. Redis 连接失败

检查 Redis 是否运行：
```bash
redis-cli ping
```

### 3. 权限不足 (403)

确保用户的 `role` 字段为 `admin`：
```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

## Next Steps

完成本 quickstart 后，运行 `/speckit.tasks` 生成详细任务列表。
