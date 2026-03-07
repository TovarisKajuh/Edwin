# Edwin Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build Edwin's foundation — soul, brain, memory, voice, chat, dashboard, morning briefing — so Jan wakes up to Edwin's voice every morning, talks to him throughout the day, and feels like someone has his back.

**Architecture:** Monorepo (pnpm workspaces) with Next.js frontend (Vercel) and Fastify backend (Railway). Edwin's soul drives every interaction through a brain pipeline (perceive -> reason -> decide -> act). Memory is SQLite with 3-tier knowledge system. Voice is bidirectional (ElevenLabs TTS + Web Speech API STT).

**Tech Stack:** TypeScript, Next.js 15, Tailwind CSS v4, Fastify, better-sqlite3, @anthropic-ai/sdk, ElevenLabs API, Vitest, pnpm workspaces

**Pre-requisites:**
- Node.js v22+ installed
- pnpm installed (`npm install -g pnpm`)
- Claude API key (from console.anthropic.com)
- ElevenLabs API key (from elevenlabs.io)

---

### Task 1: Monorepo Scaffolding

**Goal:** Set up the pnpm workspace monorepo with all three packages wired together.

**Files:**
- Create: `package.json` (root)
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/constants.ts`
- Create: `apps/server/package.json`
- Create: `apps/server/tsconfig.json`
- Create: `apps/server/src/index.ts`
- Create: `apps/web/` (via create-next-app)

**Step 1: Initialize root workspace**

Root package.json with scripts: dev, dev:server, dev:web, build, test.
pnpm-workspace.yaml pointing to apps/* and packages/*.
tsconfig.base.json with strict TypeScript config (ES2022, bundler resolution).
.gitignore for node_modules, dist, .next, *.db, .env.

**Step 2: Create shared package**

@edwin/shared with shared types:
- Message, Conversation, ChatRequest, ChatResponse, VoiceRequest, VoiceResponse
- BriefingResponse, DashboardData, WeatherData, ScheduleItem, PendingAction
- Type aliases: Source, StakesLevel, Channel, TimeOfDay, DayType
- Constants: EDWIN.NAME, EDWIN.HONORIFIC ("sir"), EDWIN.DEFAULT_WAKE_TIME, EDWIN.DEFAULT_TIMEZONE

**Step 3: Create backend package**

@edwin/server with Fastify, better-sqlite3, @anthropic-ai/sdk, node-cron, dotenv.
Dev dependency: tsx for watch mode.
Basic server with health endpoint returning `{ status: "ok", name: "Edwin", alive: true }`.

**Step 4: Create frontend**

Run create-next-app for apps/web with TypeScript, Tailwind, App Router.
Add @edwin/shared as workspace dependency.

**Step 5: Install and verify**

`pnpm install` at root.
`pnpm dev:server` — server starts on port 3001.
`pnpm dev:web` — Next.js starts on port 3000.

**Step 6: Commit**

"feat: initialize Edwin monorepo with server, web, and shared packages"

---

### Task 2: SQLite Database and Schema

**Goal:** Set up SQLite with all tables for Edwin's 3-tier memory system.

**Files:**
- Create: `apps/server/src/db/database.ts`
- Create: `apps/server/src/db/schema.ts`
- Create: `apps/server/src/db/__tests__/database.test.ts`
- Create: `apps/server/vitest.config.ts`

**Step 1: Write failing test**

Test that Database class initializes all 10 tables (identity, people, items, bills, routines, observations, conversations, messages, weekly_summaries, scheduled_actions).
Test insert/retrieve on identity table.
Test insert/retrieve on conversations + messages with foreign key.

**Step 2: Implement schema.ts**

Full SQL schema as defined in the design doc. All CREATE TABLE IF NOT EXISTS statements.
Indexes on identity(category), messages(conversation_id), observations(category), scheduled_actions(status).

**Step 3: Implement database.ts**

Database class wrapping better-sqlite3. Constructor takes path (default ./data/edwin.db).
Sets WAL journal mode and foreign keys pragma.
Runs schema on initialization.
Exposes raw() for direct access and close().

**Step 4: Run tests — all pass**

**Step 5: Commit**

"feat: add SQLite database with 3-tier memory schema"

---

### Task 3: Edwin's Soul

**Goal:** Implement Edwin's soul — identity, personality, motivators, boundaries, and the dynamic prompt builder.

**Files:**
- Create: `apps/server/src/soul/identity.ts`
- Create: `apps/server/src/soul/personality.ts`
- Create: `apps/server/src/soul/motivators.ts`
- Create: `apps/server/src/soul/boundaries.ts`
- Create: `apps/server/src/soul/voice-profiles.ts`
- Create: `apps/server/src/soul/prompt-builder.ts`
- Create: `apps/server/src/soul/__tests__/personality.test.ts`
- Create: `apps/server/src/soul/__tests__/prompt-builder.test.ts`

**Step 1: Write failing tests**

Personality tests: getTimeOfDay returns correct TimeOfDay for different hours. getDayType returns correct DayType. getTone returns high energy + motivating for early_morning weekday, low energy + gentle for sunday, low + gentle for night.

Prompt builder tests: buildSystemPrompt always includes "Edwin", "sir", "Jan". Adapts tone for sunday (contains "gentle"). Includes morning energy on weekday mornings. Includes memory context when provided.

**Step 2: Implement identity.ts**

EDWIN_IDENTITY constant with: name, role, createdFor, honorific, origin, coreBeliefs array, relationship object (nature, loyalty, warmth, address), janProfile (location, business, coreStruggle, distractions), vision (netWorth, companyRevenue, timeline, lifestyle, personal).

**Step 3: Implement personality.ts**

getTimeOfDay(hour, minute) -> TimeOfDay. 5-6 early_morning, 7-11 morning, 12-16 afternoon, 17-20 evening, 21-4 night.
getDayType(dayOfWeek) -> DayType. 0=sunday, 6=saturday, rest=weekday.
getTone(timeOfDay, dayType) -> Tone. Returns energy (high/medium/low), style (motivating/present/gentle), description.
Sunday always returns gentle. Night always returns gentle.
getToneDirective() returns formatted string for prompt.

**Step 4: Implement motivators.ts**

MOTIVATORS array with name, effectiveness, description, examplePhrases, useWhen, neverUseWhen.
Strong motivators: accountability, competition, guilt, real_consequences, encouragement.
WEAK_MOTIVATORS: fake_urgency, generic_inspiration, deadlines_without_consequences.
getMotivatorDirective() returns formatted string.

**Step 5: Implement boundaries.ts**

BOUNDARIES array of situation/action pairs. Covers: "not right now", cooking, park, with people, sunday, late night, just woke up, stressed.
STAKES_RULES: low (propose almost assume yes), medium (propose wait for yes), high (initiate conversation wait for auth).
getBoundariesDirective() returns formatted string.

**Step 6: Implement voice-profiles.ts**

VOICE_PROFILES array. Phase 1: only "butler" profile (calm, dignified, British, Alfred voice).
getActiveVoice() returns butler profile.

**Step 7: Implement prompt-builder.ts**

buildSystemPrompt(ctx: PromptContext) -> string.
Composes full system prompt from: identity (who Edwin is, relationship, Jan's situation, vision), tone directive, motivator directive, boundaries directive, speech rules ("always say sir", never break character, British English), memory snapshot, recent context.

**Step 8: Run tests — all pass**

**Step 9: Commit**

"feat: implement Edwin's soul — identity, personality, motivators, boundaries, prompt builder"

---

### Task 4: Memory System

**Goal:** Implement memory store (CRUD for all tables), memory snapshots for prompt context, and seed Jan's profile.

**Files:**
- Create: `apps/server/src/memory/store.ts`
- Create: `apps/server/src/memory/seed/jan-profile.ts`
- Create: `apps/server/src/memory/__tests__/store.test.ts`

**Step 1: Write failing tests**

Test setIdentity and getIdentity. Test update (upsert) on existing identity. Test getIdentityCategory returns all facts. Test addObservation and getRecentObservations. Test buildMemorySnapshot includes identity facts and recent observations. Test seedJanProfile populates identity table.

**Step 2: Implement store.ts**

MemoryStore class wrapping Database. Methods:
- Identity: setIdentity (upsert), getIdentity, getIdentityCategory, getAllIdentity
- Observations: addObservation, getRecentObservations (with days filter and expiry check)
- Conversations: startConversation, endConversation, addMessage, getMessages, getRecentMessages, getActiveConversation
- buildMemorySnapshot(): groups identity by category, includes recent observations with confidence markers, returns formatted string

**Step 3: Implement seed/jan-profile.ts**

seedJanProfile(store) populates identity table with all known facts about Jan:
- Goals: net_worth, revenue, physical, properties, car, sailboat, family, network, edwin
- Personal: location, timezone, wake_time
- Business: type, duration, role, employees, model
- Personality: core_struggle, strong_motivators (5), weak_motivators (2), distraction
- Habits: sleep, gym, eating, money, admin, apartment, restocking, social, grooming, bills
- Priorities: most_urgent, approach

**Step 4: Run tests — all pass**

**Step 5: Commit**

"feat: implement memory store with CRUD, snapshot builder, and Jan's seed profile"

---

### Task 5: Brain Pipeline

**Goal:** Implement the thinking pipeline: build context -> compose prompt -> call Claude API -> return response.

**Files:**
- Create: `apps/server/src/brain/context.ts`
- Create: `apps/server/src/brain/reasoning.ts`
- Create: `apps/server/src/brain/pipeline.ts`
- Create: `apps/server/src/brain/__tests__/pipeline.test.ts`

**Step 1: Write failing test (mock Claude API)**

Mock reasoning.ts callClaude to return a test response containing "sir".
Test pipeline.process() returns message and conversationId.
Test that messages are stored in conversation history (jan's message + edwin's response).

**Step 2: Implement context.ts**

buildContext(store, conversationId?) -> BrainContext.
Gets current time -> timeOfDay + dayType from personality module.
Gets memorySnapshot from store.
Gets conversation history if conversationId provided.
Gets recent messages across all conversations for context.

**Step 3: Implement reasoning.ts**

callClaude(systemPrompt, messages) -> string.
Uses @anthropic-ai/sdk. Creates Anthropic client (lazy singleton).
Calls messages.create with claude-sonnet-4-20250514, max_tokens 1024.
Returns text content or fallback: "I seem to have lost my words, sir."

**Step 4: Implement pipeline.ts**

BrainPipeline class with MemoryStore dependency.
process(userMessage, channel, existingConversationId?) -> PipelineResponse:
1. Get or create conversation
2. Store Jan's message
3. Build context
4. Build system prompt (soul)
5. Format conversation history for Claude (jan->user, edwin->assistant)
6. Call Claude
7. Store Edwin's response
8. Return message + conversationId

generateBriefing() -> string:
Builds context, composes prompt, asks Claude for morning briefing (greeting, day context, motivating thought, one focus item, under 100 words).

**Step 5: Run tests — all pass**

**Step 6: Commit**

"feat: implement brain pipeline — context builder, Claude API reasoning, thinking loop"

---

### Task 6: Voice System (TTS)

**Goal:** Implement ElevenLabs TTS so Edwin can speak.

**Files:**
- Create: `apps/server/src/voice/speak.ts`
- Create: `apps/server/src/voice/__tests__/speak.test.ts`

**Step 1: Write failing test (mock fetch)**

Mock global fetch to return ArrayBuffer. Test textToSpeech returns ArrayBuffer with content. Test fetch is called with ElevenLabs API URL and xi-api-key header.

**Step 2: Implement speak.ts**

textToSpeech(text) -> ArrayBuffer.
Calls ElevenLabs API v1/text-to-speech/{voiceId}.
Uses eleven_multilingual_v2 model.
Voice settings: stability 0.6, similarity_boost 0.75, style 0.3, use_speaker_boost true.
Returns audio as ArrayBuffer.
Throws on missing API key or API error.

**Step 3: Run tests — pass**

**Step 4: Commit**

"feat: implement ElevenLabs TTS — Edwin can speak"

---

### Task 7: API Routes

**Goal:** Wire up HTTP endpoints: chat, voice, briefing, dashboard.

**Files:**
- Create: `apps/server/src/routes/chat.ts`
- Create: `apps/server/src/routes/voice.ts`
- Create: `apps/server/src/routes/briefing.ts`
- Create: `apps/server/src/routes/dashboard.ts`
- Modify: `apps/server/src/index.ts`

**Step 1: Implement chat route**

POST /api/chat — accepts ChatRequest, runs pipeline.process(), optionally generates TTS audio (base64 encoded), returns ChatResponse with message, conversationId, audioUrl.

**Step 2: Implement voice route**

POST /api/voice — accepts VoiceRequest (transcript + conversationId), runs pipeline.process(), generates TTS, returns audio as binary with message and conversationId in response headers.

**Step 3: Implement briefing route**

GET /api/briefing — calls pipeline.generateBriefing(), generates TTS, returns { text, audio (base64) }.

**Step 4: Implement dashboard route**

GET /api/dashboard — returns DashboardData with time-appropriate greeting ("sir"), formatted date, empty schedule and pendingActions for now.

**Step 5: Wire into server index.ts**

Full server setup: Database -> MemoryStore -> seed if empty -> BrainPipeline -> register all routes -> health endpoint -> start listening.

**Step 6: Commit**

"feat: add API routes — chat, voice, briefing, dashboard"

---

### Task 8: Frontend Foundation and Layout

**Goal:** App shell with bottom nav (mobile), sidebar (desktop), dark theme, dashboard page.

**Files:**
- Modify: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/components/layout/app-shell.tsx`
- Create: `apps/web/components/layout/nav.tsx`
- Create: `apps/web/lib/api.ts`
- Create: `apps/web/.env.local`

