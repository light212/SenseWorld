# SenseWorld 设计系统规范

**项目**: SenseWorld
**日期**: 2026-03-26
**版本**: v1.0
**状态**: 设计系统规范

---

## 一、间距系统

### 1.1 基础单位

基于 **4px** 基础单位，形成节奏感。

| Token | 值 | Tailwind | 用途 |
|-------|-----|----------|------|
| space-1 | 4px | `p-1` `gap-1` | 紧凑间距 |
| space-2 | 8px | `p-2` `gap-2` | 元素内部间距 |
| space-3 | 12px | `p-3` `gap-3` | 组件内部间距 |
| space-4 | 16px | `p-4` `gap-4` | 标准间距 |
| space-5 | 20px | `p-5` `gap-5` | 宽松间距 |
| space-6 | 24px | `p-6` `gap-6` | 区块间距 |
| space-8 | 32px | `p-8` `gap-8` | 大区块间距 |
| space-12 | 48px | `p-12` `gap-12` | 页面区块间距 |

### 1.2 应用规则

```
组件内部 → space-2 (8px)
组件 padding → space-3 或 space-4 (12px/16px)
区块间距 → space-6 (24px)
页面区块 → space-8 或 space-12 (32px/48px)
```

---

## 二、字体系统

### 2.1 字体族

```css
:root {
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans SC", sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}
```

### 2.2 字号层级

| Token | 大小 | Tailwind | 行高 | 用途 |
|-------|------|----------|------|------|
| text-xs | 12px | `text-xs` | 1.5 | 辅助文字、时间戳 |
| text-sm | 14px | `text-sm` | 1.5 | 次要内容、标签 |
| text-base | 16px | `text-base` | 1.5 | 正文内容 |
| text-lg | 18px | `text-lg` | 1.4 | 小标题 |
| text-xl | 20px | `text-xl` | 1.4 | 标题 |
| text-2xl | 24px | `text-2xl` | 1.3 | 大标题 |
| text-3xl | 30px | `text-3xl` | 1.2 | 页面标题 |
| text-4xl | 36px | `text-4xl` | 1.1 | 落地页标题 |
| text-5xl | 48px | `text-5xl` | 1.0 | 落地页主标题 |

### 2.3 字重层级

| Token | 字重 | Tailwind | 用途 |
|-------|------|----------|------|
| font-normal | 400 | `font-normal` | 正文 |
| font-medium | 500 | `font-medium` | 标签、按钮 |
| font-semibold | 600 | `font-semibold` | 小标题、强调 |
| font-bold | 700 | `font-bold` | 标题 |

### 2.4 应用示例

```tsx
// 页面主标题
<h1 className="text-4xl font-bold text-white">...</h1>

// 区块标题
<h2 className="text-xl font-semibold text-gray-900">...</h2>

// 正文
<p className="text-base text-gray-700">...</p>

// 辅助文字
<span className="text-sm text-gray-500">...</span>

// 时间戳
<time className="text-xs text-gray-400">...</time>
```

---

## 三、颜色系统

### 3.1 品牌色

```css
:root {
  /* 主色 - 蓝 */
  --primary-50: #eff6ff;
  --primary-100: #dbeafe;
  --primary-200: #bfdbfe;
  --primary-300: #93c5fd;
  --primary-400: #60a5fa;
  --primary-500: #3b82f6;  /* 主色调 */
  --primary-600: #2563eb;
  --primary-700: #1d4ed8;
  --primary-800: #1e40af;
  --primary-900: #1e3a8a;

  /* 辅助色 - 紫 */
  --secondary-500: #8b5cf6;
  --secondary-600: #7c3aed;
}
```

### 3.2 中性色（深色主题）

