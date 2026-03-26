# 变更日志

## 2026-03-26

### 功能变更

#### P0: 流式 LLM + 分段 TTS

**问题**: 当前等完整回复再显示，延迟 5-10 秒

**方案**:
- 后端新增 `/v1/chat/stream` 流式 API（SSE）
- LLM 流式输出
- TTS 按句子分段合成
- 前端实时显示文本 + 音频队列播放

**实现文件**:
- `backend/app/api/v1/chat.py` - 新增 `/stream` 端点
- `frontend/src/components/chat/ChatWindow.tsx` - 流式请求处理

---

#### P1-1: 新用户麦克风引导

**功能**: 首次使用时检测麦克风权限，显示引导弹窗

**实现**:
- 检测权限状态：prompt/granted/denied
- 未授权时显示引导 UI
- 授权后保存状态到 localStorage

**实现文件**:
- `frontend/src/components/chat/CompactInputBar.tsx`

---

#### P1-2: 识别文字可编辑

**功能**: 语音识别后显示文字，用户可编辑后再发送

**流程变化**:
- 之前: 录音 → ASR → 自动发送
- 现在: 录音 → ASR → 预览+编辑 → 用户确认发送

**实现文件**:
- `frontend/src/components/chat/CompactInputBar.tsx`

---

#### P1-3: 重新录制功能

**功能**: 录音完成后显示预览，提供"重录"和"发送"按钮

**实现文件**:
- `frontend/src/components/chat/CompactInputBar.tsx`

---

#### TTS WebSocket 流式调用

**问题**: `qwen3-tts-flash-realtime` 模型只支持 WebSocket

**实现**:
- 使用 websockets 库建立连接
- URL: `wss://dashscope.aliyuncs.com/api-ws/v1/inference/`
- 支持 PCM 流式音频返回
- 新增 `synthesize_stream()` 流式方法

**实现文件**:
- `backend/app/services/tts_service.py`

---

### UI 变更

#### 主题

**决策**: 使用亮色主题（非深色）

**实现**:
- 背景: 白色/浅灰 (bg-gray-50, bg-white)
- 用户消息: 蓝紫渐变 `from-blue-500 to-purple-600`
- AI 消息: 白色卡片 + 边框阴影

---

#### 紧凑输入栏

**设计**: 48px 高度（原 ~120px）

```
[+] │ 输入消息... │ [📹] [🎤] 或 [➤]
```

**实现文件**:
- `frontend/src/components/chat/CompactInputBar.tsx`

---

#### Lucide 图标库

**安装**: `npm install lucide-react`

**替换**:
| 原图标 | Lucide | 用途 |
|--------|--------|------|
| 🎤 | Mic | 语音输入 |
| ➤ | Send | 发送消息 |
| 📹 | Video | 视频输入 |
| + | Plus | 更多操作 |
| ▶/⏸ | Play/Pause | 播放控制 |
| 👤 | User | 用户头像 |
| 🤖 | Bot | AI 头像 |

---

#### 语音播放 UI

**VoiceMessageBubble（用户语音气泡）**:
- 背景: 纯蓝 `bg-blue-500`
- 播放按钮: 白色圆形
- 声波: 7 条
- 进度条: 集成在气泡底部

**AudioPlayer（AI 语音播放器）**:
- 背景: 白色 + 边框
- 播放按钮: 大圆形蓝色
- 进度条: 粗条 `h-1.5`，可点击跳转
- 声波: 20 条动态动画

**实现文件**:
- `frontend/src/components/chat/VoiceMessageBubble.tsx`
- `frontend/src/components/chat/AudioPlayer.tsx`

---

### Bug 修复

#### Bug 1: 切换会话时语音不停止

**问题**: 语音播放中切换会话，语音还在继续播放

**修复**:
- 添加 `currentAudioRef` 跟踪当前音频
- 会话切换时调用 `stopCurrentAudio()`

**文件**: `frontend/src/components/chat/ChatWindow.tsx`

---

#### Bug 2: 用户语音被转成文字显示

**问题**: 用户发的语音直接显示为文字，不是语音条

**修复**:
- 修复 `isVoiceMessage` 判断逻辑
- 只要有 `inputType: 'voice'` 就显示语音条

**文件**: `frontend/src/components/chat/MessageList.tsx`

---

#### Bug 3: 会话列表不显示

**问题**: 创建的会话没有出现在左侧会话列表

**修复**:
- 从后端加载会话列表
- 创建新会话后添加到列表

**文件**: `frontend/src/app/chat/page.tsx`

---

#### Bug 4: 会话切换不生效

**问题**: ChatWindow 使用 local state，没有监听 store 变化

**修复**:
- 使用 store 的 `currentConversationId`
- 监听变化重新加载消息

**文件**: `frontend/src/components/chat/ChatWindow.tsx`

---

#### Bug 5: 删除会话 404

**问题**: `conversation_id: UUID` 类型导致查询失败

**修复**:
- `conversation_id: UUID` → `str`
- 避免字符串格式转换问题

**文件**: `backend/app/api/v1/conversation.py`

---

#### Bug 6: CORS 问题

**问题**: 前端运行在 3001 端口，后端 CORS 只允许 3000

**修复**:
- 添加 `http://localhost:3001` 到 CORS 白名单

**文件**: `backend/app/config.py`

---

#### Bug 7: WebSocket 连接失败

**问题**: WebSocket 在 accept 之前尝试 close

**修复**:
- 先 accept 连接再验证 token
- 失败时发送错误消息后再 close

**文件**: `backend/app/api/websocket.py`

---

### 配置变更

#### TTS 模型

```env
# 修改前
TTS_MODEL=qwen3-tts-flash

# 修改后
TTS_MODEL=qwen3-tts-flash-realtime
```

**文件**: `backend/.env`