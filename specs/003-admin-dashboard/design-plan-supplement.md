# SenseWorld 后台管理系统 - 设计规划补充

**项目**: SenseWorld Admin Dashboard
**日期**: 2026-03-26
**设计师**: 亿人世界设计师

---

## 一、plan.md 设计规范补充

### 1.1 在 "## Design Integration Plan" 部分添加以下内容

```markdown
### Design Integration Plan

#### Design Vision & Principles

**设计愿景**：
为 SenseWorld 后台管理系统打造专业、高效、易用的管理界面，让运维人员在 30 秒内完成核心操作。

**设计原则**：
1. **数据优先**：后台核心是数据展示，图表、表格清晰易读
2. **操作高效**：高频操作一键可达，配置修改即时生效
3. **状态可见**：配置变更、系统状态、告警信息实时反馈
4. **安全可控**：敏感信息脱敏显示，关键操作二次确认

#### Visual Style Guide

**整体风格**：现代后台管理风格，参考 Linear/Vercel Dashboard

**配色系统**：
```css
:root {
  /* 背景色 */
  --bg-primary: #ffffff;       /* 页面背景 */
  --bg-secondary: #f9fafb;     /* 卡片背景 */
  --bg-tertiary: #f3f4f6;      /* 表格行背景 */
  
  /* 品牌色 */
  --primary-500: #3b82f6;      /* 主色 */
  --primary-600: #2563eb;      /* 悬浮色 */
  --primary-100: #dbeafe;      /* 浅色背景 */
  
  /* 文字色 */
  --text-primary: #111827;     /* 主文字 */
  --text-secondary: #6b7280;   /* 次要文字 */
  --text-muted: #9ca3af;       /* 辅助文字 */
  
  /* 边框色 */
  --border-default: #e5e7eb;
  
  /* 语义色 */
  --success: #22c55e;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;
}
```

**字体系统**：
- 字体族：Inter, -apple-system, BlinkMacSystemFont, sans-serif
- 正文：14px / 1.5
- 标题：16px-24px / 1.4
- 数据：Tabular nums（等宽数字）

**间距系统**：
- 基于 4px 单位
- 组件内：8px / 12px
- 组件间：16px / 24px
- 区块间：32px

#### Page Layout System

**布局结构**：
```
┌─────────────────────────────────────────────────────────────┐
│  Sidebar (240px)  │  Main Content                          │
│  ┌─────────────┐  │  ┌─────────────────────────────────┐  │
│  │  Logo       │  │  │  Header (Page Title + Actions)  │  │
│  │  ───────    │  │  └─────────────────────────────────┘  │
│  │  Dashboard  │  │  ┌─────────────────────────────────┐  │
│  │  模型配置   │  │  │                                 │  │
│  │  用量监控   │  │  │  Content Area                   │  │
│  │  日志查询   │  │  │  (Padding: 24px)               │  │
│  │  系统设置   │  │  │                                 │  │
│  │  ───────    │  │  │                                 │  │
│  │  用户信息   │  │  │                                 │  │
│  └─────────────┘  │  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**响应式断点**：
- ≥1280px：完整 Sidebar + Content
- 1024-1279px：可折叠 Sidebar + Content
- <1024px：抽屉式 Sidebar + Content

#### Component Design Specifications

**1. 用量监控图表组件 (UsageChart)**

设计规范：
- 类型：折线图 + 面积图组合
- 高度：300px
- 时间轴：X 轴为时间，Y 轴为数量
- 颜色：
  - 调用次数：蓝色 `#3b82f6`
  - Token 消耗：绿色 `#22c55e`
  - 费用：紫色 `#8b5cf6`
- 交互：
  - Hover 显示具体数值
  - 支持时间范围筛选（日/周/月）
  - 支持模型类型筛选

