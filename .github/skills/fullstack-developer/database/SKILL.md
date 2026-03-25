---
name: database
description: 数据库。MySQL、Redis、数据建模、查询优化。
---

# 数据库

## MySQL
- Prisma ORM（亿人世界当前方案）
- 索引：查询频繁的字段建索引，联合索引注意最左前缀
- 避免：SELECT *、大表无条件查询、N+1 查询

## Redis
- 缓存：热数据缓存，设置合理 TTL
- 分布式锁：Redlock 或简单 SETNX
- 使用场景：session、排行榜、计数器、限流

## 数据建模
- 范式化设计为主，性能瓶颈时适度反范式
- 字段类型选最小够用的
- 软删除（deleted_at）优于硬删除

## 查询优化
- EXPLAIN 分析慢查询
- 避免全表扫描：确保 WHERE 条件命中索引
- 大数据量分页：用 cursor 替代 OFFSET
- 批量操作替代循环单条操作
