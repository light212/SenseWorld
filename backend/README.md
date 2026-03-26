# SenseWorld Backend

多模态 AI 对话平台后端服务。

## 技术栈

- **Framework**: FastAPI
- **Database**: MySQL 8+ + Redis
- **AI Services**: OpenAI (Whisper, GPT-4, TTS)

## 开发环境设置

### 前置条件

- Python 3.11+
- MySQL 8+
- Redis 7+

### 安装

```bash
# 创建虚拟环境
python -m venv .venv
source .venv/bin/activate

# 安装依赖
pip install -e ".[dev]"

# 配置环境变量
cp .env.example .env
# 编辑 .env 填写必要配置
```

### 数据库迁移

```bash
alembic upgrade head
```

### 启动开发服务器

```bash
uvicorn app.main:app --reload --port 8000
```

## API 文档

启动服务后访问:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 测试

```bash
pytest
```
