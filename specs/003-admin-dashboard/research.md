# Research Notes: SenseWorld 后台管理系统

**Feature**: 003-admin-dashboard  
**Date**: 2026-03-26

## Research Tasks

Based on Technical Context unknowns and spec requirements:

1. API Key 加密存储方案
2. 配置热更新实现（Redis 缓存 + TTL）
3. 用量统计聚合查询优化
4. 前端图表库选型
5. 定时清理任务实现

---

## 1. API Key 加密存储方案

### Decision: AES-256-GCM + Fernet

**Rationale**: 
- Python `cryptography` 库的 Fernet 基于 AES-128-CBC，但可配置 AES-256
- 项目已依赖 `python-jose[cryptography]`，可直接使用 `cryptography` 库
- GCM 模式提供认证加密，防止篡改

**Implementation**:
```python
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os
import base64

# 密钥从环境变量读取（32 bytes = 256 bits）
ENCRYPTION_KEY = os.environ.get("ENCRYPTION_KEY", os.urandom(32))

def encrypt_api_key(plaintext: str) -> str:
    """Encrypt API key with AES-256-GCM."""
    aesgcm = AESGCM(ENCRYPTION_KEY)
    nonce = os.urandom(12)  # 96 bits
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), None)
    return base64.b64encode(nonce + ciphertext).decode()

def decrypt_api_key(encrypted: str) -> str:
    """Decrypt API key."""
    data = base64.b64decode(encrypted)
    nonce, ciphertext = data[:12], data[12:]
    aesgcm = AESGCM(ENCRYPTION_KEY)
    return aesgcm.decrypt(nonce, ciphertext, None).decode()

def mask_api_key(key: str) -> str:
    """Display masked key: sk-****1234"""
    if len(key) < 8:
        return "****"
    return f"{key[:3]}****{key[-4:]}"
```

**Alternatives Considered**:
- Fernet (AES-128): 简单但位数较低
- HashiCorp Vault: 过于复杂，一期不需要

---

## 2. 配置热更新实现

### Decision: Redis 缓存 + TTL 5s + 数据库回落

**Rationale**:
- 简单可靠，无需复杂事件系统
- Redis 已在项目依赖中
- TTL 5s 平衡实时性和性能

**Implementation Pattern**:
```python
import redis.asyncio as redis
import json
from typing import Optional

class ConfigService:
    CACHE_TTL = 5  # seconds
    
    def __init__(self, redis_client: redis.Redis, db: AsyncSession):
        self.redis = redis_client
        self.db = db
    
    async def get_model_config(self, model_type: str) -> Optional[dict]:
        """Get config with cache-aside pattern."""
        cache_key = f"config:{model_type}"
        
        # Try cache first
        cached = await self.redis.get(cache_key)
        if cached:
            return json.loads(cached)
        
        # Fallback to database
        config = await self._fetch_from_db(model_type)
        if config:
            await self.redis.setex(cache_key, self.CACHE_TTL, json.dumps(config))
        
        return config
    
    async def update_config(self, model_type: str, data: dict) -> None:
        """Update config and invalidate cache."""
        await self._save_to_db(model_type, data)
        await self.redis.delete(f"config:{model_type}")
```

**Alternatives Considered**:
- Pub/Sub 事件驱动: 复杂度高，一期不需要
- 直接 DB 查询无缓存: 性能差

---

## 3. 用量统计聚合查询

### Decision: MySQL 原生聚合 + 按日预聚合表

**Rationale**:
- 90 天数据量可控（预估 ~10M 行）
- MySQL 8 窗口函数支持良好
- 预聚合表降低实时查询压力

**Schema Design**:
```sql
-- 原始用量日志
CREATE TABLE usage_logs (
    id CHAR(36) PRIMARY KEY,
    model_type VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    user_id CHAR(36),
    input_tokens INT NOT NULL DEFAULT 0,
    output_tokens INT NOT NULL DEFAULT 0,
    cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    INDEX idx_created_at (created_at),
    INDEX idx_model_type_created (model_type, created_at)
);

-- 日聚合表（可选优化，一期可跳过）
CREATE TABLE usage_daily_stats (
    id CHAR(36) PRIMARY KEY,
    stat_date DATE NOT NULL,
    model_type VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    total_calls INT NOT NULL DEFAULT 0,
    total_input_tokens BIGINT NOT NULL DEFAULT 0,
    total_output_tokens BIGINT NOT NULL DEFAULT 0,
    total_cost DECIMAL(12, 4) NOT NULL DEFAULT 0,
    UNIQUE KEY uk_date_model (stat_date, model_type, model_name)
);
```

**Query Examples**:
```sql
-- 本周用量按模型分组
SELECT 
    model_type,
    model_name,
    COUNT(*) as call_count,
    SUM(input_tokens) as total_input,
    SUM(output_tokens) as total_output,
    SUM(cost) as total_cost
FROM usage_logs
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY model_type, model_name;

-- 日趋势图数据
SELECT 
    DATE(created_at) as date,
    model_type,
    COUNT(*) as calls,
    SUM(cost) as cost
FROM usage_logs
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(created_at), model_type
ORDER BY date;
```

---

## 4. 前端图表库选型

### Decision: Recharts

**Rationale**:
- React 原生，与 Next.js 集成良好
- 声明式 API，易于维护
- 轻量（~400KB gzipped vs Chart.js ~600KB）
- 支持响应式和动画

**Alternatives Considered**:
- Chart.js: 功能强但非 React 原生
- D3.js: 过于底层，开发成本高
- Tremor: 设计良好但样式固定

**Implementation**:
```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function UsageChart({ data }: { data: UsageData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="calls" stroke="#8884d8" />
        <Line type="monotone" dataKey="cost" stroke="#82ca9d" />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

---

## 5. 定时清理任务

### Decision: APScheduler + FastAPI Lifespan

**Rationale**:
- APScheduler 是 Python 标准调度库
- 与 FastAPI 的 lifespan 事件集成
- 支持 cron 表达式，配置灵活

**Implementation**:
```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from contextlib import asynccontextmanager
from fastapi import FastAPI

scheduler = AsyncIOScheduler()

async def cleanup_old_logs():
    """Delete logs older than 90 days."""
    async with get_db() as db:
        cutoff = datetime.now() - timedelta(days=90)
        await db.execute(
            delete(UsageLog).where(UsageLog.created_at < cutoff)
        )
        await db.execute(
            delete(RequestLog).where(RequestLog.created_at < cutoff)
        )
        await db.commit()
        logger.info(f"Cleaned up logs before {cutoff}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    scheduler.add_job(
        cleanup_old_logs,
        CronTrigger(hour=3, minute=0),  # 每天凌晨 3:00
        id="cleanup_old_logs",
    )
    scheduler.start()
    yield
    # Shutdown
    scheduler.shutdown()

app = FastAPI(lifespan=lifespan)
```

**Dependencies to Add**:
```toml
# pyproject.toml
dependencies = [
    ...
    "apscheduler>=3.10.0",
]
```

---

## Summary

| Topic | Decision | Key Dependency |
|-------|----------|----------------|
| API Key 加密 | AES-256-GCM | cryptography (已有) |
| 配置热更新 | Redis + TTL 5s | redis (已有) |
| 用量聚合 | MySQL 原生查询 | sqlalchemy (已有) |
| 图表库 | Recharts | recharts (需添加) |
| 定时任务 | APScheduler | apscheduler (需添加) |

**New Dependencies**:
- Backend: `apscheduler>=3.10.0`
- Frontend: `recharts@^2.12.0`
