# 语音问题系统性分析

## 技能指导原则

### voice-ai-development
- 音频状态管理：加载中、播放中、暂停、错误
- 错误处理：音频加载失败时的回退策略
- 用户体验：明确的状态反馈

### react-state-management
- 单一数据源：消息只在 store 中存储
- 使用 selector 避免不必要重渲染
- 分离服务器状态和 UI 状态

### clean-code
- 函数不超过 20 行
- 函数只做一件事
- 名称要揭示意图

---

## 当前问题

### 问题 1：用户语音不能点击

**技能分析**（react-state-management）：
- audioUrl 是否正确传递？
- 状态更新是否及时？

**排查点**：
```typescript
// VoiceMessageBubble 接收的 props
messageId: string
duration: number
audioUrl?: string
isUser: boolean
```

### 问题 2：AI 消息刷新后消失

**技能分析**（react-state-management）：
- 数据源不一致？API 返回 vs store 状态
- 刷新后是否重新加载？

### 问题 3：语音播放完显示空白

**技能分析**（voice-ai-development）：
- 播放状态管理不完整
- 缺少"播放完成"状态

---

## 系统性修复方案

### 1. 状态管理重构

```typescript
// stores/audioStore.ts
interface AudioState {
  playingId: string | null;
  loadingIds: Set<string>;
  errorIds: Set<string>;
  
  play: (id: string) => void;
  pause: () => void;
  setLoading: (id: string, loading: boolean) => void;
  setError: (id: string, error: boolean) => void;
}
```

### 2. 组件拆分（clean-code）

```
VoiceMessageBubble (当前 200+ 行)
    ↓ 拆分为
├── VoiceWaveform.tsx (30 行)
├── VoiceDuration.tsx (20 行)
└── VoiceMessageBubble.tsx (50 行)
```

### 3. 数据流统一

```
发送消息
    ↓
addMessage (store)
    ↓
sendMessage (API)
    ↓
updateMessage (store)
    ↓
渲染组件
```

---

## 修复优先级

| 优先级 | 问题 | 技能指导 |
|--------|------|----------|
| P0 | AI 消息刷新后消失 | react-state-management: 单一数据源 |
| P0 | 用户语音不能点击 | voice-ai-development: 音频状态管理 |
| P1 | 组件拆分 | clean-code: 函数不超过 20 行 |