```tsx
// 设计参数
const chartConfig = {
  height: 300,
  padding: { top: 20, right: 30, bottom: 30, left: 50 },
  colors: {
    calls: '#3b82f6',
    tokens: '#22c55e',
    cost: '#8b5cf6'
  },
  gridLines: 'rgba(0,0,0,0.05)',
  animationDuration: 300
};
```

**2. 日志查询表格组件 (LogTable)**

设计规范：
- 行高：48px
- 固定列：时间、状态
- 可排序列：时间、耗时、状态
- 分页：每页 20 条
- 状态标签：
  - 成功：绿色背景
  - 错误：红色背景
  - 超时：黄色背景

```tsx
// 表格设计参数
const tableConfig = {
  rowHeight: 48,
  headerHeight: 56,
  pageSize: 20,
  statusColors: {
    success: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
    timeout: 'bg-yellow-100 text-yellow-700'
  }
};
```

**3. 告警徽章组件 (AlertBadge)**

设计规范：
- 位置：顶部导航栏右侧
- 状态：
  - 无告警：灰色图标
  - 有告警：红色圆点 + 数量
- 交互：点击展开告警列表

```tsx
// 徽章设计参数
const badgeConfig = {
  size: 20,
  dotSize: 8,
  colors: {
    normal: '#9ca3af',
    alert: '#ef4444'
  }
};
```

**4. 表单组件设计规范**

| 组件类型 | 样式规范 |
|----------|----------|
| 输入框 | `h-10 px-3 border rounded-lg focus:ring-2 focus:ring-primary-500` |
| 选择框 | `h-10 px-3 border rounded-lg bg-white` |
| 开关 | `w-11 h-6 rounded-full` |
| 按钮-主 | `h-10 px-4 bg-primary-500 text-white rounded-lg` |
| 按钮-次 | `h-10 px-4 border rounded-lg` |

**5. API Key 输入组件**

特殊处理：
- 显示：`sk-****1234` 格式（掩码）
- 编辑：完整显示，支持复制
- 状态：
  - 未配置：灰色提示
  - 已配置：绿色勾 + 部分掩码
  - 验证失败：红色错误提示

#### Interaction Design Specifications

**1. 配置修改流程**

```
修改配置 → 表单验证 → 保存确认 Toast → 后台热更新 → 成功提示
    ↓           ↓
  验证失败    错误提示
```

- 保存成功：绿色 Toast "配置已保存，5 秒内生效"
- 验证失败：红色 Toast "API Key 验证失败，请检查"
- 网络错误：红色 Toast "保存失败，请重试"

**2. 错误处理机制**

| 错误类型 | 显示位置 | 样式 |
|----------|----------|------|
| 表单验证 | 字段下方 | 红色小字 |
| API 错误 | 页面顶部 | 红色 Banner |
| 网络断开 | 全局 Toast | 红色通知 |
| 权限不足 | 模态框 | 红色警告 |

**3. 加载状态设计**

| 场景 | 加载方式 |
|------|----------|
| 页面初次加载 | 骨架屏 |
| 数据刷新 | 表格/图表内 Spinner |
| 配置保存 | 按钮内 Spinner + "保存中..." |
| 图表渲染 | 淡入动画 |

**4. 空状态设计**

| 场景 | 空状态内容 |
|------|------------|
| 无日志数据 | 图标 + "暂无日志数据" + 刷新按钮 |
| 无用量数据 | 图标 + "暂无用量统计" + 时间范围提示 |
| 无模型配置 | 图标 + "尚未配置模型" + "添加配置" 按钮 |

#### Responsive Design Specifications

**桌面端 (≥1280px)**：
- 完整 Sidebar 240px
- Content 区域自适应
- 表格完整显示所有列

**平板端 (1024-1279px)**：
- Sidebar 可折叠为图标模式 (64px)
- Content 区域扩展
- 表格隐藏次要列

**移动端 (<1024px)**：
- Sidebar 变为抽屉式
- Content 全宽
- 表格变为卡片列表

