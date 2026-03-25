---
name: frontend
description: 前端开发。React、状态管理、样式、性能优化。
---

# 前端开发

## 框架
- React 18 + Vite（亿人世界当前技术栈）
- 组件设计：展示组件 vs 容器组件分离
- Hooks 优先，避免 class 组件

## 状态管理
- 局部状态：useState / useReducer
- 全局状态：Zustand（轻量）或 Redux Toolkit（复杂场景）
- 服务端状态：React Query / SWR

## 样式
- Tailwind CSS + shadcn/ui（亿人世界当前方案）
- 响应式：mobile-first，断点 768/1024/1280
- Design Tokens 统一颜色、间距、字号

## 性能优化
- 代码分割：React.lazy + Suspense
- 列表虚拟化：大数据量用 virtualized list
- 减少重渲染：React.memo、useMemo、useCallback 按需用
- 图片：WebP 格式、懒加载、合适尺寸