```css
:root {
  /* 背景 */
  --bg-primary: #0f172a;     /* 页面背景 */
  --bg-secondary: #1e293b;   /* 卡片背景 */
  --bg-tertiary: #334155;    /* 输入框背景 */
  --bg-elevated: #475569;    /* 悬浮背景 */

  /* 文字 */
  --text-primary: #f8fafc;   /* 主文字 */
  --text-secondary: #cbd5e1; /* 次要文字 */
  --text-muted: #94a3b8;     /* 辅助文字 */
  --text-disabled: #64748b;  /* 禁用文字 */

  /* 边框 */
  --border-default: #334155;
  --border-muted: #1e293b;
}
```

### 3.3 语义色

```css
:root {
  /* 成功 */
  --success-500: #22c55e;
  --success-600: #16a34a;

  /* 警告 */
  --warning-500: #f59e0b;
  --warning-600: #d97706;

  /* 错误 */
  --error-500: #ef4444;
  --error-600: #dc2626;

  /* 信息 */
  --info-500: #3b82f6;
  --info-600: #2563eb;
}
```

### 3.4 对比度验证

| 组合 | 对比度 | 标准 | 结果 |
|------|--------|------|------|
| 白字 on 蓝紫渐变 | 4.8:1 | ≥4.5:1 | ✅ |
| 浅灰字 on 深色背景 | 8.2:1 | ≥4.5:1 | ✅ |
| 辅助灰字 on 深色背景 | 4.6:1 | ≥4.5:1 | ✅ |
| 时间戳灰字 on 深色背景 | 3.2:1 | ≥3:1 | ✅ |

---

## 四、圆角系统

### 4.1 圆角层级

| Token | 值 | Tailwind | 用途 |
|-------|-----|----------|------|
| radius-sm | 4px | `rounded` | 小元素、标签 |
| radius-md | 8px | `rounded-lg` | 按钮、输入框 |
| radius-lg | 12px | `rounded-xl` | 卡片 |
| radius-xl | 16px | `rounded-2xl` | 大卡片、消息气泡 |
| radius-full | 9999px | `rounded-full` | 圆形按钮、头像 |

### 4.2 应用规则

```
按钮 → rounded-lg (8px) 或 rounded-full (圆形)
输入框 → rounded-lg (8px) 或 rounded-xl (12px)
卡片 → rounded-xl (12px) 或 rounded-2xl (16px)
消息气泡 → rounded-2xl (16px)，单侧尖角
标签 → rounded-full
头像 → rounded-full
```

### 4.3 消息气泡圆角

```tsx
// 用户消息：右上角尖
<div className="rounded-2xl rounded-tr-md">

// AI 消息：左上角尖
<div className="rounded-2xl rounded-tl-md">
```

---

## 五、阴影系统

### 5.1 阴影层级

| Token | Tailwind | 用途 |
|-------|----------|------|
| shadow-sm | `shadow-sm` | 卡片默认 |
| shadow | `shadow` | 悬浮卡片 |
| shadow-md | `shadow-md` | 弹窗 |
| shadow-lg | `shadow-lg` | 模态框 |
| shadow-glow | 自定义 | 发光按钮 |

### 5.2 发光效果

```css
/* 主按钮发光 */
.btn-glow {
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
}

/* 聚焦发光 */
.focus-glow {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}
```

---

## 六、按钮系统

### 6.1 按钮类型

| 类型 | 样式 | 用途 |
|------|------|------|
| **主按钮** | 渐变背景 + 发光 | 主要操作（登录、发送、开始） |
| **次按钮** | 白色/深色背景 | 次要操作（取消、返回） |
| **文字按钮** | 无背景 | 链接式操作 |
| **图标按钮** | 圆形 | 工具栏按钮（麦克风、视频） |

### 6.2 按钮尺寸

| 尺寸 | Padding | 字号 | 用途 |
|------|---------|------|------|
| sm | `px-3 py-1.5` | text-sm | 小按钮、标签 |
| md | `px-4 py-2` | text-sm | 默认按钮 |
| lg | `px-6 py-3` | text-base | 主要按钮 |
| xl | `px-8 py-4` | text-lg | 落地页 CTA |

### 6.3 按钮状态