#### Accessibility Requirements

| 要求 | 标准 |
|------|------|
| 颜色对比度 | ≥4.5:1 (正文), ≥3:1 (大文字) |
| 键盘导航 | 所有交互元素可 Tab 访问 |
| 屏幕阅读器 | 图表有 aria-label，状态有 aria-live |
| 焦点指示 | focus:ring-2 ring-primary-500 |

#### Design Deliverables

**产出物清单**：

| 产出物 | 格式 | 交付时间 |
|--------|------|----------|
| 整体视觉风格指南 | PDF + Figma | Phase 1.5 结束 |
| 5 个页面设计稿 | Figma | Phase 1.5 结束 |
| 组件设计规范 | Figma + Storybook | Phase 1.5 结束 |
| 交互流程文档 | Markdown | Phase 1.5 结束 |
| 设计资源文件 | SVG + PNG | Phase 2 开始前 |

**页面设计稿清单**：
1. Dashboard 首页（概览）
2. 模型配置页
3. 用量监控页
4. 日志查询页
5. 系统设置页
```

---

## 二、交互设计补充

### 2.1 在 "## User Scenarios & Testing" 部分添加以下内容

在现有 User Story 后面添加：

```markdown
### User Journey Maps

#### Journey 1: 模型配置修改

```
┌─────────────────────────────────────────────────────────────────────┐
│  阶段        │  进入页面    │  修改配置    │  保存确认    │  验证结果  │
├─────────────────────────────────────────────────────────────────────┤
│  用户行为    │  点击侧边栏  │  修改参数    │  点击保存    │  等待反馈  │
│              │  "模型配置"  │  切换模型    │              │            │
├─────────────────────────────────────────────────────────────────────┤
│  用户情绪    │  😐 平静     │  🤔 专注     │  😟 等待     │  😌 满意   │
│              │              │              │              │  或 😰 焦虑│
├─────────────────────────────────────────────────────────────────────┤
│  系统响应    │  加载配置    │  表单验证    │  API 调用   │  Toast 提示│
│              │  显示当前值  │  实时反馈    │  Spinner    │  更新状态  │
├─────────────────────────────────────────────────────────────────────┤
│  痛点        │  -           │  参数过多    │  不确定是否 │  延迟过长  │
│              │              │  不知道含义  │  成功       │            │
├─────────────────────────────────────────────────────────────────────┤
│  设计要点    │  清晰展示    │  参数说明    │  明确反馈   │  即时确认  │
│              │  当前配置    │  推荐值      │  保存状态   │  热更新    │
└─────────────────────────────────────────────────────────────────────┘
```

#### Journey 2: 用量监控查看

```
┌─────────────────────────────────────────────────────────────────────┐
│  阶段        │  进入页面    │  查看概览    │  深入分析    │  导出/操作 │
├─────────────────────────────────────────────────────────────────────┤
│  用户行为    │  点击侧边栏  │  浏览图表    │  筛选时间    │  导出数据  │
│              │  "用量监控"  │  查看数字    │  对比模型    │            │
├─────────────────────────────────────────────────────────────────────┤
│  用户情绪    │  😐 平静     │  😊 清晰     │  🤔 思考     │  😌 满足   │
│              │              │              │              │            │
├─────────────────────────────────────────────────────────────────────┤
│  系统响应    │  加载数据    │  渲染图表    │  更新视图    │  下载文件  │
│              │  骨架屏      │  动画效果    │  加载动画    │            │
├─────────────────────────────────────────────────────────────────────┤
│  痛点        │  加载慢      │  数据太多    │  不够直观    │  无法导出  │
│              │              │  找不到重点  │              │            │
├─────────────────────────────────────────────────────────────────────┤
│  设计要点    │  快速加载    │  核心指标    │  筛选器      │  导出功能  │
│              │  渐进加载    │  清晰突出    │  对比视图    │            │
└─────────────────────────────────────────────────────────────────────┘
```

