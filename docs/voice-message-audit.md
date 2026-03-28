# 语音消息系统完整架构审查

## 一、数据流维度

### 当前问题

| 环节 | 用户语音 | AI 语音 |
|------|----------|---------|
| 发送时 | ✅ blob URL | ✅ 内存 URL |
| IndexedDB 保存 | ✅ 正确 | ✅ 正确 |
| 数据库 ID | ✅ 匹配 | ✅ 匹配 |
| audioDuration 存储 | ✅ 用户消息有 | ❌ **AI 消息没有** |
| 刷新后加载 | ✅ 从 IndexedDB | ⚠️ 时长为 0 |

### 根本问题

**AI 消息的 audioDuration 没有存储到数据库**

```python
# 后端 chat.py 第 281 行
ai_message = Message(
    id=message_id,
    conversation_id=conversation_id,
    role="assistant",
    content=full_response,
    has_audio=is_voice_input,
    extra_data={"input_type": data.input_type},
    # ❌ 缺少 audio_duration
)
```

---

## 二、存储维度

| 存储 | 内容 | 问题 |
|------|------|------|
| IndexedDB | 音频 base64 | ✅ 正常 |
| 数据库 messages | 消息元数据 | ❌ AI 消息缺少 audio_duration |
| 内存 blob URL | 临时播放 | ✅ 正常 |

---

## 三、状态维度

| 状态 | 用户语音 | AI 语音 |
|------|----------|---------|
| 刚发送 | ✅ 可播放 | ✅ 可播放 |
| 刷新后 | ✅ 可播放 | ⚠️ 时长 0:00 |
| 跨设备 | ❌ 无音频 | ❌ 无音频 |

---

## 四、完整解决方案

### 方案 A：后端存储 AI 音频时长

**优点**：数据完整
**缺点**：需要后端计算时长

**实现**：
```python
# 后端生成 AI 音频时计算时长
import wave
import io

def get_wav_duration(audio_data: bytes) -> int:
    with wave.open(io.BytesIO(audio_data), 'rb') as wav:
        frames = wav.getnframes()
        rate = wav.getframerate()
        return int((frames / float(rate)) * 1000)

# 保存 AI 消息时
total_duration = sum(get_wav_duration(chunk) for chunk in audio_chunks)
ai_message = Message(
    ...,
    extra_data={"input_type": data.input_type, "audio_duration": total_duration},
)
```

### 方案 B：前端从音频元素获取时长

**优点**：简单，不需要后端改动
**缺点**：刷新后第一次播放才能获取

**实现**：当前 VoiceMessageBubble 已有此逻辑

### 方案 C：存储到 IndexedDB 的元数据

**优点**：不依赖数据库
**缺点**：跨设备不可用

---

## 五、推荐方案

**组合方案：后端存储 + 前端回退**

1. **后端**：生成音频时计算并存储 audio_duration
2. **前端**：如果数据库没有，从音频元素获取

### 优先级

| 优先级 | 任务 | 复杂度 |
|--------|------|--------|
| P0 | 后端存储 AI 音频时长 | 中 |
| P1 | 前端回退机制优化 | 低 |
| P2 | 跨设备音频同步 | 高 |

---

## 六、其他潜在问题

| 问题 | 影响 | 建议 |
|------|------|------|
| IndexedDB 7天过期 | 刷新后无音频 | 添加 UI 提示 |
| 大音频内存占用 | 性能 | 考虑流式播放 |
| 并发播放冲突 | 用户体验 | ✅ 已用全局变量解决 |