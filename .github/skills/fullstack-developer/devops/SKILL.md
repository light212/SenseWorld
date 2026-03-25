---
name: devops
description: DevOps。Docker、CI/CD、部署。
---

# DevOps

## Docker
- 每个服务一个 Dockerfile
- 多阶段构建减小镜像体积
- docker-compose 管理本地开发环境

## CI/CD
- GitHub Actions（亿人世界当前方案）
- 流程：lint → test → build → deploy
- 环境分离：dev / staging / production

## 部署
- 云/VPS 部署：Nginx 反向代理 + PM2/Docker
- 零停机部署：滚动更新或蓝绿部署
- 环境变量管理：.env 分环境，不提交到 Git

## Linux 基础
- 常用命令：文件操作、进程管理、网络排查
- 日志查看：tail -f、grep、journalctl
- 权限管理：最小权限原则