### Interaction Flow Diagrams

#### Flow 1: 模型配置保存流程

```
用户点击"保存"
    │
    ▼
┌─────────────────┐
│  表单验证       │ ── 失败 ──▶ 显示字段错误
└─────────────────┘
    │ 成功
    ▼
┌─────────────────┐
│  显示确认弹窗   │
│  "确认保存？"   │ ── 取消 ──▶ 返回编辑
└─────────────────┘
    │ 确认
    ▼
┌─────────────────┐
│  按钮显示       │
│  "保存中..."    │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  API 验证       │ ── 失败 ──▶ Toast: "API Key 验证失败"
└─────────────────┘     │
    │ 成功              ▼
    ▼              保持编辑状态
┌─────────────────┐
│  保存到数据库   │ ── 失败 ──▶ Toast: "保存失败，请重试"
└─────────────────┘     │
    │ 成功              ▼
    ▼              重试按钮
┌─────────────────┐
│  Toast:         │
│  "配置已保存"   │
│  "5秒内生效"    │
└─────────────────┘
    │
    ▼
配置热更新生效
```

#### Flow 2: 日志查询流程

```
用户进入日志页面
    │
    ▼
┌─────────────────┐
│  显示筛选器     │
│  - 时间范围     │
│  - 会话 ID      │
│  - 状态筛选     │
└─────────────────┘
    │
    ▼
用户输入筛选条件
    │
    ▼
┌─────────────────┐
│  防抖等待 300ms │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  表格显示       │
│  加载动画       │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  数据返回       │ ── 无数据 ──▶ 空状态提示
└─────────────────┘     │
    │ 有数据          ▼
    ▼              "暂无符合条件的日志"
┌─────────────────┐
│  渲染表格       │
│  20 条/页       │
└─────────────────┘
    │
    ▼
用户点击某行展开详情
    │
    ▼
┌─────────────────┐
│  显示完整请求   │
│  - 请求参数     │
│  - 响应内容     │
│  - 各阶段耗时   │
└─────────────────┘
```

### Error Handling & Feedback

#### Error State Design

| 错误场景 | 显示方式 | 内容 | 操作 |
|----------|----------|------|------|
| API Key 验证失败 | Toast | "API Key 验证失败，请检查格式" | 返回编辑 |
| 配置保存失败 | Toast | "保存失败，请检查网络后重试" | 重试按钮 |
| 日志查询超时 | 页面内 | "查询超时，请缩小时间范围" | 修改筛选 |
| 无权限访问 | 模态框 | "您没有访问此功能的权限" | 联系管理员 |
| 网络断开 | 全局 Banner | "网络连接已断开" | 自动重连 |

#### Loading State Design

| 场景 | 加载样式 | 位置 |
|------|----------|------|
| 页面首次加载 | 骨架屏 | Content 区域 |
| 数据刷新 | 内联 Spinner | 组件内部 |
| 配置保存 | 按钮内 Spinner + 文字 | 按钮内部 |
| 图表渲染 | 渐进式淡入 | 图表区域 |

#### Success State Design

| 场景 | 显示方式 | 持续时间 |
|------|----------|----------|
| 配置保存成功 | 绿色 Toast | 3 秒自动消失 |
| 导出成功 | 绿色 Toast + 下载 | 3 秒自动消失 |
| 批量操作成功 | 绿色 Toast + 数量 | 5 秒自动消失 |
```

---

## 三、界面设计补充

### 3.1 在 "## Project Structure" 的 frontend 部分添加设计文件结构

在现有 frontend 结构后添加：

```markdown
### Design Assets Structure

