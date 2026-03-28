# Tasks: AI 视频通话

**Input**: `specs/004-ai-video-call/spec.md` + `specs/004-ai-video-call/plan.md`

## 格式说明

- **[P]**: 可并行执行（不同文件，无依赖）
- **[US1/US2/US3]**: 对应的用户故事
- 每个任务包含精确文件路径和验证方法

---

## Phase 0: 后端基础 - Omni 服务扩展

**目的**: 为 DashScope 视频帧和 session 配置提供后端支持

- [x] T001 [US1] 在 `backend/app/services/omni_realtime_service.py` 中新增 `send_session_update()` 方法，发送 `session.update` 事件，包含完整参数：`modalities=["audio","text"]`、`voice="Chelsie"`、`input_audio_format="pcm"`、`output_audio_format="pcm"`、`turn_detection={type:server_vad, threshold:0.5, silence_duration_ms:800}`、`max_tokens=16384`、`repetition_penalty=1.05`

- [x] T002 [US1] 在 `backend/app/services/omni_realtime_service.py` 中的 `_on_open()` 回调里调用 `self.send_session_update()`，确保连接建立后立即配置会话

- [x] T003 [US1] 在 `backend/app/services/omni_realtime_service.py` 中新增 `send_video_frame(image_data: bytes)` 方法，发送 `input_image_buffer.append` 事件，`image` 字段为 base64 编码的 JPEG 字节

  **验证**: `cd backend && python -c "from app.services.omni_realtime_service import OmniRealtimeService; s = OmniRealtimeService.__new__(OmniRealtimeService); print(hasattr(s, 'send_video_frame') and hasattr(s, 'send_session_update'))"`

---

## Phase 1: 后端路由 - 处理 image_frame 消息

**目的**: omni_websocket 转发前端视频帧给 DashScope

- [x] T004 [US1] 在 `backend/app/api/omni_websocket.py` 的 `OmniSession.handle_message()` 中新增 `elif msg_type == "image_frame":` 分支，解码 `payload["image"]` 的 base64，调用 `self.omni_service.send_video_frame(image_data)`，并加 logger.debug 日志

  **验证**: `cd backend && python -c "from app.api.omni_websocket import OmniSession; print('ok')"`

---

## Phase 2: 前端 OmniClient - 摄像头采集能力

**目的**: OmniClient 支持摄像头流获取和定时截帧

- [x] T005 [US1] 在 `frontend/src/lib/omni-client.ts` 的 `OmniClient` 类中新增私有成员：`private videoStream: MediaStream | null = null`、`private videoIntervalId: ReturnType<typeof setInterval> | null = null`、`private audioSentOnce = false`

- [x] T006 [US1] 在 `frontend/src/lib/omni-client.ts` 的 `sendAudio()` 方法末尾设置 `this.audioSentOnce = true`

- [x] T007 [US1] 在 `frontend/src/lib/omni-client.ts` 新增 `async startCamera(videoElement: HTMLVideoElement): Promise<void>` 方法：调用 `navigator.mediaDevices.getUserMedia({video: true, audio: false})`，将 stream 赋给 `videoElement.srcObject` 和 `this.videoStream`，然后启动 `setInterval(() => this.captureAndSendFrame(), 500)` 赋给 `this.videoIntervalId`

- [x] T008 [US1] 在 `frontend/src/lib/omni-client.ts` 新增 `captureAndSendFrame(): void` 方法：若 `!this.audioSentOnce` 则直接返回；创建离屏 canvas（320x240），drawImage videoElement 的当前帧，调用 `canvas.toBlob(blob => ..., 'image/jpeg', 0.7)` 转换，再用 `FileReader` 或 `blob.arrayBuffer()` 转为 ArrayBuffer，调用已有的 `this.sendImage(buffer, 'image/jpeg')`

- [x] T009 [US1] 在 `frontend/src/lib/omni-client.ts` 新增 `stopCamera(): void` 方法：清除 `videoIntervalId`，停止 `videoStream` 的所有 tracks，置空两者，重置 `audioSentOnce = false`

- [x] T010 [US1] 在 `frontend/src/lib/omni-client.ts` 的 `disconnect()` 方法中调用 `this.stopCamera()`

  **验证**: `cd frontend && npx tsc --noEmit`

---

## Phase 3: 前端 CompactInputBar - 视频通话按钮

**目的**: 视频按钮改为触发/结束视频通话，非文件选择

- [x] T011 [US1] 在 `frontend/src/components/chat/CompactInputBar.tsx` 的 `CompactInputBarProps` 接口中：将 `onVideoSelect?: (file: File) => void` 替换为 `onVideoCallToggle?: () => void`，新增 `isVideoCallActive?: boolean`

