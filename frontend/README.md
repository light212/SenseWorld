# SenseWorld Frontend

多模态 AI 对话平台前端应用。

## 技术栈

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Language**: TypeScript

## 开发环境设置

### 前置条件

- Node.js 18+
- pnpm / npm / yarn

### 安装

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填写后端 API 地址
```

### 启动开发服务器

```bash
npm run dev
```

打开 http://localhost:3000 查看应用。

## 项目结构

```
src/
├── app/          # Next.js App Router 页面
├── components/   # React 组件
│   ├── ui/       # 基础 UI 组件
│   ├── chat/     # 对话相关组件
│   └── layout/   # 布局组件
├── hooks/        # 自定义 Hooks
├── services/     # API 服务
├── stores/       # Zustand 状态管理
├── types/        # TypeScript 类型定义
└── lib/          # 工具函数
```

## 测试

```bash
npm run test
```
