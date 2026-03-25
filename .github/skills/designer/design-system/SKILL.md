---
name: design-system
description: 设计系统。组件体系、Design Tokens、一致性与可扩展性。
---

# 设计系统

## 组件体系
- 原子 → 分子 → 组织 → 模板 → 页面（Atomic Design）
- 每个组件有明确的 props / variants / states
- 组件文档：用途、何时用、何时不用

## Design Tokens
- 颜色、间距、字号、圆角、阴影统一用 Token
- Token 分层：global → alias → component
- 修改 Token 全局生效，不改组件代码

## Figma / Storybook
- Figma：设计源文件，组件库 + 页面设计
- Storybook：前端组件文档，交互状态可预览
- 两者保持同步，设计改了前端跟上

## 一致性与可扩展
- 新组件先检查是否已有可复用的
- 变体优先于新组件
- 设计规范文档化，新人可自助查阅
