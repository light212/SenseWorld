# Implementation Plan: Product-Grade UI/UX Redesign

**Spec:** `specs/005-ui-ux-redesign/spec.md`
**Branch:** `005-ui-ux-redesign`
**Date:** 2025-01-27

## Design Tokens (Reference)

```
Brand primary:   #DC2626
Brand dark:      #991B1B
Page bg:         #F9FAFB
Card bg:         #FFFFFF
Muted bg:        #F1F5F9
Text primary:    #0F172A
Text secondary:  #64748B
Border:          #E2E8F0
Video modal bg:  #0D1117
Font:            Plus Jakarta Sans 400/600/700/800
Radius:          sm=6px md=12px lg=16px xl=24px
Animation:       150-300ms ease-out
```

## Files to Modify

| File | Change |
|------|--------|
| `frontend/src/app/layout.tsx` | Replace Inter with Plus Jakarta Sans |
| `frontend/src/app/globals.css` | Add CSS custom properties (design tokens) |
| `frontend/src/app/chat/page.tsx` | Header brand styling, sidebar background |
| `frontend/src/components/chat/ConversationList.tsx` | Add search, message preview, time, hover-delete |
| `frontend/src/components/chat/MessageList.tsx` | Update bubble colors (red brand), improve spacing |
| `frontend/src/components/chat/ChatWindow.tsx` | Extract video panel → VideoCallModal, update layout |
| `frontend/src/components/chat/CompactInputBar.tsx` | Redesign input bar, red video button |
| `frontend/src/components/chat/VideoCallModal.tsx` | NEW: full-screen modal component |

---

## Task 1 — Add Plus Jakarta Sans font

**File:** `frontend/src/app/layout.tsx`

1. Replace `import { Inter } from "next/font/google"` with `import { Plus_Jakarta_Sans } from "next/font/google"`
2. Replace font config:
   ```ts
   const plusJakartaSans = Plus_Jakarta_Sans({
     subsets: ["latin"],
     variable: "--font-sans",
     weight: ["400", "600", "700", "800"]
   });
   ```
3. Update `className` ref from `inter.variable` to `plusJakartaSans.variable`
4. Run `cd frontend && npm run build 2>&1 | tail -5` — expect no font errors
5. Commit: `style: switch font to Plus Jakarta Sans`

---

## Task 2 — Add CSS design tokens

**File:** `frontend/src/app/globals.css`

1. Add at the top of `:root`:
   ```css
   --brand: #DC2626;
   --brand-dark: #991B1B;
   --brand-gradient: linear-gradient(135deg, #DC2626, #991B1B);
   --bg-page: #F9FAFB;
   --bg-card: #FFFFFF;
   --bg-muted: #F1F5F9;
   --text-primary: #0F172A;
   --text-secondary: #64748B;
   --border: #E2E8F0;
   --modal-bg: #0D1117;
   --radius-sm: 6px;
   --radius-md: 12px;
   --radius-lg: 16px;
   ```
2. Verify file saves without syntax errors
3. Commit: `style: add design token CSS variables`

---

## Task 3 — Update chat page header & layout

**File:** `frontend/src/app/chat/page.tsx`

1. Read lines 240-310 (header section)
2. Change header background from `bg-white border-b` to `bg-white border-b border-gray-100 shadow-sm`
3. Add brand logo/name with red accent: wrap "SenseWorld" in a `<span>` with `style={{ background: 'var(--brand-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}`
4. Change logout button hover to `hover:text-red-600`
5. Change sidebar `bg-white` to `bg-gray-50/80`
6. Run dev server briefly and visually verify header looks correct
7. Commit: `style: update chat page header with brand colors`

---

## Task 4 — Redesign ConversationList with search & preview

**File:** `frontend/src/components/chat/ConversationList.tsx`

1. Add `searchQuery` state: `const [searchQuery, setSearchQuery] = useState("")`
2. Add filtered list: `const filtered = conversations.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))`
3. Add search input above the new-conversation button:
   ```tsx
   <div className="relative mb-3">
     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
     <input
       type="text"
       placeholder="搜索对话..."
       value={searchQuery}
       onChange={e => setSearchQuery(e.target.value)}
       className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/30 placeholder:text-gray-400"
     />
   </div>
   ```
4. Import `Search` from `lucide-react`
5. Update new-conversation button to use brand red gradient:
   ```tsx
   className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white mb-3"
   style={{ background: 'var(--brand-gradient)' }}
   ```
6. In the conversation item, add last-message preview (use `conversation.title` as placeholder if no `lastMessage` field — check the `Conversation` type first with `cat frontend/src/types/index.ts`)
7. Change selected item highlight from current style to: `bg-red-50 border-l-2 border-red-600`
8. Change delete button to only show on `group-hover`: add `group` to item wrapper, change delete button to `opacity-0 group-hover:opacity-100 transition-opacity`
9. Use `filtered` instead of `conversations` in the render loop
10. Run `cd frontend && npx tsc --noEmit 2>&1 | head -20` — fix any type errors
11. Commit: `feat: add search and improved conversation list UI`

---

## Task 5 — Update message bubbles with brand colors

**File:** `frontend/src/components/chat/MessageList.tsx`