**Step 1: Create API client**

lib/api.ts with functions: sendMessage, sendVoice, getDashboard, getBriefing. All calling the backend API.

**Step 2: Create navigation**

BottomNav (mobile, fixed bottom, three items: Dashboard/Chat/Voice).
Sidebar (desktop, fixed left, 264px wide, Edwin branding + nav items).
Active state highlighted with amber-400.

**Step 3: Create app shell**

AppShell component: Sidebar + main content (offset for sidebar on desktop) + BottomNav.
Dark theme: zinc-950 background, zinc-100 text.

**Step 4: Create dashboard page**

Fetches dashboard data on mount. Shows greeting, date, schedule section, pending actions section. Empty states: "No scheduled items yet, sir." / "All clear for now, sir."

**Step 5: Update root layout**

Dark theme, Inter font, PWA metadata, viewport config.

**Step 6: Commit**

"feat: frontend foundation — app shell, navigation, dashboard page, API client"

---

### Task 9: Chat Interface

**Goal:** WhatsApp-like chat where Edwin and Jan converse. Edwin's messages play audio.

**Files:**
- Create: `apps/web/app/chat/page.tsx`
- Create: `apps/web/components/chat/message-bubble.tsx`
- Create: `apps/web/components/chat/chat-input.tsx`
- Create: `apps/web/hooks/use-audio.ts`

