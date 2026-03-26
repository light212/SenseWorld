---
name: security
description: 安全。XSS/CSRF 防护、认证权限、输入校验。
---

# 安全

## 常见攻击防护
- XSS：输出编码、CSP 头、不用 dangerouslySetInnerHTML
- CSRF：SameSite Cookie + CSRF Token
- SQL 注入：参数化查询（Prisma 默认安全）
- 点击劫持：X-Frame-Options 头

## 认证与权限
- RBAC：角色 → 权限映射
- API 级别鉴权：每个端点明确需要什么权限
- 敏感数据不放 JWT payload

## 输入校验
- 前端校验是体验，后端校验是安全
- 白名单校验优于黑名单
- 文件上传：校验类型、大小、内容
