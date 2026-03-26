# 后台管理系统架构决策

**项目**: SenseWorld  
**分支**: 003-admin-dashboard  
**日期**: 2026-03-26

---

## ADR-001: 管理员认证方案

### 决策
复用 User 表 + role 字段，不创建独立的 Admin 表。

### 理由
1. 现有 User 表已有 `role` 字段和 `is_admin` 属性
2. 管理员数量少（预计 <10 人），不需要复杂权限模型
3. 避免 JOIN 查询，简化代码

### 权限模型

| role 值 | 权限 |
|---------|------|
| `user` | 普通用户，访问对话功能 |
| `admin` | 管理员，访问后台管理功能 |

### 实现要点

1. **JWT 包含角色**

```python
# 登录时
token_data = {
    "sub": user.id,
    "role": user.role,  # 包含角色
}
token = create_access_token(token_data)
```

2. **API 层校验**

```python
async def get_admin_user(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> User:
    user = await db.get(User, user_id)
    if not user or not user.is_admin:
        raise HTTPException(status_code=403, detail="需要管理员权限")
    return user
```

3. **审计日志**

所有管理员操作记录到 `audit_logs` 表：

```python
class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[str]
    admin_id: Mapped[str]  # 操作人
    action: Mapped[str]    # create_model, update_model, delete_model
    target_type: Mapped[str]  # ModelConfig, User
    target_id: Mapped[str]
    details: Mapped[dict]  # 变更详情
    created_at: Mapped[datetime]
```

### v1 不实现
- 细粒度权限（RBAC）
- 角色分组
- 权限继承

---

## ADR-002: 配置热更新机制

### 决策
Redis 缓存 + 数据库持久化，配置变更实时生效。

### 架构

```
Admin API ──写入──► MySQL（持久化）
    │
    └──删除缓存──► Redis
                        │
    业务服务 ◄──读取──┘
```

### Redis Key 设计

| Key | 说明 | TTL |
|-----|------|-----|
| `config:llm:default` | 默认 LLM 配置 | 1h |
| `config:asr:default` | 默认 ASR 配置 | 1h |
| `config:tts:default` | 默认 TTS 配置 | 1h |
| `config:llm:{terminal}` | 终端专属配置 | 1h |

### 配置服务实现

```python
# app/services/config_service.py

class ConfigService:
    def __init__(self, db: AsyncSession, redis: Redis):
        self.db = db
        self.redis = redis

    async def get_model_config(self, model_type: str, terminal: str = "default") -> dict:
        """获取模型配置（优先缓存）"""
        cache_key = f"config:{model_type}:{terminal}"
        
        # 1. 查缓存
        cached = await self.redis.get(cache_key)
        if cached:
            return json.loads(cached)
        
        # 2. 查数据库
        result = await self.db.execute(
            select(ModelConfig)
            .where(ModelConfig.model_type == model_type)
            .where(ModelConfig.is_active == True)
        )
        config = result.scalar_one_or_none()
        
        if not config:
            raise ConfigNotFoundError(model_type)
        
        # 3. 写缓存
        config_dict = {
            "model_name": config.model_name,
            "provider": config.provider,
            **config.config
        }
        await self.redis.setex(cache_key, 3600, json.dumps(config_dict))
        
        return config_dict

    async def invalidate_config(self, model_type: str, terminal: str = "default") -> None:
        """使配置缓存失效"""
        cache_key = f"config:{model_type}:{terminal}"
        await self.redis.delete(cache_key)
```

### Admin API 更新流程

```python
@router.patch("/models/{config_id}")
async def update_model_config(
    config_id: str,
    data: ModelConfigUpdate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> ModelConfigResponse:
    # 1. 更新数据库
    config = await db.get(ModelConfig, config_id)
    # ... 更新字段 ...
    await db.commit()
    
    # 2. 使缓存失效
    config_service = ConfigService(db, redis)
    await config_service.invalidate_config(config.model_type)
    
    # 3. 记录审计日志
    await log_audit(admin.id, "update_model", "ModelConfig", config_id, data.dict())
    
    return config
```

### 热更新验证

配置更新后，无需重启服务：

```python
# 业务服务每次请求都从 ConfigService 获取配置
async def chat_service():
    config = await config_service.get_model_config("llm")
    # 使用最新配置调用 LLM API
```

---

## 相关实体设计

### ModelConfig（已有）

```python
class ModelConfig(Base):
    __tablename__ = "model_configs"
    id: str
    model_type: str      # llm, asr, tts
    model_name: str
    provider: str        # openai, dashscope
    config: dict         # 模型参数（含 api_key）
    is_active: bool
```

**API Key 加密存储**：

```python
# config 字段中的 api_key 加密
config = {
    "temperature": 0.7,
    "max_tokens": 2000,
    "api_key_encrypted": encrypt("sk-xxxx"),  # AES-256 加密
}

# 返回前端时掩码
config["api_key"] = mask_api_key(decrypt(config["api_key_encrypted"]))
# 显示: "sk-****1234"
```

### AuditLog（新增）

```python
class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[str] = mapped_column(CHAR(36), primary_key=True)
    admin_id: Mapped[str] = mapped_column(CHAR(36), ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(50))  # create, update, delete
    target_type: Mapped[str] = mapped_column(String(50))  # ModelConfig, User
    target_id: Mapped[str] = mapped_column(CHAR(36))
    details: Mapped[dict] = mapped_column(JSON)  # 变更前后对比
    ip_address: Mapped[str] = mapped_column(String(45))
    created_at: Mapped[datetime]
```

---

## 实现任务

1. [ ] 实现 ConfigService（配置缓存服务）
2. [ ] 实现 AuditLog 模型
3. [ ] 实现 API Key 加密/解密工具
4. [ ] Admin API 集成缓存失效
5. [ ] 业务服务集成 ConfigService

---

**架构师**: Architect  
**审核日期**: 2026-03-26