**Step 1: Audio playback hook**

useAudio() — plays audio from data URL, stops previous audio.

**Step 2: Message bubble**

Edwin messages: left-aligned, zinc-800 bg, amber label. Jan messages: right-aligned, amber-600 bg. Timestamps formatted HH:MM.

**Step 3: Chat input**

Textarea with Enter-to-send (Shift+Enter for newline). Send button. Disabled state when loading.

**Step 4: Chat page**

Message list with auto-scroll. Conversation state tracking. Sends message via API, displays response, plays audio automatically. Loading state: "Edwin is thinking..." Error fallback message.

**Step 5: Commit**

"feat: chat interface — message bubbles, input, audio playback, conversation flow"

---

### Task 10: Voice Call Screen

**Goal:** Bidirectional voice conversation screen. The most important surface.

**Files:**
- Create: `apps/web/app/voice/page.tsx`
- Create: `apps/web/hooks/use-speech-recognition.ts`
- Create: `apps/web/components/voice/call-screen.tsx`

**Step 1: Speech recognition hook**

useSpeechRecognition({ language, onResult }). Uses Web Speech API (with webkit prefix fallback). Returns: listening, transcript, supported, start, stop.

**Step 2: Call screen component**

States: idle, listening, processing, speaking.
Pre-call view: Edwin avatar (amber "E" in circle), "Ready to speak, sir.", green call button.
In-call view: Animated avatar (pulsing amber when speaking, green when listening, blue when processing). Status text. Transcript/response display. Mic button + end call button.
Voice loop: Jan speaks (STT) -> sends to /api/voice -> receives audio -> plays -> loop.