```text
frontend/
├── src/
│   ├── app/admin/
│   │   ├── layout.tsx         # Admin 布局 (Sidebar + Header)
│   │   ├── page.tsx           # Dashboard 首页
│   │   ├── models/
│   │   │   └── page.tsx       # 模型配置页
│   │   ├── usage/
│   │   │   └── page.tsx       # 用量监控页
│   │   ├── logs/
│   │   │   └── page.tsx       # 日志查询页
│   │   └── settings/
│   │       └── page.tsx       # 系统设置页
│   ├── components/admin/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx    # 侧边栏组件
│   │   │   ├── Header.tsx     # 顶部导航
│   │   │   └── AlertBadge.tsx # 告警徽章
│   │   ├── charts/
│   │   │   ├── UsageChart.tsx      # 用量折线图
│   │   │   ├── CostChart.tsx       # 费用图表
│   │   │   └── ModelPieChart.tsx   # 模型分布饼图
│   │   ├── tables/
│   │   │   ├── LogTable.tsx        # 日志表格
│   │   │   └── ConfigTable.tsx     # 配置表格
│   │   ├── forms/
│   │   │   ├── ModelConfigForm.tsx # 模型配置表单
│   │   │   ├── ApiKeyInput.tsx     # API Key 输入组件
│   │   │   └── SettingForm.tsx     # 系统设置表单
│   │   └── common/
│   │       ├── StatusBadge.tsx     # 状态徽章
│   │       ├── EmptyState.tsx      # 空状态组件
│   │       ├── LoadingState.tsx    # 加载状态
│   │       └── ErrorBanner.tsx     # 错误横幅
│   └── styles/
│       └── admin.css          # Admin 专用样式
│
├── design/                    # 设计资源目录 (新增)
│   ├── assets/               # 设计素材
│   │   ├── icons/            # 图标 SVG
│   │   └── illustrations/    # 插图素材
│   ├── specs/                # 设计规范
│   │   ├── colors.md         # 配色规范
│   │   ├── typography.md     # 字体规范
│   │   ├── spacing.md        # 间距规范
│   │   └── components.md     # 组件规范
│   └── wireframes/           # 线框图 (可选)
│       ├── dashboard.png
│       ├── models.png
│       ├── usage.png
│       ├── logs.png
│       └── settings.png
│
└── .storybook/               # Storybook 组件文档 (可选)
    └── stories/
        └── admin/
            ├── UsageChart.stories.tsx
            ├── LogTable.stories.tsx
            └── AlertBadge.stories.tsx
```

### Component Hierarchy

```text
AdminLayout
├── Sidebar
│   ├── Logo
│   ├── NavMenu
│   │   ├── NavItem (Dashboard)
│   │   ├── NavItem (模型配置)
│   │   ├── NavItem (用量监控)
│   │   ├── NavItem (日志查询)
│   │   └── NavItem (系统设置)
│   └── UserProfile
├── Header
│   ├── PageTitle
│   ├── Breadcrumb (可选)
│   └── AlertBadge
└── Content
    └── [Page Component]
```

### Page Component Structure

**Dashboard 页面**：
```text
DashboardPage
├── StatsCards (核心指标卡片组)
│   ├── StatCard (今日调用)
│   ├── StatCard (Token 消耗)
│   ├── StatCard (费用估算)
│   └── StatCard (活跃用户)
├── UsageChart (用量趋势图)
├── ModelPieChart (模型分布)
└── RecentAlerts (最近告警)
```

**模型配置页面**：
```text
ModelsPage
├── ConfigTabs (配置类型切换)
│   ├── Tab (LLM)
│   ├── Tab (ASR)
│   └── Tab (TTS)
├── ConfigTable (配置列表)
│   ├── TableRow (配置项)
│   │   ├── ModelName
│   │   ├── Status
│   │   ├── IsDefault
│   │   └── Actions
├── ModelConfigForm (配置表单/抽屉)
│   ├── ProviderSelect
│   ├── ModelSelect
│   ├── ApiKeyInput
│   ├── ParametersForm
│   └── ActionButtons
└── EmptyState (无配置时)
```