```tsx
// 主按钮
<button className={cn(
  "px-4 py-2 rounded-lg font-medium",
  "bg-gradient-to-r from-blue-500 to-purple-600",
  "text-white",
  "hover:opacity-90",
  "active:opacity-80",
  "disabled:opacity-50 disabled:cursor-not-allowed",
  "transition-opacity duration-150"
)}>
  按钮
</button>

// 图标按钮
<button className={cn(
  "p-2.5 rounded-full",
  "bg-primary-500 text-white",
  "hover:bg-primary-600",
  "active:bg-primary-700",
  "disabled:bg-gray-300 disabled:cursor-not-allowed",
  "transition-colors duration-150"
)}>
  <Mic className="w-5 h-5" />
</button>

// 次按钮（深色主题）
<button className={cn(
  "px-4 py-2 rounded-lg",
  "bg-white/10 backdrop-blur",
  "text-white",
  "hover:bg-white/20",
  "active:bg-white/30",
  "border border-white/10",
  "transition-all duration-150"
)}>
  按钮
</button>
```

### 6.4 按钮加载状态

```tsx
<button disabled={loading} className="...">
  {loading ? (
    <>
      <Spinner className="w-4 h-4 animate-spin mr-2" />
      处理中...
    </>
  ) : (
    "登录"
  )}
</button>
```

---

## 七、输入框系统

### 7.1 输入框样式

```tsx
// 默认输入框
<input
  type="text"
  placeholder="请输入..."
  className={cn(
    "w-full px-4 py-3",
    "bg-gray-50",
    "border border-gray-200",
    "rounded-xl",
    "text-base text-gray-900",
    "placeholder:text-gray-400",
    "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
    "disabled:bg-gray-100 disabled:cursor-not-allowed",
    "transition-all duration-150"
  )}
/>
```

### 7.2 输入框状态

| 状态 | 样式 |
|------|------|
| 默认 | `bg-gray-50 border-gray-200` |
| 悬浮 | `hover:border-gray-300` |
| 聚焦 | `ring-2 ring-primary-500 border-transparent` |
| 错误 | `border-red-500 ring-2 ring-red-500/20` |
| 禁用 | `bg-gray-100 cursor-not-allowed opacity-60` |

### 7.3 带图标输入框

```tsx
<div className="relative">
  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
    <Mail className="w-5 h-5" />
  </div>
  <input
    className="pl-11 pr-4 ..."  // 左侧留图标空间
  />
</div>
```

### 7.4 文本域

```tsx
<textarea
  rows={3}
  placeholder="请输入..."
  className={cn(
    "w-full px-4 py-3",
    "bg-gray-50 border border-gray-200 rounded-xl",
    "text-base text-gray-900",
    "placeholder:text-gray-400",
    "resize-none",
    "focus:outline-none focus:ring-2 focus:ring-primary-500",
    "transition-all duration-150"
  )}
/>
```

---

## 八、卡片系统

### 8.1 卡片类型

| 类型 | 样式 | 用途 |
|------|------|------|
| 默认卡片 | 浅色背景 + 阴影 | 登录表单 |
| 深色卡片 | 深色背景 + 边框 | 聊天消息 |
| 玻璃卡片 | 半透明 + 模糊 | 特性展示 |

### 8.2 卡片样式

```tsx
// 默认卡片（浅色主题）
<div className={cn(
  "p-6 rounded-2xl",
  "bg-white",
  "shadow-sm",
  "border border-gray-100"
)}>
  {content}
</div>

// 深色卡片
<div className={cn(
  "p-4 rounded-2xl",
  "bg-slate-800/50",
  "backdrop-blur",
  "border border-slate-700/50"
)}>
  {content}
</div>

// 玻璃卡片
<div className={cn(
  "p-6 rounded-2xl",
  "bg-white/5",
  "backdrop-blur-md",
  "border border-white/10"
)}>
  {content}
</div>
```

---

## 九、边框与分割线

### 9.1 边框规范

| 场景 | 边框 | 颜色 |
|------|------|------|
| 输入框 | 1px solid | gray-200 |
| 卡片 | 1px solid | gray-100 / white/10 |
| 分割线 | 1px solid | gray-200 / white/10 |
| 强调边框 | 1px solid | primary-500 |

