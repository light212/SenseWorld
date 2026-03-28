# SenseWorld 架构审查报告

## 审查时间
2026-03-28 22:45

## 方法论
按 `improve-codebase-architecture` 技能流程

## 一、架构摩擦点

### 1. ChatWindow.tsx - 巨型组件 (704行)

**问题**：
- 职责过多：消息管理、流式处理、音频播放、WebSocket、录音...
- 理解一个功能需要在多个 useEffect 和回调间跳转
- 测试困难，需要 mock 整个组件

**依赖类别**: In-process

**建议**：拆分为多个深度模块
- `useChatStream` - 流式聊天逻辑
- `useAudioPlayback` - 音频播放管理
- `useVoiceRecording` - 语音录制

### 2. API 调用 - 分散的浅层模块

**问题**：
- 13 处硬编码 `localhost:8000`
- 没有统一的错误处理
- 每个调用者自己处理 token

**依赖类别**: Remote but owned (Ports & Adapters)

**建议**：
- 定义统一的 API 客户端接口
- 生产用 HTTP adapter，测试用 in-memory adapter
- 所有调用走统一入口

### 3. 状态管理 - 紧密耦合

**问题**：
- Zustand store 存消息
- 组件 useState 也存消息
- 同一数据在多处维护

**依赖类别**: In-process

**建议**：
- 消息只在 store 中存储
- 组件只读 store，通过 action 更新
- 移除组件内的冗余状态

### 4. 音频播放 - 全局状态泄漏

**问题**：
- `let currentPlayingAudio` 模块变量
- 多个 VoiceMessageBubble 实例共享
- 无法隔离测试

**依赖类别**: In-process

**建议**：
- 创建 `AudioPlaybackContext`
- 通过 React Context 管理播放状态
- 支持多个独立的音频播放器实例

## 二、建议加深顺序

| 优先级 | 模块 | 收益 |
|--------|------|------|
| P0 | API 客户端统一 | 13 处改 1 处，测试覆盖 |
| P0 | 音频播放 Context | 修复重音 bug，可测试 |
| P1 | ChatWindow 拆分 | 可测试，可维护 |
| P2 | 状态管理统一 | 数据流清晰 |

## 三、下一步

选择一个模块进行加深：

1. **API 客户端统一** - 立即可做，风险低
2. **音频播放 Context** - 修复当前 bug
3. **ChatWindow 拆分** - 需要更多设计

你想先深入哪个？