**用量监控页面**：
```text
UsagePage
├── FilterBar (筛选栏)
│   ├── DateRangePicker
│   ├── ModelSelect
│   └── RefreshButton
├── StatsOverview (统计概览)
│   ├── StatCard (调用次数)
│   ├── StatCard (Token 消耗)
│   └── StatCard (估算费用)
├── UsageChart (趋势图表)
├── CostChart (费用图表)
└── DataTable (详细数据表)
```

**日志查询页面**：
```text
LogsPage
├── FilterBar (筛选栏)
│   ├── DateRangePicker
│   ├── SearchInput (会话ID)
│   ├── StatusFilter
│   └── RefreshButton
├── LogTable (日志表格)
│   ├── TableColumn (时间)
│   ├── TableColumn (会话ID)
│   ├── TableColumn (类型)
│   ├── TableColumn (状态)
│   ├── TableColumn (耗时)
│   └── Actions
├── LogDetail (详情抽屉)
│   ├── RequestInfo
│   ├── ResponseInfo
│   └── TimingBreakdown
└── Pagination (分页器)
```

**系统设置页面**：
```text
SettingsPage
├── SettingSections (设置分区)
│   ├── Section (默认模型)
│   │   └── ModelSelect
│   ├── Section (速率限制)
│   │   └── RateLimitForm
│   ├── Section (超时配置)
│   │   └── TimeoutForm
│   └── Section (告警阈值)
│       └── AlertThresholdForm
└── SaveButton
```
```

---

## 四、设计评审流程

### 4.1 添加设计评审节点

```markdown
### Design Review Process

#### Phase 1.5 设计介入阶段

**设计提案会议** (Day 1)：
- 设计师基于 spec.md 和 plan.md 提出初步设计方案
- 参与方：产品经理、开发负责人、设计师
- 产出：设计方向确认、页面清单确认

**设计细化** (Day 2-4)：
- 设计师产出详细设计稿
- 每日出设计进展同步
- 产出：Figma 设计稿、组件规范

**技术可行性评审** (Day 5)：
- 开发团队评估设计的技术可行性
- 反馈修改建议
- 产出：技术评审报告

**设计修改完善** (Day 6-7)：
- 设计师根据反馈修改设计
- 最终确认
- 产出：最终设计稿

#### 设计交付物清单

| 交付物 | 格式 | 负责人 | 截止时间 |
|--------|------|--------|----------|
| 视觉风格指南 | Figma + PDF | 设计师 | Day 3 |
| 5 个页面设计稿 | Figma | 设计师 | Day 5 |
| 组件设计规范 | Figma + Markdown | 设计师 | Day 5 |
| 交互流程文档 | Markdown | 设计师 | Day 5 |
| 技术评审报告 | Markdown | 开发 | Day 6 |
| 最终设计稿 | Figma | 设计师 | Day 7 |

#### 设计验收标准

- [ ] 所有页面设计稿完成
- [ ] 组件规范文档完整
- [ ] 交互流程清晰明确
- [ ] 开发团队确认可行
- [ ] 符合 WCAG AA 无障碍标准
```

---

## 五、验收标准对照表

| 验收标准 | 设计方案 | 能否达成 |
|----------|----------|----------|
| 页面加载时间 ≤3s | 骨架屏 + 渐进加载 | ✅ |
| 配置热更新延迟 ≤5s | Toast 反馈 + 状态更新 | ✅ |
| 日志查询 ≤5s | 分页 + 防抖 + 加载动画 | ✅ |
| 对比度 ≥4.5:1 | 配色系统已定义 | ✅ |
| 键盘可访问 | 所有交互元素 focus 状态 | ✅ |
| 错误状态可见 | Toast + Banner + 字段错误 | ✅ |
| 空状态友好 | 图标 + 文字 + 操作引导 | ✅ |

---

**此文档为 plan.md 的设计规划补充，建议合并到 plan.md 的相应章节。**