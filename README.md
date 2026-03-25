# SenseWorld 声视界

> 通过语音和视频实现 AI 与人的自然对话

## 项目愿景

打造多模态 AI 交互平台，让用户通过**语音**和**视频**（而非文字）与 AI 进行自然对话。

## 核心能力

```
┌─────────────────────────────────────────────────────────┐
│                    多模态交互层                          │
├─────────────────────────────────────────────────────────┤
│  用户语音 → [ASR] → 文本 → [LLM] → 文本 → [TTS] → AI语音  │
│                                                         │
│  用户视频 → [视觉理解] → 上下文 ─┘                        │
└─────────────────────────────────────────────────────────┘
                          ↓
              ┌──────────────────────┐
              │   业务能力层          │
              │  (MCP / API / RAG)   │
              └──────────────────────┘
```

## 应用场景

| 场景 | 描述 |
|------|------|
| **网站 AI 助手** | 基于网站内容（文章/图片/视频）回答用户问题 |
| **酒店预定 MCP** | 通用 Agent 接口，语音完成酒店预定 |
| **管理后台 AI** | 语音指令操作后台系统 |

## 技术架构

### 已验证的技术栈

| 组件 | 方案 | 说明 |
|------|------|------|
| **ASR** | faster-whisper (small) | 语音转文字，本地 CPU 运行 |
| **LLM** | LiteLLM → Claude | 理解 + 生成 |
| **TTS** | edge-tts | 文字转语音，微软云免费 |
| **视觉** | TBD (Qwen-VL / GPT-4V) | 视频/图像理解 |

### 完整链路（已跑通）

```python
用户语音 → ASR(whisper) → LLM(Claude) → TTS(edge) → AI语音
```

## 产品化路线

### 阶段 1：Web MVP
- [ ] 后端 API（FastAPI + WebSocket）
- [ ] Web 前端（React）
- [ ] 流式 ASR（VAD + Whisper）
- [ ] 流式 TTS
- [ ] 多轮对话记忆

### 阶段 2：iOS App
- [ ] 原生音频采集
- [ ] 复用后端 API
- [ ] 体验优化（延迟 <500ms）

### 阶段 3：视频理解
- [ ] 视频帧抽取 + 视觉模型
- [ ] 实时视频流处理

## 关键指标

| 指标 | 目标 |
|------|------|
| 端到端延迟 | < 500ms（MVP）→ < 300ms（优化后） |
| ASR 准确率 | > 95% |
| 并发支持 | 多用户同时使用 |

## 项目结构

```
SenseWorld/
├── backend/          # Python 后端
│   ├── api/          # FastAPI 接口
│   ├── asr/          # 语音识别模块
│   ├── tts/          # 语音合成模块
│   └── llm/          # LLM 调用模块
├── frontend/         # Web 前端
├── mobile/           # iOS App（后续）
├── models/           # 本地模型文件
└── docs/             # 文档
```

## 快速开始

### 环境要求

- Python >= 3.11
- Node.js >= 18（前端）

### 安装依赖

```bash
# 后端
cd backend
pip install faster-whisper edge-tts openai

# 下载 ASR 模型
python -c "from huggingface_hub import snapshot_download; snapshot_download('Systran/faster-whisper-small', local_dir='../models/whisper-small')"
```

### 运行示例

```python
# voice_chat.py - 完整链路示例
import asyncio
import edge_tts
from faster_whisper import WhisperModel
from openai import OpenAI

# ASR
model = WhisperModel("./models/whisper-small", device="cpu", compute_type="int8")
segments, info = model.transcribe("input.mp3")
user_text = "".join([seg.text for seg in segments])

# LLM
client = OpenAI(base_url="YOUR_LLM_URL", api_key="YOUR_KEY")
response = client.chat.completions.create(
    model="claude-sonnet-4-20250514",
    messages=[{"role": "user", "content": user_text}]
)
ai_text = response.choices[0].message.content

# TTS
async def tts():
    communicate = edge_tts.Communicate(ai_text, "zh-CN-XiaoxiaoNeural")
    await communicate.save("output.mp3")
asyncio.run(tts())
```

## 参考资料

- [faster-whisper](https://github.com/SYSTRAN/faster-whisper)
- [edge-tts](https://github.com/rany2/edge-tts)
- [多模态 AI 对话研究报告](docs/ai-audio-video.html)

## License

MIT