1. Find user bubble className (line ~180): change `from-blue-500 to-purple-600` → `from-red-600 to-red-800` (matching brand gradient)
2. Find AI bubble className: change `bg-white border border-gray-200` → `bg-white border border-gray-100 shadow-sm` (subtle shadow upgrade)
3. Change loading skeleton `bg-gray-200` → `bg-gray-100`
4. Change page background `bg-gray-50` → `bg-[#F9FAFB]` (matches --bg-page token)
5. Run `cd frontend && npx tsc --noEmit 2>&1 | head -20`
6. Commit: `style: update message bubbles with brand red gradient`

---

## Task 6 — Create VideoCallModal component

**File:** `frontend/src/components/chat/VideoCallModal.tsx` (NEW)

This extracts the inline video panel from ChatWindow into a full-screen modal.

```tsx
"use client";
import { PhoneOff, Mic, MicOff, Video, VideoOff, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoCallModalProps {
  isOpen: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  isAiSpeaking: boolean;
  aiTranscript: string;
  videoCallStatus: 'connecting' | 'connected';
  isMicMuted: boolean;
  isCameraOff: boolean;
  onHangup: () => void;
  onToggleMic: () => void;
  onToggleCamera: () => void;
}
```

1. Create the file with the interface above
2. Implement as a fixed full-screen overlay (`fixed inset-0 z-50`) with:
   - Background: `bg-[#0D1117]` with subtle radial gradient red glow at top: `radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.15) 0%, transparent 60%)`
   - Entry animation: `animate-in fade-in zoom-in-95 duration-300` (if tailwindcss-animate available, else use inline style transition)
   - AI avatar section (top 55%): centered Bot icon w-28 h-28 with speaking ring animation, status badge, AI name
   - Subtitle bar: fixed to bottom of AI section, `bg-black/40 backdrop-blur-sm`, shows `aiTranscript` truncated to 2 lines
   - User camera PiP: `absolute bottom-28 right-6 w-36 h-28 rounded-2xl overflow-hidden ring-2 ring-white/20`
   - Control bar: `absolute bottom-8 left-0 right-0 flex justify-center gap-6`
     - Mic button: `w-14 h-14 rounded-full bg-white/10 hover:bg-white/20`
     - Hangup button: `w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 shadow-lg shadow-red-900/50`
     - Camera button: same as mic
3. The `<video>` element must always be rendered (not conditional) — use `className={cn("w-full h-full object-cover", isCameraOff && "hidden")}` pattern matching existing ChatWindow convention
4. Run `cd frontend && npx tsc --noEmit 2>&1 | head -20` — fix type errors
5. Commit: `feat: add VideoCallModal full-screen component`

---

## Task 7 — Integrate VideoCallModal into ChatWindow

**File:** `frontend/src/components/chat/ChatWindow.tsx`

1. Import `VideoCallModal` from `./VideoCallModal`
2. Remove the entire inline video panel block (lines ~540-670, the `{isVideoCallActive && ...}` section containing the horizontal strip)
3. Move `videoElementRef` to be passed to `VideoCallModal` instead
4. Add `VideoCallModal` just before the closing `</div>` of the component:
   ```tsx
   <VideoCallModal
     isOpen={isVideoCallActive}
     videoRef={videoElementRef}
     isAiSpeaking={isAiSpeaking}
     aiTranscript={aiTranscript}
     videoCallStatus={videoCallStatus}
     isMicMuted={isMicMuted}
     isCameraOff={isCameraOff}
     onHangup={() => handleVideoCallToggleRef.current?.()}
     onToggleMic={handleToggleMic}
     onToggleCamera={handleToggleCamera}
   />
   ```
5. Keep the hidden `<video>` element in ChatWindow only if VideoCallModal conditionally renders — verify the `videoElementRef` ref assignment works (ref must be attached to a DOM node that's always mounted when call is active)
6. Run `cd frontend && npx tsc --noEmit 2>&1 | head -20` — fix type errors
7. Start dev server: `cd frontend && npm run dev &` — open browser and test video call toggle
8. Commit: `refactor: replace inline video strip with VideoCallModal`

---

## Task 8 — Redesign CompactInputBar

**File:** `frontend/src/components/chat/CompactInputBar.tsx`

1. Read current file to understand full structure
2. Change outer container background: `bg-white border-t border-gray-100` → `bg-white border-t border-gray-100 px-4 py-3`
3. Change input field: `rounded-2xl` border to `rounded-full bg-gray-50 border border-gray-200 focus-within:border-red-300 focus-within:ring-2 focus-within:ring-red-500/20`
4. Change voice/send button gradient from `from-blue-500 to-purple-600` → use brand red: `style={{ background: 'var(--brand-gradient)' }}`
5. Change video call button:
   - When inactive: `bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600`
   - When active: `bg-red-600 text-white` (solid red, not gradient — clearly "in call")
6. Run `cd frontend && npx tsc --noEmit 2>&1 | head -20`
7. Commit: `style: redesign input bar with brand colors and red video button`

---

## Task 9 — Visual QA & polish

1. Run `cd frontend && npm run build 2>&1 | tail -20` — must pass with no errors
2. Start dev server: `cd frontend && npm run dev`
3. Check each view:
   - [ ] Header: brand red gradient on "SenseWorld" text
   - [ ] Sidebar: search box works, selected item