**Step 3: Voice page**

Full-height container with CallScreen component.

**Step 4: Commit**

"feat: voice call screen — bidirectional voice conversation with Edwin"

---

### Task 11: Morning Briefing Job

**Goal:** Cron job for Edwin's morning briefing at 5:30 AM Vienna time.

**Files:**
- Create: `apps/server/src/jobs/scheduler.ts`
- Create: `apps/server/src/jobs/morning.ts`
- Modify: `apps/server/src/index.ts`

**Step 1: Implement morning.ts**

runMorningBriefing(pipeline) — generates briefing text via pipeline, generates audio via TTS. Logs to console. Returns { text, audio }. (Push notification to be added in Phase 2.)

**Step 2: Implement scheduler.ts**

Uses node-cron. Schedules morning briefing at "30 5 * * *" in Europe/Vienna timezone. Logs scheduler activation.

**Step 3: Wire into server**

Import and call startScheduler(pipeline) before server.listen().

**Step 4: Commit**

"feat: morning briefing cron job — Edwin wakes Jan at 5:30 every day"

---

### Task 12: PWA Configuration

**Goal:** Make frontend installable as PWA on Jan's phone.

**Files:**
- Create: `apps/web/public/manifest.json`
- Create: `apps/web/public/service-worker.js`
- Create: `apps/web/components/pwa-register.tsx`
- Modify: `apps/web/app/layout.tsx`

