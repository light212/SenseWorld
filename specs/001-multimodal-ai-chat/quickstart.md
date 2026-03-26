# Quickstart: 多模态 AI 对话平台

**Feature**: 001-multimodal-ai-chat  
**Created**: 2026-03-25  
**Status**: Ready

本指南用于快速启动本地开发环境并验证关键用户故事流程。

---

## 1. 环境要求

- Node.js 18+ / pnpm 或 npm
- Python 3.11+
- MySQL 8+
- Redis 7+
- (可选) Docker / Docker Compose

---

## 2. 环境变量

### Backend (.env)

```
DATABASE_URL=mysql+aiomysql://user:password@localhost:3306/senseworld
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=replace-me
OPENAI_API_KEY=replace-me
```

### Frontend (.env)

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/chat

### 说明

- `DATABASE_URL`/`REDIS_URL` 与本地实例保持一致
- `OPENAI_API_KEY` 或其他模型供应商的 Key 必须有效
- `NEXT_PUBLIC_WS_URL` 与后端 WebSocket 路由一致
```

---

## 3. 数据库与缓存（任选一种方式）

### 方式 A：使用 Docker Compose

```
docker compose up -d mysql redis
```

### 方式 B：使用本地服务

- 启动 MySQL 与 Redis
- 创建数据库 `senseworld`

```sql
CREATE DATABASE senseworld CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## 4. 启动后端

```
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

---

## 5. 启动前端

```
cd frontend
npm install
npm run dev
```

打开 http://localhost:3000

---

## 6. 快速验证 (MVP)

### 预检查

- 浏览器允许麦克风权限
- 浏览器允许自动播放音频（必要时先点击页面任意位置）
- 后端服务返回 200: `GET http://localhost:8000/v1/auth/me`

### 账号与登录（示例）

```
curl -X POST http://localhost:8000/v1/auth/register \
	-H "Content-Type: application/json" \
	-d '{"email":"demo@example.com","password":"Password123","displayName":"Demo"}'

curl -X POST http://localhost:8000/v1/auth/login \
	-H "Content-Type: application/json" \
	-d '{"email":"demo@example.com","password":"Password123"}'
```

### 场景 A: 语音对话 (US1)

1. 登录后进入对话页面
2. 点击“开始对话”并说话
3. 确认识别文本出现
4. 等待 AI 回复并播放语音

**期望**: 语音 → 文本 → LLM → TTS 完整链路可用

### 场景 B: 流式响应 (US2)

1. 发送一个需要较长回答的问题
2. 观察回复文字是否逐步出现
3. 语音是否边生成边播放

**期望**: 文本和音频同时流式输出

### 场景 C: 多轮上下文 (US6)

1. 连续提问 5 轮
2. 后续问题引用前文

**期望**: AI 能理解上下文且不同会话隔离

---

## 7. WebSocket 简单连通性测试（可选）

```
npx wscat -c "ws://localhost:8000/ws/chat?token=YOUR_JWT_TOKEN"
```

收到 `connected` 表示连接正常。

---

## 8. 常见问题

- **麦克风无权限**: 检查浏览器设置并重新授权
- **WebSocket 连接失败**: 确认后端运行且 token 有效
- **无语音播放**: 检查浏览器是否允许自动播放音频
- **ASR/TTS 无响应**: 检查 API Key 与供应商服务是否可用
- **语音延迟高**: 确认网络稳定，避免代理影响实时连接

---

## 9. 下一步

- 实现文档中剩余用户故事
- 完善 WebSocket 协议与错误处理
- 增加监控与性能指标
