# Design Tokens Skill

## 触发条件
- 创建 CSS 变量系统
- 设计系统搭建
- 主题切换实现
- 响应式设计

---

## 核心概念

### Design Tokens vs CSS Variables

| 概念 | 定义 | 用途 |
|------|------|------|
| **Design Tokens** | 设计值的抽象表示 | 平台无关，可导出到 iOS/Android/Web |
| **CSS Variables** | CSS 自定义属性 | Web 平台的 Tokens 实现 |

**关系**：`Design Tokens → CSS Variables → Component Styles`

---

## 命名规范

### 分层命名

```css
:root {
  /* ========== 颜色系统 ========== */
  --color-primary: #2b313f;
  --color-secondary: #e2e7bf;
  --color-text-primary: #ffffff;
  --color-text-secondary: #8b95a5;
  
  /* ========== 间距系统 ========== */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 24px;
  
  /* ========== 尺寸系统 ========== */
  --card-height: 80px;
  --button-height: 32px;
  --row-height: 48px;
  
  /* ========== 字体系统 ========== */
  --font-xs: 11px;
  --font-sm: 13px;
  --font-base: 14px;
  --font-lg: 16px;
  --font-xl: 18px;
  
  /* ========== 圆角系统 ========== */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  
  /* ========== 过渡系统 ========== */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
}
```

### 命名模式

```css
/* ✅ 好的命名 - 语义化 */
--color-brand-primary
--color-text-secondary
--spacing-section-gap
--font-size-base

/* ❌ 避免的命名 - 值相关 */
--color-blue-500
--spacing-16px
--font-14px
```

---

## 最佳实践

### 1. 存储位置

```css
/* 全局 tokens 存储在 :root */
:root {
  --color-primary: #2b313f;
}

/* 组件级变量存储在组件类 */
.card {
  --card-padding: var(--spacing-md);
  --card-radius: var(--radius-lg);
}
```

### 2. 主题切换

```css
:root {
  --bg: #ffffff;
  --text: #2b313f;
}

[data-theme="dark"] {
  --bg: #1e242e;
  --text: #e2e7bf;
}

body {
  background: var(--bg);
  color: var(--text);
}
```

### 3. 响应式

```css
:root {
  --section-gap: var(--spacing-lg);
}

@media (max-width: 640px) {
  :root {
    --section-gap: var(--spacing-md);
  }
}
```

### 4. 避免过度抽象

```css
/* ✅ 可复用的值用变量 */
:root {
  --color-primary: #2b313f;  /* 多处使用 */
}

/* ❌ 一次性使用的值用字面量 */
.one-off-element {
  margin-top: 37px;  /* 只用一次，不必抽象 */
}
```

---

## 常见问题

### Q: Design Tokens 和 CSS Variables 有什么区别？

A: Design Tokens 是概念层面的抽象，可以导出到多个平台。CSS Variables 是在 Web 端的实现方式。

### Q: 什么时候应该创建新的 token？

A:
- 值在多处使用
- 值可能变化
- 需要支持主题切换
- 需要保持一致性

### Q: 如何组织大型项目的 tokens？

A: 按功能模块分层：
```
tokens/
├── colors.json
├── spacing.json
├── typography.json
└── shadows.json
```

---

## 检查清单

创建 Design Tokens 时，检查：

- [ ] 命名是否语义化？
- [ ] 是否可复用？
- [ ] 是否支持主题切换？
- [ ] 是否有文档说明？
- [ ] 是否避免过度抽象？

---

## 相关资源

- [The developer's guide to design tokens - Penpot](https://penpot.app/blog/the-developers-guide-to-design-tokens-and-css-variables/)
- [What Are Design Tokens? - CSS-Tricks](https://css-tricks.com/what-are-design-tokens/)

---

## 相关技能

- `bug-patterns` - 常见 bug 模式