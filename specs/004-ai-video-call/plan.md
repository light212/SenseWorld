# Implementation Plan: AI 视频通话

**Branch**: `004-ai-video-call` | **Date**: 2025-01-01 | **Spec**: [spec.md](./spec.md)

## Summary

在现有聊天页面（`/chat`）的 `CompactInputBar` 中新增视频通话按钮。点击后开启摄像头和麦克风，通过现有 `/ws/omni` WebSocket 通道同时发送 PCM 音频流（`input_audio_buffer.append`）和 JPEG 视频帧（`input_image_buffer.append`）给 DashScope `qwen3-omni-flash-realtime`。AI 以语音+文字回复，前端播放音频并展示带 CSS 动画的数字人占位头像。不新建文件，仅修改 5 个现有文件。

## Technical Context

**Language/Version**: Python 3.11 (backend), TypeScript / Next.js 14 (frontend)
**Primary Dependencies**: FastAPI, websocket-client, React, TailwindCSS
**Storage**: N/A（本功能不涉及数据库变更）
**Testing**: pytest (backend), 浏览器手动测试 (frontend)
**Target Platform**: Web (Chrome/Firefox/Safari 最新版)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: 端到端延迟 < 3s，视频帧发送不影响音频流畅度
**Constraints**: DashScope 协议约束：图片帧必须在至少一次音频帧后才能发送；modalities 必须含 "text"
**Scale/Scope**: 单用户视频通话，不涉及多并发扩展

## Constitution Check

- ✅ 后端启动验证：无新依赖，无 schema 变更，`from app.main import app` 无需额外步骤
- ✅ 增量实现：每个任务聚焦单一功能点，一个 PR 做一件事
- ✅ 可观测性：现有 `logger` 已覆盖，新增 video_frame 处理日志
- ✅ Schema Change Protocol：本功能不涉及数据库模型变更，无需迁移

## Project Structure

```text
specs/004-ai-video-call/
├── spec.md       # 功能规格
├── plan.md       # 本文件
└── tasks.md      # 任务列表（/speckit.tasks 输出）

backend/app/
├── services/omni_realtime_service.py   # 新增 send_video_frame() + send_session_update()
└── api/omni_websocket.py               # 新增 image_frame 消息类型处理

frontend/src/
├── lib/omni-client.ts                  # 新增摄像头采集 + startCamera()/stopCamera()
├── components/chat/CompactInputBar.tsx  # 视频按钮改为触发通话模式
└── components/chat/ChatWindow.tsx       # 集成 OmniClient 生命周期 + 视频通话 UI
```

## Implementation Phases

### Phase 0: 后端 - 新增 send_video_frame() 和完善 session_update

**文件**: `backend/app/services/omni_realtime_service.py`

**改动**:
1. 新增 `send_video_frame(image_data: bytes)` 方法，发送 `input_image_buffer.append` 事件
2. 新增/完善 `send_session_update()` 方法，使用正确的 session 参数：
   - `modalities: ["audio", "text"]`（不能只有 audio）
   - `turn_detection: {type: "server_vad", threshold: 0.5, silence_duration_ms: 800}`
   - `voice: "Chelsie"`
   - `input_audio_format: "pcm"`, `output_audio_format: "pcm"`
   - `max_tokens: 16384`, `repetition_penalty: 1.05`
3. 确认 `_on_open` 回调中调用 `send_session_update()`

**验证**: `python -c "from app.services.omni_realtime_service import OmniRealtimeService; print('ok')"`

### Phase 1: 后端 - omni_websocket 处理 image_frame 消息

**文件**: `backend/app/api/omni_websocket.py`

**改动**: 在 `OmniSession.handle_message()` 中新增 `image_frame` 消息类型处理：
```python
elif msg_type == "image_frame":
    image_base64 = payload.get("image")
    if image_base64:
        image_data = base64.b64decode(image_base64)
        self.omni_service.send_video_frame(image_data)
```

**验证**: `python -c "from app.api.omni_websocket import OmniSession; print('ok')"`

### Phase 2: 前端 - OmniClient 新增摄像头支持

**文件**: `frontend/src/lib/omni-client.ts`

