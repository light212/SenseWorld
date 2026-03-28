# Feature Specification: Product-Grade UI/UX Redesign

**Feature Branch**: `005-ui-ux-redesign`
**Created**: 2025-01-27
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Polished Chat Experience (Priority: P1)

A consumer opens the app and sees a modern, professional chat interface with brand red accents and proper visual hierarchy.

**Why this priority**: First impression determines retention. Chat is the primary surface used every session.

**Independent Test**: Open `/chat`, send a message, receive a reply. Evaluate visual polish, brand consistency, input bar usability.

**Acceptance Scenarios**:

1. **Given** a user opens the chat page, **When** they view the interface, **Then** they see a light-mode layout with Plus Jakarta Sans font, brand red accents, and 8dp spacing rhythm
2. **Given** a user sends a message, **When** the AI responds, **Then** user bubble shows deep red gradient (`#DC2626`→`#991B1B`), AI bubble shows white card with subtle shadow
3. **Given** the sidebar, **When** a user hovers a conversation, **Then** delete icon appears; selected conversation shows red left border + `#FEF2F2` background
4. **Given** the input bar, **When** text is present, **Then** send button is brand red; when empty, mic button shows

---

### User Story 2 - Full-Screen Video Call Modal (Priority: P2)

Starting a video call opens a full-screen dark modal instead of the current inline strip, giving the video call a cinematic, focused experience.

**Why this priority**: Video call is a key differentiating feature. Full-screen treatment signals product maturity.

**Independent Test**: Click video call button, verify modal opens/closes with animation, verify all controls work.

**Acceptance Scenarios**:

1. **Given** a user clicks the video call button, **When** modal opens, **Then** full-screen dark overlay (`#0D1117`) appears with fade+scale animation (200ms)
2. **Given** video call is connecting, **When** status is 'connecting', **Then** pulsing yellow indicator and "连接中..." shown
3. **Given** video call is active and AI is speaking, **When** AI speaks, **Then** AI avatar (120px, red glow ring) shows animated sound waves
4. **Given** video call is active, **When** AI speaks, **Then** real-time transcript appears in frosted glass bar at bottom
5. **Given** user camera is on, **When** viewing modal, **Then** user video shows as 192×144px PiP in bottom-right corner
6. **Given** user clicks hang up, **When** call ends, **Then** modal closes with fade-out, chat returns to normal

---

### User Story 3 - Upgraded Conversation Sidebar (Priority: P3)

Sidebar shows message previews, timestamps, and supports real-time search.

**Why this priority**: Aids navigation and retention without blocking core usage.

**Independent Test**: Open sidebar, type in search box, verify list filters; verify each item shows preview + time.

**Acceptance Scenarios**:

1. **Given** multiple conversations exist, **When** viewing sidebar, **Then** each item shows title + last message preview (1 line truncated) + relative time
2. **Given** a user types in search, **When** typing, **Then** list filters client-side in real-time
3. **Given** a user hovers a conversation, **When** hovering, **Then** delete icon appears; hidden otherwise

---

### Edge Cases

- Mobile (375px): video call modal full-screen; sidebar collapses to existing drawer behavior
- No camera permission: show `VideoOff` placeholder in PiP
- Long titles: truncate with ellipsis
- `prefers-reduced-motion`: animations use opacity-only transitions
- All text meets WCAG 4.5:1 contrast in light mode

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Chat interface visually matches product-grade quality (brand color applied consistently across bubbles, buttons, sidebar)
- **SC-002**: Video call modal opens/closes with animation and all existing call functionality works unchanged
- **SC-003**: Sidebar search filters conversations client-side with no API calls
- **SC-004**: No regressions — existing text/voice/video call features continue to work

## Assumptions

- Tailwind CSS only — no new CSS-in-JS or component libraries
- Plus Jakarta Sans added via Google Fonts in `layout.tsx`
- All existing OmniClient/VAD/audio logic untouched
- Backend: zero changes required
- Out of scope: dark mode toggle, mobile restructuring, admin dashboard, new features

## Design Tokens

```
Brand gradient: #DC2626 → #991B1B
Page bg: #F9FAFB
Card bg: #FFFFFF
Muted bg: #F1F5F9
Text primary: #0F172A
Text secondary: #64748B
Border: #E2E8F0
Video modal bg: #0D1117
Font: Plus Jakarta Sans 400/600/700/800
Radius: sm=6 md=12 lg=16 xl=24 full=9999
Animation: 150-300ms ease-out
```

## Files to Modify

| File | Changes |
|------|---------|
| `frontend/src/app/layout.tsx` | Add Plus Jakarta Sans font |
| `frontend/src/app/chat/page.tsx` | Header brand styling |
| `frontend/src/components/chat/ConversationList.tsx` | Search box, message preview, relative time, hover-only delete |
| `frontend/src/components/chat/ChatWindow.tsx` | Replace inline video panel with full-screen modal; message bubble styles |
| `frontend/src/components/chat/CompactInputBar.tsx` | Redesign input bar with brand red buttons |
| `frontend/src/components/chat/MessageList.tsx` | Bubble spacing and style review |