- [x] T012 [US1] 更新 `frontend/src/components/chat/CompactInputBar.tsx` 中视频按钮的实现：移除 `<input type="file">` 的隐藏 input 和 `videoInputRef`，将按钮 onClick 改为 `onVideoCallToggle?.()`，当 `isVideoCallActive` 为 true 时按钮样式改为红色（`bg-red-500`），视频通话激活时禁用语音录音按钮

  **验证**: `cd frontend && npx tsc --noEmit`

---

## Phase 4: 前端 ChatWindow - 视频通话 UI 集成

**目的**: 管理 OmniClient 生命周期，展示摄像头预览和数字人头像

- [x] T013 [US1] 在 `frontend/src/components/chat/ChatWindow.tsx` 中新增 state 和 refs：`const [isVideoCallActive, setIsVideoCallActive] = useState(false)`、`const [isAiSpeaking, setIsAiSpeaking] = useState(false)`、`const omniClientRef = useRef<OmniClient | null>(null)`、`const videoElementRef = useRef<HTMLVideoElement | null>(null)`

- [x] T014 [US1] 在 `frontend/src/components/chat/ChatWindow.tsx` 中新增 `handleVideoCallToggle` 回调：
  - 开启时：`getUserMedia({video:true, audio:false})` 先检查权限（音频权限由 OmniClient.startRecording 负责）→ 创建 OmniClient 并连接 `/ws/omni` → 调用 `startCamera(videoElementRef.current)` → 调用 `startRecording()` → 注册 `onEvent` 监听 AI 音频输出事件设置 `isAiSpeaking` → `setIsVideoCallActive(true)`
  - 关闭时：`omniClientRef.current?.disconnect()` → `setIsVideoCallActive(false)`、`setIsAiSpeaking(false)`

- [x] T015 [US2] 在 `handleVideoCallToggle` 的 catch 块中捕获权限拒绝错误（`NotAllowedError`），调用 `toast.error('需要摄像头和麦克风权限才能使用视频通话')`

- [x] T016 [US3] 在 `frontend/src/components/chat/ChatWindow.tsx` 中添加 `useEffect`：当 `currentConversationId` 变化时，若 `isVideoCallActive` 为 true 则调用 `handleVideoCallToggle()` 结束通话；组件卸载时也执行 cleanup

- [x] T017 [US1] 在 `frontend/src/components/chat/ChatWindow.tsx` 的 JSX 中，在 `MessageList` 和 `CompactInputBar` 之间插入视频通话覆盖层（仅 `isVideoCallActive` 时显示）：
  ```
  <div className="flex items-center gap-4 p-3 bg-gray-900 border-b">
    {/* 摄像头预览 */}
    <video ref={videoElementRef} autoPlay muted className="w-40 h-30 rounded-lg object-cover" />
    {/* AI 数字人头像 */}
    <div className={`w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center ${isAiSpeaking ? 'animate-pulse' : ''}`}>
      <Bot className="w-8 h-8 text-white" />
      {isAiSpeaking && <div className="flex gap-1">...</div>} {/* 3个跳动圆点 */}
    </div>
    {/* 挂断按钮 */}
    <button onClick={handleVideoCallToggle} className="p-2 bg-red-500 text-white rounded-full">
      <PhoneOff className="w-5 h-5" />
    </button>
  </div>
  ```

- [x] T018 [US1] 将 `onVideoCallToggle={handleVideoCallToggle}` 和 `isVideoCallActive={isVideoCallActive}` 传给 `CompactInputBar`

  **验证**: `cd frontend && npx tsc --noEmit`

---

## Phase 5: 端到端验证

- [x] T019 [US1] 手动端到端测试：登录 → `/chat` → 点击视频按钮 → 授权 → 摄像头预览出现 + 头像显示 → 说话 → AI 语音回复 + 头像动画激活 → 挂断 → 摄像头关闭
- [x] T020 [US2] 权限拒绝测试：拒绝摄像头权限 → toast 出现 → 普通聊天正常
- [x] T021 [US3] 资源清理测试：通话中切换 conversation → 摄像头自动释放
- [x] T022 后端启动验证：`cd backend && python -c "from app.main import app; print('ok')"`

---

## Execution Order

```
T001 → T002 → T003   (后端服务，顺序)
T004                   (后端路由，依赖 T003)
T005 → T006 → T007 → T008 → T009 → T010  (前端 OmniClient，顺序)
T011 → T012            (前端 CompactInputBar，顺序)
T013 → T014 → T015 → T016 → T017 → T018  (前端 ChatWindow，顺序)
T019 → T020 → T021 → T022  (验证)
```

可并行：Phase 0+1（后端）与 Phase 2（OmniClient）可同时进行，因为文件不同。

---

## Notes

- 发送视频帧前必须已发送过至少一次音频帧（`audioSentOnce` flag 控制）
- `session.modalities` 必须包含 `"text"`，不能只有 `"audio"`
- 数字人头像用 Tailwind `animate-pulse` 实现，无需新 CSS 文件
- 不新建任何文件，不涉及数据库变更