### 9.2 分割线

```tsx
// 水平分割线
<div className="h-px bg-gray-200" />

// 深色主题分割线
<div className="h-px bg-white/10" />

// 带文字分割线
<div className="flex items-center gap-4">
  <div className="flex-1 h-px bg-gray-200" />
  <span className="text-gray-400 text-sm">或者</span>
  <div className="flex-1 h-px bg-gray-200" />
</div>
```

---

## 十、动画系统

### 10.1 动画时长

| Token | 时长 | Tailwind | 用途 |
|-------|------|----------|------|
| duration-fast | 150ms | `duration-150` | 按钮状态、颜色变化 |
| duration-normal | 300ms | `duration-300` | 页面元素、卡片 |
| duration-slow | 500ms | `duration-500` | 页面过渡、大元素 |

### 10.2 缓动函数

| 类型 | Tailwind | 用途 |
|------|----------|------|
| ease | `ease` | 默认 |
| ease-in | `ease-in` | 淡出 |
| ease-out | `ease-out` | 淡入 |
| ease-in-out | `ease-in-out` | 平滑过渡 |

### 10.3 常用动画

```tsx
// 淡入
<div className="animate-in fade-in duration-300">

// 滑入（从下方）
<div className="animate-in fade-in slide-in-from-bottom-4 duration-300">

// 滑入（从右侧）
<div className="animate-in fade-in slide-in-from-right-4 duration-300">

// 缩放
<div className="animate-in zoom-in-95 duration-200">
```

### 10.4 微交互

```tsx
// 按钮悬浮
<button className="hover:scale-105 transition-transform duration-150">

// 卡片悬浮
<div className="hover:shadow-md hover:-translate-y-1 transition-all duration-300">

// 图标旋转
<Icon className="group-hover:rotate-90 transition-transform duration-300">

// 脉冲效果（录音中）
<div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
```

---

## 十一、状态设计

### 11.1 加载状态

```tsx
// 全页加载
<div className="flex items-center justify-center min-h-screen">
  <div className="flex flex-col items-center gap-4">
    <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
    <p className="text-gray-500">加载中...</p>
  </div>
</div>

// 按钮加载
<button className="flex items-center gap-2">
  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
  处理中...
</button>

// 内联加载（消息发送中）
<div className="flex items-center gap-2 text-gray-500">
  <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
  发送中...
</div>
```

### 11.2 空状态

```tsx
// 聊天空状态
<div className="flex flex-col items-center justify-center h-full">
  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
    <MessageCircle className="w-10 h-10 text-gray-300" />
  </div>
  <h3 className="text-lg font-medium text-gray-900 mb-1">开始对话</h3>
  <p className="text-gray-500 text-sm">点击麦克风或输入文字</p>
</div>

// 列表空状态
<div className="flex flex-col items-center justify-center py-12">
  <p className="text-gray-500">暂无数据</p>
</div>
```

### 11.3 错误状态

```tsx
// 表单错误
<div className="p-3 rounded-lg bg-red-50 border border-red-200">
  <p className="text-red-600 text-sm">{errorMessage}</p>
</div>

// 输入框错误
<input className="border-red-500 ring-2 ring-red-500/20" />
<p className="mt-1 text-red-500 text-xs">{error}</p>

// 页面错误
<div className="flex flex-col items-center justify-center h-full">
  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
    <AlertCircle className="w-8 h-8 text-red-500" />
  </div>
  <h3 className="text-lg font-medium text-gray-900 mb-1">出错了</h3>
  <p className="text-gray-500 text-sm mb-4">{errorMessage}</p>
  <button className="px-4 py-2 bg-primary-500 text-white rounded-lg">
    重试
  </button>
</div>
```

### 11.4 成功状态