**Step 1: PWA manifest**

name: Edwin, short_name: Edwin, description: "At your service, sir.", standalone display, dark background (#09090b), portrait orientation.

**Step 2: Service worker**

Basic network-first strategy with cache fallback. Skip waiting on install, claim on activate.

**Step 3: Registration component**

Client component that registers service worker on mount.

**Step 4: Add to layout**

Include PWARegister in root layout body.

**Step 5: Create placeholder icons**

192x192 and 512x512 PNG placeholders.

**Step 6: Commit**

"feat: PWA configuration — manifest, service worker, installable on mobile"

---

### Task 13: Vitest Configuration

**Goal:** Testing infrastructure for server and shared packages.

**Files:**
- Create: `apps/server/vitest.config.ts`
- Create: `packages/shared/vitest.config.ts`

Vitest config for both packages. Node environment for server. Run all tests: `pnpm test`.

Commit: "feat: configure vitest for server and shared packages"

---

### Task 14: Integration Test and Polish

**Goal:** Run full system end-to-end, fix wiring issues.

**Step 1:** Copy .env.example to .env, add real API keys.
**Step 2:** Start full system with `pnpm dev`.
**Step 3:** Verify checklist:
- Health endpoint works
- Dashboard shows greeting
- Chat works, Edwin responds in character, says "sir"
- Audio plays on Edwin's responses
- Voice call screen works
- All tests pass

**Step 4:** Fix any issues found.
**Step 5:** Commit: "feat: Phase 1 integration — Edwin is alive"

---

### Task 15: Deployment

**Goal:** Deploy to Vercel (frontend) and Railway (backend). Edwin goes live.

**Step 1:** Create GitHub repo, push to main.
**Step 2:** Deploy frontend to Vercel — import repo, set root to apps/web, add NEXT_PUBLIC_API_URL env var.
**Step 3:** Deploy backend to Railway — import repo, set root to apps/server, add all env vars (ANTHROPIC_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, FRONTEND_URL, PORT).
**Step 4:** Update Vercel env with Railway URL, redeploy.
**Step 5:** Verify live deployment (health, dashboard, chat, voice).
**Step 6:** Commit any deployment configs and push.

---

## Task Summary

| Task | What it builds |
|---|---|
| 1 | Monorepo scaffolding |
| 2 | SQLite database with full schema |
| 3 | Edwin's soul (identity, personality, motivators, boundaries, prompt builder) |
| 4 | Memory system (store, seed data, snapshots) |
| 5 | Brain pipeline (context, Claude API, thinking loop) |
| 6 | Voice TTS (ElevenLabs) |
| 7 | API routes (chat, voice, briefing, dashboard) |
| 8 | Frontend foundation (app shell, nav, dashboard) |
| 9 | Chat interface |
| 10 | Voice call screen |
| 11 | Morning briefing cron job |
| 12 | PWA configuration |
| 13 | Vitest configuration |
| 14 | Integration testing |
| 15 | Deployment (Vercel + Railway) |

**After Phase 1:** Jan wakes up to Edwin's voice every morning, talks to him throughout the day via chat or voice, and feels like someone has his back. The foundation supports all 7 phases without rearchitecting.
