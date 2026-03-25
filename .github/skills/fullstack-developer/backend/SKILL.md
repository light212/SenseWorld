---
name: backend
description: 后端开发。NestJS、API 设计、认证、微服务基础。
---

# 后端开发

## 框架
- NestJS 10 + Prisma + MySQL（亿人世界当前技术栈）
- 模块化：每个业务域一个 Module
- DTO 校验：class-validator + class-transformer

## API 设计
- RESTful 规范：资源命名、HTTP 方法、状态码
- 统一响应格式：{ code, data, message }
- 分页：cursor-based 优于 offset（大数据量）
- 版本控制：URL 前缀 /api/v1

## 认证
- JWT + Refresh Token
- Access Token 短有效期（15min），Refresh Token 长有效期（7d）
- 敏感操作二次验证

## 微服务基础
- 单体先行，拆分有明确理由才拆
- 服务间通信：HTTP 同步 / 消息队列异步
- 每个服务独立数据库
