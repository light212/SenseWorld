# SenseWorld 项目深度审查报告

## 审查时间
2026-03-28 22:30

## 一、关键问题 (P0)

### 1. API URL 硬编码
**问题**: 前端 13 处直接写 `localhost:8000`
**位置**:
- `app/chat/page.tsx` - 5 处
- `app/admin/page.tsx` - 1 处
- `app/login/page.tsx` - 1 处
- `components/chat/ChatWindow.tsx` - 2 处
- 其他 - 4 处

**解决方案**: 已创建 `lib/config.ts` 和 `lib/api-client.ts`，需替换所有硬编码

### 2. 消息状态不一致
**问题**: AI 消息 `extra_data` 部分为空，导致刷新后语音变文字
**原因**: 旧代码没有保存 `input_type`
**状态**: 已修复，新消息会保存 `input_type`

### 3. 全局音频状态冲突
**问题**: `VoiceMessageBubble` 用模块变量追踪播放状态
**影响**: 多个组件实例会冲突
**解决方案**: 改用 Context 或事件系统

## 二、架构问题 (P1)

### 1. API 调用不统一
- 11 处直接 `fetch`，不在 `services/` 目录
- 应统一使用 `services/api.ts` 或新建的 `lib/api-client.ts`

### 2. 状态管理混乱
- Zustand store + 组件 useState 混用
- 消息在 store 和组件 state 中都有存储
- 建议: 消息只在 store 中存储

### 3. 错误处理粗糙
- 24 处 `except Exception` 吞掉所有错误
- 用户看不到具体错误原因
- 建议: 细化错误类型，前端显示明确提示

## 三、代码质量 (P2)

### 1. 日志过多
- 前端: 108 处 `console.log`
- 后端: 70 处 `logger.*`
- 建议: 生产环境移除调试日志

### 2. 类型定义
- 1 处 e2e 测试类型错误
- 建议: 排除 e2e 目录或修复

## 四、修复优先级

### 立即修复 (今天)
1. [x] 创建统一 API 配置 `lib/config.ts`
2. [ ] 替换所有硬编码 URL
3. [ ] 移除 console.log
4. [ ] 精简后端日志

### 本周修复
1. [ ] 统一 API 调用方式
2. [ ] 改进错误处理
3. [ ] 添加音频播放 Context

### 持续改进
1. [ ] 添加单元测试
2. [ ] 添加集成测试
3. [ ] 性能优化 (虚拟列表已安装)

## 五、关键文件清单

### 需重构
- `frontend/src/app/chat/page.tsx` - 5 处硬编码
- `frontend/src/components/chat/ChatWindow.tsx` - 核心聊天逻辑
- `frontend/src/components/chat/MessageList.tsx` - 消息渲染

### 需优化
- `backend/app/api/v1/chat.py` - 流式处理逻辑
- `backend/app/services/tts_service.py` - TTS 服务

## 六、建议的下一步

1. **统一 API 调用**: 用 `lib/api-client.ts` 替换所有 fetch
2. **清理日志**: 移除 console.log，精简 logger
3. **测试核心流程**: 文字聊天 → 语音聊天 → 刷新 → 重播