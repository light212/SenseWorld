# Tasks: 多模态 AI 对话平台

**Input**: Design documents from `/specs/001-multimodal-ai-chat/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US7)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure per implementation plan (backend/, frontend/)
- [ ] T002 Initialize Python backend with FastAPI, Pydantic, SQLAlchemy in backend/pyproject.toml
- [ ] T003 [P] Initialize Next.js 14 frontend with React 18, TypeScript, Tailwind in frontend/package.json
- [ ] T004 [P] Configure backend linting (ruff) and formatting (black) in backend/pyproject.toml
- [ ] T005 [P] Configure frontend linting (ESLint) and formatting (Prettier) in frontend/.eslintrc.json
- [ ] T006 Create Docker Compose for local development (PostgreSQL, Redis) in docker-compose.yml
- [ ] T007 [P] Create environment configuration templates in backend/.env.example, frontend/.env.example

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database & Models

- [ ] T008 Create SQLAlchemy base model and database connection in backend/app/core/database.py
- [ ] T009 [P] Create User model in backend/app/models/user.py
- [ ] T010 [P] Create Conversation model in backend/app/models/conversation.py
- [ ] T011 [P] Create Message model in backend/app/models/message.py
- [ ] T012 Create Alembic migration for initial schema in backend/alembic/versions/001_initial.py
- [ ] T013 Create Pydantic schemas for User, Conversation, Message in backend/app/schemas/

### Authentication

- [ ] T014 Implement JWT authentication utilities in backend/app/core/security.py
- [ ] T015 [P] Create auth API endpoints (register, login, logout, me) in backend/app/api/v1/auth.py
- [ ] T016 [P] Create authentication middleware/dependency in backend/app/core/auth.py

### API Infrastructure

- [ ] T017 Create FastAPI app factory and router setup in backend/app/main.py
- [ ] T018 [P] Create unified error handling middleware in backend/app/core/errors.py
- [ ] T019 [P] Create API response wrappers in backend/app/schemas/response.py
- [ ] T020 Create Redis connection and cache utilities in backend/app/core/cache.py

### Frontend Infrastructure

- [ ] T021 Create API client with authentication in frontend/src/services/api.ts
- [ ] T022 [P] Create auth service (login, register, logout) in frontend/src/services/authService.ts
- [ ] T023 [P] Create auth context and hooks in frontend/src/contexts/AuthContext.tsx
- [ ] T024 Create layout components (Header, Sidebar, MainLayout) in frontend/src/components/layout/
- [ ] T025 [P] Create protected route wrapper in frontend/src/components/auth/ProtectedRoute.tsx

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 语音对话交互 (Priority: P1) 🎯 MVP

**Goal**: 用户通过语音与 AI 进行自然对话，无需打字输入

**Independent Test**: 用户点击开始对话按钮，说出问题，听到 AI 的语音回复

### Backend - ASR Service

- [ ] T026 [P] [US1] Create faster-whisper ASR service in backend/app/services/asr_service.py
- [ ] T027 [US1] Add ASR configuration (model size, device, language) in backend/app/core/config.py

### Backend - LLM Service

- [ ] T028 [P] [US1] Create LiteLLM service for Claude in backend/app/services/llm_service.py
- [ ] T029 [US1] Add LLM configuration (model, api_key, streaming) in backend/app/core/config.py

### Backend - TTS Service

- [ ] T030 [P] [US1] Create edge-tts TTS service in backend/app/services/tts_service.py
- [ ] T031 [US1] Add TTS configuration (voice, rate, format) in backend/app/core/config.py

### Backend - WebSocket

- [ ] T032 [US1] Create WebSocket connection handler in backend/app/api/websocket.py
- [ ] T033 [US1] Implement WebSocket authentication (JWT token validation) in backend/app/api/websocket.py
- [ ] T034 [US1] Implement audio chunk receiving and buffering in backend/app/api/websocket.py
- [ ] T035 [US1] Implement ASR → LLM → TTS pipeline orchestration in backend/app/services/conversation_service.py
- [ ] T036 [US1] Implement streaming LLM output via WebSocket in backend/app/api/websocket.py
- [ ] T037 [US1] Implement streaming TTS audio via WebSocket in backend/app/api/websocket.py

### Backend - REST API

- [ ] T038 [P] [US1] Create conversation API endpoints (create, get, list) in backend/app/api/v1/conversation.py
- [ ] T039 [P] [US1] Create message API endpoints (send text, list) in backend/app/api/v1/message.py

### Frontend - Voice Recording

- [ ] T040 [US1] Create useVoiceRecorder hook with MediaRecorder API in frontend/src/hooks/useVoiceRecorder.ts
- [ ] T041 [US1] Create audio waveform visualization component in frontend/src/components/chat/AudioWaveform.tsx
- [ ] T042 [US1] Create voice input button component in frontend/src/components/chat/VoiceInput.tsx

### Frontend - WebSocket

- [ ] T043 [US1] Create useWebSocket hook with reconnection logic in frontend/src/hooks/useWebSocket.ts
- [ ] T044 [US1] Implement audio chunk streaming in frontend/src/hooks/useVoiceRecorder.ts

### Frontend - Chat UI

- [ ] T045 [US1] Create ChatWindow main component in frontend/src/components/chat/ChatWindow.tsx
- [ ] T046 [P] [US1] Create MessageList component in frontend/src/components/chat/MessageList.tsx
- [ ] T047 [P] [US1] Create MessageItem component in frontend/src/components/chat/MessageItem.tsx
- [ ] T048 [US1] Create useConversation hook for state management in frontend/src/hooks/useConversation.ts

### Frontend - Audio Playback

- [ ] T049 [US1] Create useAudioPlayer hook with Web Audio API in frontend/src/hooks/useAudioPlayer.ts
- [ ] T050 [US1] Create AudioPlayer component with play/stop controls in frontend/src/components/chat/AudioPlayer.tsx

### Frontend - Pages

- [ ] T051 [US1] Create chat page in frontend/src/app/chat/page.tsx
- [ ] T052 [US1] Create login page in frontend/src/app/(auth)/login/page.tsx
- [ ] T053 [US1] Create register page in frontend/src/app/(auth)/register/page.tsx

**Checkpoint**: User Story 1 complete - basic voice conversation works end-to-end

---

## Phase 4: User Story 2 - 流式实时响应 (Priority: P1) 🎯 MVP

**Goal**: AI 回复实时流式显示和播放，减少等待时间

**Independent Test**: 用户发送长问题，观察文字逐字显示、语音边生成边播放

### Backend - Streaming

- [ ] T054 [US2] Implement sentence-based chunking for TTS in backend/app/services/tts_service.py
- [ ] T055 [US2] Add streaming progress indicators in WebSocket messages in backend/app/api/websocket.py
- [ ] T056 [US2] Implement network interruption recovery (message queue) in backend/app/api/websocket.py

### Frontend - Streaming Display

- [ ] T057 [US2] Create StreamingText component for incremental text display in frontend/src/components/chat/StreamingText.tsx
- [ ] T058 [US2] Implement streaming audio playback with MediaSource Extensions in frontend/src/hooks/useAudioPlayer.ts
- [ ] T059 [US2] Add loading states and progress indicators in frontend/src/components/chat/ChatWindow.tsx

**Checkpoint**: User Story 2 complete - streaming works smoothly

---

## Phase 5: User Story 6 - 多轮对话上下文 (Priority: P1) 🎯 MVP

**Goal**: AI 记住对话上下文，多轮对话保持连贯

**Independent Test**: 用户进行 5 轮以上对话，AI 能理解引用前文的问题

### Backend - Context Management

- [ ] T060 [US6] Implement conversation context caching in Redis in backend/app/services/conversation_service.py
- [ ] T061 [US6] Create context window management (keep last N messages) in backend/app/services/llm_service.py
- [ ] T062 [US6] Add system prompt configuration in backend/app/core/config.py
- [ ] T063 [US6] Implement conversation isolation (no cross-conversation context) in backend/app/services/conversation_service.py

### Backend - Message Persistence

- [ ] T064 [US6] Save user and assistant messages to database in backend/app/services/conversation_service.py
- [ ] T065 [US6] Update conversation last_message_at and message_count in backend/app/services/conversation_service.py

**Checkpoint**: User Story 6 complete - multi-turn context works

---

## Phase 6: User Story 3 - 文字输入备选 (Priority: P2)

**Goal**: 用户可以打字输入，选择文字或语音回复

**Independent Test**: 用户打字发送消息，选择播放语音或仅查看文字

### Frontend - Text Input

- [ ] T066 [US3] Create TextInput component in frontend/src/components/chat/TextInput.tsx
- [ ] T067 [US3] Add text input mode toggle in ChatWindow in frontend/src/components/chat/ChatWindow.tsx
- [ ] T068 [US3] Create reply mode selector (text/voice) in frontend/src/components/chat/ReplyModeSelector.tsx
- [ ] T069 [US3] Implement text message sending via WebSocket in frontend/src/hooks/useConversation.ts

**Checkpoint**: User Story 3 complete - text input works with voice option

---

## Phase 7: User Story 5 - 首次使用引导 (Priority: P2)

**Goal**: 新用户获得清晰的麦克风授权引导

**Independent Test**: 新注册用户完成引导流程并成功进行一次语音对话

### Frontend - Onboarding

- [ ] T070 [US5] Create MicrophonePermission component with guide in frontend/src/components/onboarding/MicrophonePermission.tsx
- [ ] T071 [US5] Create onboarding tutorial overlay in frontend/src/components/onboarding/TutorialOverlay.tsx
- [ ] T072 [US5] Create permission denied fallback UI in frontend/src/components/onboarding/PermissionDenied.tsx
- [ ] T073 [US5] Add first-time user detection in frontend/src/hooks/useOnboarding.ts
- [ ] T074 [US5] Store onboarding completion status in user preferences in frontend/src/services/authService.ts

**Checkpoint**: User Story 5 complete - new users get proper guidance

---

## Phase 8: User Story 7 - 错误恢复与重试 (Priority: P2)

**Goal**: 用户可以修正识别错误或重新录制

**Independent Test**: 用户说完后发现识别错误，点击重录或手动编辑

### Frontend - Error Recovery

- [ ] T075 [US7] Add edit mode for transcribed text in frontend/src/components/chat/TranscribedText.tsx
- [ ] T076 [US7] Add re-record button in VoiceInput component in frontend/src/components/chat/VoiceInput.tsx
- [ ] T077 [US7] Add cancel recording button in frontend/src/components/chat/VoiceInput.tsx
- [ ] T078 [US7] Implement ASR confidence display in frontend/src/components/chat/TranscribedText.tsx

### Backend - Error Handling

- [ ] T079 [US7] Add graceful degradation for ASR/TTS failures in backend/app/services/conversation_service.py
- [ ] T080 [US7] Add error messages with suggestions in backend/app/api/websocket.py

**Checkpoint**: User Story 7 complete - error recovery works

---

## Phase 9: User Story 4 - 对话历史管理 (Priority: P2)

**Goal**: 用户可以查看和管理对话历史

**Independent Test**: 用户查看对话列表，点击历史对话，创建新对话

### Backend - History API

- [ ] T081 [P] [US4] Add conversation list endpoint with pagination in backend/app/api/v1/conversation.py
- [ ] T082 [P] [US4] Add conversation delete endpoint in backend/app/api/v1/conversation.py
- [ ] T083 [US4] Add soft delete support in Conversation model in backend/app/models/conversation.py

### Frontend - History UI

- [ ] T084 [US4] Create ConversationList component in frontend/src/components/chat/ConversationList.tsx
- [ ] T085 [US4] Create ConversationItem component with delete in frontend/src/components/chat/ConversationItem.tsx
- [ ] T086 [US4] Create new conversation button and logic in frontend/src/components/chat/NewConversationButton.tsx
- [ ] T087 [US4] Add conversation switching in ChatWindow in frontend/src/components/chat/ChatWindow.tsx

**Checkpoint**: User Story 4 complete - conversation history management works

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### Performance

- [ ] T088 [P] Add database connection pooling configuration in backend/app/core/database.py
- [ ] T089 [P] Add Redis connection pooling in backend/app/core/cache.py
- [ ] T090 Add request rate limiting in backend/app/middleware/rate_limit.py

### Security

- [ ] T091 [P] Add CORS configuration in backend/app/main.py
- [ ] T092 [P] Add input validation and sanitization in backend/app/schemas/
- [ ] T093 Add security headers middleware in backend/app/middleware/security.py

### Monitoring

- [ ] T094 [P] Add logging configuration in backend/app/core/logging.py
- [ ] T095 [P] Add health check endpoint in backend/app/api/health.py
- [ ] T096 Add error tracking (Sentry integration) in backend/app/main.py

### Documentation

- [ ] T097 [P] Create API documentation (OpenAPI) in backend/app/main.py
- [ ] T098 [P] Create README with setup instructions in README.md
- [ ] T099 Validate quickstart.md scenarios work end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-9)**: All depend on Foundational phase completion
  - US1, US2, US6 (MVP) should be completed first in order
  - US3, US5, US7, US4 can proceed after MVP or in parallel
- **Polish (Phase 10)**: Depends on MVP user stories being complete

### User Story Dependencies

- **User Story 1 (US1)**: No dependencies - foundation for all others
- **User Story 2 (US2)**: Depends on US1 (builds on streaming infrastructure)
- **User Story 6 (US6)**: Depends on US1 (builds on conversation infrastructure)
- **User Story 3 (US3)**: Depends on US1 (alternative input mode)
- **User Story 5 (US5)**: Depends on US1 (onboarding for voice)
- **User Story 7 (US7)**: Depends on US1 (error recovery for voice)
- **User Story 4 (US4)**: Depends on US1 (conversation management)

### Parallel Opportunities

Within each phase, tasks marked [P] can run in parallel:
- All model creation tasks (T009-T011)
- All service creation tasks (T026, T028, T030)
- All component creation tasks in different files

---

## Implementation Strategy

### MVP First (Phase 1-5)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Voice conversation)
4. Complete Phase 4: User Story 2 (Streaming)
5. Complete Phase 5: User Story 6 (Multi-turn context)
6. **STOP and VALIDATE**: Test MVP independently
7. Deploy MVP for early testing

### Full Feature (Phase 6-10)

8. Add User Story 3, 5, 7 (Text input, Onboarding, Error recovery)
9. Add User Story 4 (Conversation history)
10. Polish phase for production readiness

---

## Summary

| Metric | Count |
|--------|-------|
| Total Tasks | 99 |
| MVP Tasks (Phase 1-5) | 65 |
| P2 Tasks (Phase 6-9) | 23 |
| Polish Tasks (Phase 10) | 12 |
| Parallel Opportunities | 38 |

| User Story | Tasks | Priority |
|------------|-------|----------|
| US1 - 语音对话交互 | 28 | P1 (MVP) |
| US2 - 流式实时响应 | 6 | P1 (MVP) |
| US6 - 多轮对话上下文 | 6 | P1 (MVP) |
| US3 - 文字输入备选 | 4 | P2 |
| US5 - 首次使用引导 | 5 | P2 |
| US7 - 错误恢复与重试 | 6 | P2 |
| US4 - 对话历史管理 | 7 | P2 |