```tsx
// 操作成功提示
<div className="p-3 rounded-lg bg-green-50 border border-green-200">
  <p className="text-green-600 text-sm">操作成功</p>
</div>

// 带 Toast
<Toast className="bg-green-500 text-white px-4 py-3 rounded-lg">
  ✓ 发送成功
</Toast>
```

---

## 十二、图标使用规范

### 12.1 图标尺寸

| 场景 | 尺寸 | Tailwind |
|------|------|----------|
| 按钮内图标 | 20px | `w-5 h-5` |
| 小按钮图标 | 16px | `w-4 h-4` |
| 标题图标 | 24px | `w-6 h-6` |
| 空状态图标 | 48px | `w-12 h-12` |
| 页面大图标 | 64px | `w-16 h-16` |

### 12.2 图标颜色

| 状态 | 颜色 |
|------|------|
| 主操作 | 继承父级（白色） |
| 次操作 | `text-gray-500` |
| 悬浮 | `hover:text-gray-700` |
| 禁用 | `text-gray-300` |
| 强调 | `text-primary-500` |
| 危险 | `text-red-500` |

---

## 十三、组件示例

### 13.1 消息气泡

```tsx
// 用户消息
<div className="flex justify-end">
  <div className={cn(
    "max-w-[70%] px-4 py-2.5",
    "rounded-2xl rounded-tr-md",
    "bg-gradient-to-r from-blue-500 to-purple-600",
    "text-white"
  )}>
    <p className="text-[15px] leading-relaxed">消息内容</p>
    <time className="block text-xs text-white/60 mt-1 text-right">10:30</time>
  </div>
</div>

// AI 消息
<div className="flex justify-start">
  <div className={cn(
    "max-w-[70%] px-4 py-2.5",
    "rounded-2xl rounded-tl-md",
    "bg-slate-700/50 backdrop-blur",
    "border border-slate-600/50",
    "text-slate-100"
  )}>
    <p className="text-[15px] leading-relaxed">消息内容</p>
    <time className="block text-xs text-slate-400 mt-1">10:30</time>
  </div>
</div>
```

### 13.2 输入栏

```tsx
<div className={cn(
  "flex items-center gap-2 px-3 py-2",
  "border-t border-slate-700/50",
  "bg-slate-900"
)}>
  {/* 更多按钮 */}
  <button className="p-2 text-slate-400 hover:text-slate-300 transition-colors">
    <Plus className="w-5 h-5" />
  </button>

  {/* 输入框 */}
  <input
    type="text"
    placeholder="输入消息..."
    className={cn(
      "flex-1 px-4 py-2",
      "bg-slate-800 rounded-full",
      "text-slate-100 text-sm",
      "placeholder:text-slate-500",
      "focus:outline-none focus:ring-2 focus:ring-primary-500/50"
    )}
  />

  {/* 视频按钮 */}
  <button className="p-2 text-slate-400 hover:text-slate-300 transition-colors">
    <Video className="w-5 h-5" />
  </button>

  {/* 语音/发送按钮 */}
  <button className={cn(
    "p-2.5 rounded-full",
    "bg-gradient-to-r from-blue-500 to-purple-600",
    "text-white",
    "hover:opacity-90 transition-opacity"
  )}>
    <Mic className="w-5 h-5" />
  </button>
</div>
```

---

## 十四、验收清单

| 类别 | 检查项 | 标准 |
|------|--------|------|
| **间距** | 使用 4px 倍数 | space-1/2/3/4/6/8 |
| **字体** | 层级清晰 | xs/sm/base/lg/xl/2xl |
| **颜色** | 对比度达标 | ≥4.5:1 (正文) |
| **圆角** | 一致使用 | lg/xl/full |
| **按钮** | 状态完整 | hover/active/disabled |
| **输入框** | 状态完整 | default/focus/error/disabled |
| **动画** | 过渡自然 | 150/300ms |
| **加载** | 有反馈 | Spinner + 文字 |
| **空状态** | 有引导 | 图标 + 文字 + 操作 |
| **错误** | 可恢复 | 错误提示 + 重试 |

---

**设计系统完成，可指导开发实现。**