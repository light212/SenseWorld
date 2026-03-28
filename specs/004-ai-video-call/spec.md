# Feature Specification: AI 视频通话

**Feature Branch**: `004-ai-video-call`
**Created**: 2025-01-01
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 开启视频通话与 AI 实时对话 (Priority: P1)

用户在聊天页面点击视频通话按钮，授权摄像头和麦克风后，与 AI 进行实时音视频对话。AI 通过 `qwen3-omni-flash-realtime` 接收用户的音频流和摄像头画面，以语音+文字形式回复，前端播放 AI 音频并展示带动画的数字人占位头像。

**Why this priority**: 这是核心功能，所有其他故事都依赖于此基础通道的稳定工作。

**Independent Test**: 点击视频按钮 → 授权摄像头麦克风 → 对着摄像头说话 → AI 语音回复并在界面展示文字转录。

**Acceptance Scenarios**:

1. **Given** 用户已登录且在 `/chat` 页面，**When** 点击输入栏的视频通话按钮，**Then** 浏览器弹出摄像头+麦克风权限请求
2. **Given** 用户已授权摄像头和麦克风，**When** 权限授权完成，**Then** 摄像头预览画面出现在界面上，AI 数字人头像显示，WebSocket 连接至 `/ws/omni`
3. **Given** 视频通话已建立，**When** 用户对着麦克风说话，**Then** 服务端 VAD 检测到语音，AI 处理后以语音回复，前端播放 AI 音频
4. **Given** 视频通话进行中，**When** 摄像头有画面，**Then** 前端截取视频帧以 base64 JPEG 格式发送给后端，后端转发 `input_image_buffer.append` 事件给 DashScope（仅在已发送音频帧后）
5. **Given** 视频通话进行中，**When** AI 开始语音回复，**Then** 数字人头像显示脉冲动画表示 AI 正在说话
6. **Given** 视频通话进行中，**When** 用户点击挂断按钮，**Then** 摄像头关闭、WebSocket 断开、界面回到普通聊天模式

---

### User Story 2 - 摄像头权限拒绝的降级处理 (Priority: P2)

当用户拒绝摄像头或麦克风权限时，系统给出友好提示，不崩溃，普通聊天功能不受影响。

**Why this priority**: 权限拒绝是常见场景，必须有良好的错误处理。

**Independent Test**: 在浏览器中拒绝摄像头权限，验证 toast 提示出现且普通聊天仍可用。

**Acceptance Scenarios**:

1. **Given** 用户点击视频通话按钮，**When** 用户在权限弹窗中点击拒绝，**Then** 显示 toast 提示「需要摄像头和麦克风权限才能使用视频通话」，视频通话模式不启动
2. **Given** 摄像头权限被拒绝，**When** 提示显示后，**Then** 普通文字/语音聊天功能完全正常

---

### User Story 3 - 通话断线自动清理 (Priority: P3)

当 WebSocket 意外断开时，摄像头和麦克风自动释放，界面回到普通聊天模式。

**Why this priority**: 资源泄漏会影响用户体验和隐私。

**Independent Test**: 断开网络，验证摄像头指示灯熄灭，界面回到正常状态。

**Acceptance Scenarios**:

1. **Given** 视频通话进行中，**When** WebSocket 连接意外断开，**Then** 摄像头和麦克风流自动停止，界面退出视频通话模式
2. **Given** 视频通话进行中，**When** 用户切换到其他 conversation，**Then** 当前视频通话自动结束，资源释放

---

## Out of Scope

- 真实数字人视频生成（3D/2D 数字人渲染）
- WebRTC 点对点视频
- 视频录制和回放
- 多人通话
- 视频通话历史记录保存

## Success Criteria

### Measurable Outcomes

- **SC-001**: 用户点击视频按钮到 AI 开始响应的端到端延迟 < 3 秒（正常网络条件下）
- **SC-002**: 视频帧发送不影响音频流畅度，音频延迟无明显增加
- **SC-003**: 挂断后摄像头指示灯熄灭（资源完全释放）
- **SC-004**: 权限拒绝场景下普通聊天功能不受影响

## Assumptions

- 用户使用支持 MediaStream API 的现代浏览器（Chrome/Firefox/Safari 最新版）
- DashScope `qwen3-omni-flash-realtime` 支持 `input_image_buffer.append` 事件（已通过官方文档确认）
- 图片帧必须在至少一次 `input_audio_buffer.append` 之后才能发送（DashScope 协议约束）
- `session.modalities` 必须为 `["audio", "text"]`，不能只有 `["audio"]`
- 本功能不涉及数据库 schema 变更，无需执行 Schema Change Protocol
- 数字人头像使用 CSS 动画占位，后续版本可升级为真实数字人
- 现有 `/ws/omni` WebSocket 通道和 `OmniClient` 作为基础复用