**改动**:
1. 新增 `videoStream: MediaStream | null` 和 `videoCanvas: HTMLCanvasElement | null` 成员
2. 新增 `audioSentOnce: boolean` flag（确保先发音频再发视频帧）
3. 新增 `startCamera(videoElement: HTMLVideoElement): Promise<void>` — 获取摄像头流，绑定到 video 元素，启动定时截帧
4. 新增 `stopCamera(): void` — 停止摄像头流和截帧定时器
5. 新增 `captureAndSendFrame(): void` — 用 canvas 截帧，转 JPEG base64，调用已有的 `sendImage()`
6. 在 `sendAudio()` 中设置 `audioSentOnce = true`
7. 在 `captureAndSendFrame()` 中检查 `audioSentOnce`，未发过音频则跳过
8. `disconnect()` 中调用 `stopCamera()`

**帧率**: 使用 `setInterval` 每 500ms 截帧（约 2fps，保守起步，可按 DashScope 实际表现调整）

**验证**: TypeScript 编译无错误 `cd frontend && npx tsc --noEmit`

### Phase 3: 前端 - CompactInputBar 视频通话按钮

**文件**: `frontend/src/components/chat/CompactInputBar.tsx`

**改动**:
1. `onVideoSelect?: (file: File) => void` prop 替换为 `onVideoCallToggle?: () => void`
2. 视频按钮的 `onClick` 改为调用 `onVideoCallToggle?.()`
3. 接收 `isVideoCallActive?: boolean` prop，视频通话激活时按钮高亮（红色/active 样式）
4. 视频通话激活时禁用语音录音按钮（避免冲突）

**验证**: TypeScript 编译无错误

### Phase 4: 前端 - ChatWindow 集成视频通话模式

**文件**: `frontend/src/components/chat/ChatWindow.tsx`

**改动**:
1. 新增 `isVideoCallActive` state
2. 新增 `omniClientRef` 和 `videoElementRef`
3. 新增 `handleVideoCallToggle()` — 开启/关闭视频通话：
   - 开启：请求摄像头权限 → 创建/连接 OmniClient → startCamera() → setIsVideoCallActive(true)
   - 关闭：stopCamera() → disconnect() → setIsVideoCallActive(false)
4. 新增视频通话 UI 覆盖层（在消息区上方显示）：
   - 左侧：`<video>` 摄像头预览（muted, autoPlay, 160x120）
   - 右侧：AI 数字人占位头像（圆形，机器人图标 + CSS pulse 动画，AI 说话时激活）
   - 挂断按钮（PhoneOff 图标）
5. 监听 OmniClient `omni_event` 事件，检测音频输出激活数字人动画
6. conversation 切换时自动结束视频通话（useEffect cleanup）
7. 权限拒绝时 toast 提示
8. 传 `onVideoCallToggle` 和 `isVideoCallActive` 给 `CompactInputBar`

**数字人头像动画**:
```css
/* AI 说话时: pulse 动画 */
@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
/* 口型: 3个跳动圆点 */
```
（用 Tailwind 的 `animate-pulse` 实现，无需新增 CSS 文件）

**验证**: TypeScript 编译无错误，浏览器手动测试流程（见 spec 验收场景）

## File Change Summary

| 文件 | 改动类型 | 关键新增 |
|------|----------|----------|
| `backend/app/services/omni_realtime_service.py` | 修改 | `send_video_frame()`, `send_session_update()` |
| `backend/app/api/omni_websocket.py` | 修改 | `image_frame` 消息处理 |
| `frontend/src/lib/omni-client.ts` | 修改 | `startCamera()`, `stopCamera()`, `captureAndSendFrame()`, `audioSentOnce` flag |
| `frontend/src/components/chat/CompactInputBar.tsx` | 修改 | `onVideoCallToggle` prop, active 样式 |
| `frontend/src/components/chat/ChatWindow.tsx` | 修改 | 视频通话模式 UI + OmniClient 生命周期 |

**不新建文件。不涉及数据库变更。**

## Verification Plan

1. **后端编译检查**: `python -c "from app.main import app; print('ok')"`
2. **前端类型检查**: `cd frontend && npx tsc --noEmit`
3. **端到端手动测试**:
   - 登录 → 进入 `/chat` → 点击视频按钮
   - 授权摄像头+麦克风 → 确认预览和头像出现
   - 说话 → 确认 AI 语音回复 + 头像动画
   - 挂断 → 确认摄像头指示灯熄灭
4. **异常测试**:
   - 拒绝权限 → 确认 toast 提示且普通聊天可用
   - 通话中断网 → 确认摄像头自动释放
