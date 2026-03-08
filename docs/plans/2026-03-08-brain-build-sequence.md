# Edwin Brain Build Sequence

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build Edwin's brain — a neural network of 7 interconnected systems, each with dozens of sub-elements. Each session builds one real capability. No shortcuts. No scaffolding. Substance only.

**Architecture:** Claude IS the neural network. We build the body — memory, senses, heartbeat, voice — that lets Claude's intelligence inhabit Edwin's life. Each session adds one neuron, one connection, one capability. Over dozens of sessions, Edwin becomes alive.

**Tech Stack:** Fastify 5, SQLite (better-sqlite3), Anthropic SDK, node-cron, Web Push API, Server-Sent Events, Next.js 16

**Current state:** Deployed skeleton. Chat works (stateless, 5-8s latency). Voice works (robotic). Memory schema exists but never writes. Single Claude API call with no tools. Only background job is an untested morning cron.

**Read before every session:**
- `EDWIN_SOUL.md` — The monument
- `CLAUDE.md` — Development rules
- This plan — The sequence

---

## The Seven Systems

```
┌─────────────────────────────────────────────────────────────────┐
│                        EDWIN'S BRAIN                            │
│                                                                 │
│  ┌──────────┐  ┌─────────────┐  ┌──────────────┐              │
│  │ KNOWING  │──│ REMEMBERING │──│ UNDERSTANDING│              │
│  │ Profiler │  │ Memory Eng. │  │ Interpreter  │              │
│  └────┬─────┘  └──────┬──────┘  └──────┬───────┘              │
│       │               │               │                        │
│       └───────────┬───┴───────────────┘                        │
│                   │                                             │
│            ┌──────┴──────┐                                      │
│            │  TRUSTING   │ ← Soul filters EVERYTHING            │
│            │  The Soul   │                                      │
│            └──────┬──────┘                                      │
│                   │                                             │
│       ┌───────────┼───────────────┐                            │
│       │           │               │                            │
│  ┌────┴─────┐  ┌──┴───────┐  ┌───┴──────┐                    │
│  │ THINKING │──│CONCLUDING│──│  ACTING  │                    │
│  │ Reasoner │  │ Decider  │  │ Executor │                    │
│  └──────────┘  └──────────┘  └──────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Memory Foundation (Sessions 1-6)

Everything depends on memory. Without memory, Edwin can't learn, can't follow up, can't grow. Memory is the foundation of every other system.

---

### Session 1: Memory Extraction

**Goal:** After every conversation, Edwin automatically extracts structured facts and stores them as categorized observations.

**Dependencies:** None — this is the beginning.

**What to build:**
- Create `apps/server/src/memory/extractor.ts`
- After Edwin responds, make a background Claude call (Haiku — fast, cheap) that analyzes the conversation and extracts:
  - **Facts** — things Jan stated ("I have a meeting Thursday", "I weigh 82kg")
  - **Commitments** — things Jan said he'd do ("I'll go to the gym tomorrow")
  - **Preferences** — likes/dislikes ("I hate video calls", "I prefer mornings")
  - **Emotional states** — how Jan seems ("stressed about work", "excited about the deal")
  - **Follow-ups** — things Edwin should check back on ("Ask about the client meeting")
- Each extraction → `observations` table with category, content, confidence, source, expiry
- Expiry rules: facts 90 days, commitments 3 days, preferences 180 days, emotional states 1 day, follow-ups 7 days
- Extraction is fire-and-forget — never block the response to Jan
- Write tests for the extractor

**Key files:**
- Read: `apps/server/src/brain/pipeline.ts` (wire extraction after response)
- Read: `apps/server/src/memory/store.ts` (existing addObservation method)
- Read: `apps/server/src/db/schema.ts` (observations table)
- Create: `apps/server/src/memory/extractor.ts`
- Create: `apps/server/src/memory/__tests__/extractor.test.ts`
- Modify: `apps/server/src/brain/pipeline.ts`

**Done when:**
- Send 5 messages to Edwin mentioning specific facts, a commitment, a preference, and an emotional state
- Query the observations table directly
- Each message resulted in correctly categorized observations with appropriate expiry dates
- Extraction never delayed Edwin's response to Jan

---

### Session 2: Memory Retrieval & Contextual Recall

**Goal:** Before every conversation turn, Edwin retrieves relevant memories and weaves them into his understanding, so every response feels continuous — not fresh.

**Dependencies:** Session 1

**What to build:**
- Enhance `apps/server/src/brain/context.ts` to query observations by relevance
- Retrieval strategy:
  - All unexpired observations from last 24 hours (recency)
  - All commitments (regardless of age — these are active until resolved)
  - All follow-ups still pending
  - Recent emotional states (how was Jan last time?)
  - Top preferences (most confident, most recent)
- Format memories naturally for the system prompt — not a data dump:
  - "What you know right now: Jan mentioned he has a client meeting Thursday. He committed to going to the gym today. Last time you spoke, he seemed stressed about the solar contract. He prefers morning workouts."
- Limit total memory context to ~500 tokens (keep it focused, not overwhelming)
- Implement relevance ranking: recent > confident > frequently mentioned

**Key files:**
- Read: `apps/server/src/brain/context.ts` (current context builder)
- Read: `apps/server/src/memory/store.ts` (existing query methods)
- Read: `apps/server/src/soul/prompt-builder.ts` (where context enters the prompt)
- Modify: `apps/server/src/brain/context.ts`
- Modify: `apps/server/src/memory/store.ts` (add smarter query methods)

**Done when:**
- Tell Edwin "I have a meeting with the solar panel supplier on Friday"
- Close the conversation, start a new one
- Edwin references the Friday meeting without being reminded
- Tell Edwin "I'm feeling great today" → emotional state is reflected in next interaction's tone
- Memory context in system prompt is natural language, not JSON

---

### Session 3: Fact Updates & Contradiction Resolution

**Goal:** When Jan tells Edwin something that contradicts what Edwin already knows, Edwin updates his knowledge gracefully — not duplicating, not ignoring, not blindly overwriting.

**Dependencies:** Sessions 1-2

**What to build:**
- Before storing a new observation, check existing observations for semantic overlap
- Contradiction detection:
  - Same category + similar topic → potential contradiction
  - Use Haiku to evaluate: "Is this new information updating or contradicting existing information?"
  - If update: archive old observation (mark expired), store new one with higher confidence
  - If addition: store alongside existing
- Confidence hierarchy: `told` (1.0) > `observed` (0.7) > `inferred` (0.5)
  - Jan says "I weigh 81kg" (told, 1.0) → overwrites "Jan seems to weigh about 83kg" (inferred, 0.5)
- Handle explicit corrections: "Actually, the meeting is Wednesday, not Thursday"
  - Detect correction intent
  - Find and expire the old fact
  - Store corrected fact with full confidence

**Key files:**
- Modify: `apps/server/src/memory/extractor.ts` (add contradiction check)
- Modify: `apps/server/src/memory/store.ts` (add overlap detection, archiving)
- Create: `apps/server/src/memory/__tests__/contradiction.test.ts`

**Done when:**
- Tell Edwin "I weigh 83kg" → stored as fact
- Later tell Edwin "I weighed myself, I'm 81kg now" → old weight expired, new one stored
- Tell Edwin "Meeting is Thursday" then "Actually it's Wednesday" → Thursday expired, Wednesday stored
- No duplicate observations for the same fact
- Edwin references the corrected information, not the old

---

### Session 4: Multi-Dimensional Information Parsing (KNOWING)

**Goal:** When Edwin learns a fact, he doesn't just store it — he understands its implications across multiple dimensions. "Jan skipped the gym" is not one fact. It's five signals.

**Dependencies:** Sessions 1-3

**What to build:**
- Create `apps/server/src/memory/profiler.ts` — the KNOWING system
- When a fact is extracted, fan it out into its dimensions:
  - "Jan skipped the gym" →
    - Health: gym attendance missed (streak broken?)
    - Behavior: is this a pattern? (check history)
    - Mood signal: why? (stress? laziness? injury?)
    - Accountability: should Edwin say something? (based on streak, day, mood)
    - Motivation: what worked last time he was in a slump? (check history)
  - "Jan spent €80 on Wolt" →
    - Financial: spending event (within budget?)
    - Behavior: is this frequent? (check history)
    - Health: not cooking (pattern?)
    - Priority: conflicts with savings goals
- Each dimension becomes its own observation with appropriate category
- Cross-reference with existing observations to enrich analysis
- This is where KNOWING transforms raw facts into structured understanding

**Key files:**
- Create: `apps/server/src/memory/profiler.ts`
- Create: `apps/server/src/memory/__tests__/profiler.test.ts`
- Modify: `apps/server/src/memory/extractor.ts` (wire profiler after extraction)
- Read: `apps/server/src/memory/seed/jan-profile.ts` (Jan's known habits/goals)

**Done when:**
- Tell Edwin "I skipped the gym today"
- Observations table contains multiple entries from different dimensions (health, behavior, accountability)
- Tell Edwin "I ordered Wolt again"
- Observations table contains financial + health + behavioral analysis
- The profiler enriches Edwin's understanding, not just his storage

---

### Session 5: Memory Compression & Forgetting

**Goal:** Edwin's memory stays compact and sharp — like a doctor's chart, not a transcript. Old observations compress into summaries. Irrelevant things are forgotten. The profile grows in depth, not in size.

**Dependencies:** Sessions 1-4

**What to build:**
- **Conversation summarization**: After a conversation ends (or reaches 10+ messages), generate a 2-3 sentence summary → store in `conversations.summary`
- **Daily compression**: End-of-day job that takes today's observations and produces a daily summary observation ("Today: Jan went to the gym, had a stressful client call, skipped dinner, went to bed at 11pm")
- **Weekly compression**: Weekly job that takes daily summaries → produces weekly summary → stores in `weekly_summaries` table with highlights, concerns, patterns, mood_trend
- **Observation promotion**: When an observation appears 3+ times with consistent content, promote it from observation to identity (e.g., "Jan skips gym on Wednesdays" → identity: habits/gym_skip_pattern)
- **Forgetting**: Cron job that clears expired observations, keeping the DB lean
- **Memory budget**: Total active observations capped at ~200. When exceeding, compress oldest non-critical observations into summaries.

**Key files:**
- Create: `apps/server/src/memory/compressor.ts`
- Create: `apps/server/src/memory/__tests__/compressor.test.ts`
- Modify: `apps/server/src/jobs/scheduler.ts` (add daily/weekly compression crons)
- Modify: `apps/server/src/memory/store.ts` (add promotion, forgetting methods)
- Read: `apps/server/src/db/schema.ts` (weekly_summaries table, conversations.summary)

**Done when:**
- After a conversation, the conversation row has a summary
- End-of-day job produces a daily summary observation
- Expired observations are cleaned up automatically
- A frequently repeated observation gets promoted to identity
- Total observation count stays manageable regardless of usage duration

---

### Session 6: Memory Search & Relevance

**Goal:** Edwin can search his memory by topic, not just by category or time. When he needs to remember something specific, he finds it — even if it was mentioned weeks ago in a different context.

**Dependencies:** Sessions 1-5

**What to build:**
- Full-text search across observations, conversation summaries, weekly summaries, and identity
- Relevance ranking: exact match > partial match > category match > summary match
- Recency weighting: recent memories rank higher than old ones
- Topic clustering: related observations grouped together ("gym" pulls in workout mentions, exercise discussions, health goals)
- Query method: `searchMemory(query: string, limit?: number)` → returns ranked results
- This powers the future `recall` tool (Session 16) — but the search engine is built now

**Key files:**
- Modify: `apps/server/src/memory/store.ts` (add searchMemory method)
- Create: `apps/server/src/memory/__tests__/search.test.ts`
- Read: `apps/server/src/db/schema.ts` (understand all tables to search across)

**Done when:**
- Populate memory with 20+ observations across categories
- `searchMemory("gym")` returns gym-related observations ranked by relevance
- `searchMemory("solar contract")` finds mentions across conversations and summaries
- Search spans all memory tiers (observations, identity, summaries)
- Results are ranked meaningfully, not just chronologically

---

## Phase 2: Response Quality (Sessions 7-11)

Memory is the foundation. Now make every response from Edwin worthy of that foundation — fast, intelligent, filtered through his soul.

---

### Session 7: Streaming Responses

**Goal:** Edwin's words appear in real-time as Claude generates them. First token in <500ms. The conversation feels instant and alive, not like waiting for a server.

**Dependencies:** None (can run parallel with Phase 1)

**What to build:**
- Add `streamClaude()` to `apps/server/src/brain/reasoning.ts` using Anthropic SDK streaming
- New SSE endpoint: `POST /api/chat/stream`
  - Headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`
  - Events: `data: {"delta": "text chunk"}\n\n`
  - Final event: `data: {"done": true, "conversationId": 123}\n\n`
- Frontend streaming in `apps/web/lib/api.ts`:
  - New `streamMessage()` using fetch + ReadableStream
  - Chat page renders partial message as chunks arrive
  - Edwin's message bubble appears immediately with typing indicator
  - Text flows in word-by-word
- Keep non-streaming `POST /api/chat` for voice (needs complete text for TTS)
- Pipeline gets a `processStreaming()` method alongside existing `process()`
- After stream completes, trigger memory extraction in background

**Key files:**
- Modify: `apps/server/src/brain/reasoning.ts` (add streaming)
- Modify: `apps/server/src/routes/chat.ts` (add SSE endpoint)
- Modify: `apps/server/src/brain/pipeline.ts` (add streaming pipeline)
- Modify: `apps/web/lib/api.ts` (add streaming fetch)
- Modify: `apps/web/app/chat/page.tsx` (render streaming)
- Modify: `packages/shared/src/types.ts` (streaming event types)

**Done when:**
- Send a message in chat
- First words appear within 500ms
- Text flows in smoothly, not all-at-once
- Memory extraction still happens after stream completes
- Voice endpoint still works (non-streaming)

---

### Session 8: Soul as Decision Filter (TRUSTING)

**Goal:** The soul isn't a prompt prefix — it's the lens through which EVERY decision is filtered. Edwin's personality, boundaries, and motivational intelligence should dynamically shape every response, not just sit in a static system prompt.

**Dependencies:** Sessions 1-2 (needs memory context)

**What to build:**
- Refactor `apps/server/src/soul/prompt-builder.ts`:
  - Dynamic motivational lever selection based on context:
    - Check recent emotional state observations → if stressed, use encouragement not accountability
    - Check time of day + day of week → Sunday = gentle, Monday morning = drive
    - Check recent behavior patterns → if 3 gym skips this week, escalate accountability
  - Dynamic boundary enforcement:
    - Detect "not right now" signals → switch to minimal mode
    - Late night → suppress task reminders, be calm
    - Overwhelmed → simplify, reduce cognitive load
  - Response length calibration:
    - Quick question → short answer
    - Emotional moment → longer, warmer response
    - Morning briefing → structured, energizing
- Create `apps/server/src/soul/soul-filter.ts`:
  - Input: draft response + current context
  - Output: soul-appropriate response (or "stay silent" decision)
  - The soul doesn't just inform the prompt — it can veto or reshape the output

**Key files:**
- Modify: `apps/server/src/soul/prompt-builder.ts` (dynamic composition)
- Create: `apps/server/src/soul/soul-filter.ts`
- Read: `apps/server/src/soul/personality.ts` (tone rules)
- Read: `apps/server/src/soul/motivators.ts` (lever selection)
- Read: `apps/server/src/soul/boundaries.ts` (when to be quiet)
- Read: `apps/server/src/brain/context.ts` (what context is available)

**Done when:**
- Message at 10pm → Edwin is calm, no task reminders
- Message on Sunday → Edwin is gentle all day
- Jan says "not right now" → Edwin backs off, doesn't push
- Jan has skipped gym 3 times → accountability lever activates naturally
- Jan is stressed → encouragement mode, not guilt mode
- Soul decisions are based on memory observations, not just time of day

---

### Session 9: Mood Detection (UNDERSTANDING)

**Goal:** Edwin detects Jan's mood from language patterns, word choice, emoji usage, and topic selection — and adapts his behavior accordingly.

**Dependencies:** Sessions 1-2, 8

**What to build:**
- Create `apps/server/src/brain/understanding/mood-detector.ts`
- Analyze each message from Jan for mood signals:
  - Language energy: short terse replies = low energy or frustrated
  - Emoji usage: 😤 vs 😊 vs no emoji
  - Topic: avoiding work topics = potential stress
  - Engagement: one-word replies vs detailed paragraphs
  - Explicit statements: "I'm tired", "feeling great", "ugh"
- Mood categories: energized, neutral, tired, stressed, frustrated, excited, low, overwhelmed
- Store detected mood as emotional_state observation (confidence varies)
- Feed detected mood into soul filter (Session 8) to calibrate response:
  - Stressed → empathy first, then simplify
  - Energized → match energy, push harder
  - Low → gentle encouragement, suggest easy wins
  - Frustrated → validate, don't add to the pile
- Track mood over time to detect trends ("Jan has been low energy all week")

**Key files:**
- Create: `apps/server/src/brain/understanding/mood-detector.ts`
- Create: `apps/server/src/brain/understanding/__tests__/mood-detector.test.ts`
- Modify: `apps/server/src/brain/pipeline.ts` (run mood detection on Jan's message)
- Modify: `apps/server/src/soul/soul-filter.ts` (use mood in response calibration)

**Done when:**
- Send "ugh" → mood detected as frustrated/low
- Send "Let's go! Feeling amazing today" → mood detected as energized
- Send one-word replies repeatedly → mood shifts to low/disengaged
- Edwin's response tone adapts to detected mood
- Mood observations stored and available for trend analysis

---

### Session 10: Implicit Request Detection (UNDERSTANDING)

**Goal:** Edwin understands what Jan WANTS, not just what he SAYS. "I'm hungry" means suggest a meal. "I'm bored" means suggest an activity. "Ugh, it's raining" means acknowledge + adapt plans.

**Dependencies:** Sessions 1-2, 8-9

**What to build:**
- Create `apps/server/src/brain/understanding/intent-detector.ts`
- Detect implicit requests from conversational cues:
  - Complaints → suggest solutions: "I'm hungry" → meal suggestion
  - Boredom → suggest activities: "Nothing to do" → activity based on time/weather/mood
  - Frustration with tasks → offer help: "This contract is killing me" → "What specifically, sir?"
  - Physical state → actionable: "I'm tired" → sleep suggestion or caffeine timing
  - Environmental → adapt: "It's so nice outside" → suggest outdoor activity
- Intent categories: needs_solution, needs_activity, needs_help, needs_comfort, needs_nothing
- Feed intent into Claude's context so responses are actionable, not sympathetic
  - "That's too bad" = wrong response to "I'm hungry"
  - "How about that pasta recipe you liked?" = right response

**Key files:**
- Create: `apps/server/src/brain/understanding/intent-detector.ts`
- Create: `apps/server/src/brain/understanding/__tests__/intent-detector.test.ts`
- Modify: `apps/server/src/brain/pipeline.ts` (run intent detection)
- Modify: `apps/server/src/brain/context.ts` (include detected intent in context)

**Done when:**
- "I'm hungry" → Edwin suggests a meal, not "I'm sorry to hear that"
- "Nothing to do today" → Edwin suggests specific activities
- "This client is driving me crazy" → Edwin offers specific help or perspective
- "I'm exhausted" → Edwin suggests rest or adjusts expectations for the day
- Implicit requests are detected and acted on naturally, not mechanically

---

### Session 11: Context Interpretation (UNDERSTANDING)

**Goal:** Edwin reads between the lines. "Fine" might mean fine, or it might mean deflection. Short replies might mean busy, or might mean upset. Edwin learns to interpret context, not just parse words.

**Dependencies:** Sessions 1-2, 8-10

**What to build:**
- Create `apps/server/src/brain/understanding/context-interpreter.ts`
- Contextual interpretation rules:
  - "Fine" / "ok" / "sure" → check: was a specific question asked? Is this deflection?
  - Compare current message style to Jan's baseline (established from history)
  - Sudden topic changes → avoiding something?
  - Shorter responses than usual → distracted, busy, or upset
  - Longer responses than usual → engaged, excited, or venting
  - Response time awareness (if measurable): quick replies = engaged, slow = distracted
- Build Jan's communication baseline from stored observations:
  - Average message length
  - Typical topics by time of day
  - Engagement patterns
- Interpretation feeds into mood detection and soul filter, creating a richer understanding

**Key files:**
- Create: `apps/server/src/brain/understanding/context-interpreter.ts`
- Create: `apps/server/src/brain/understanding/__tests__/context-interpreter.test.ts`
- Modify: `apps/server/src/brain/pipeline.ts` (wire context interpretation)
- Modify: `apps/server/src/brain/understanding/mood-detector.ts` (use interpretation signals)

**Done when:**
- Edwin asks "How was the meeting?" → Jan says "fine" → Edwin follows up gently ("That doesn't sound very convincing, sir")
- Jan goes from paragraphs to one-word answers mid-conversation → Edwin notices and adjusts
- Edwin builds a baseline of Jan's communication style over time
- Interpretation enriches mood detection, not duplicates it

---

## Phase 3: Thinking & Reasoning (Sessions 12-17)

Edwin doesn't just respond — he THINKS. Multi-step reasoning, tool usage, background cognition. This is where he stops being a chatbot and starts being a brain.

---

### Session 12: Tool Use Framework (THINKING)

**Goal:** Claude gets tools during conversations. He can actively remember, recall, schedule, and query — not just passively receive context.

**Dependencies:** Sessions 1-6 (needs memory system)

**What to build:**
- Create `apps/server/src/brain/tools.ts` — tool definitions:
  - `remember` — store a fact/preference/observation about Jan
  - `recall` — search memory for information about a topic (uses Session 6 search)
  - `schedule_reminder` — set a reminder for a specific time
  - `list_pending` — list pending reminders and actions
- Create `apps/server/src/brain/tool-executor.ts` — handle each tool call:
  - `remember` → `memoryStore.addObservation()`
  - `recall` → `memoryStore.searchMemory()`
  - `schedule_reminder` → insert into `scheduled_actions`
  - `list_pending` → query `scheduled_actions` WHERE status='pending'
- Update `callClaude()` in reasoning.ts to handle tool use loop:
  1. Send message with tools
  2. If response has `tool_use` blocks → execute them
  3. Send tool results back to Claude
  4. Repeat until Claude responds with text
  5. Return final text
- Update system prompt with tool usage instructions:
  - Use tools naturally, don't announce them
  - Remember important things Jan says
  - Recall relevant memories when discussing a topic
  - Schedule reminders when Jan asks

**Key files:**
- Create: `apps/server/src/brain/tools.ts`
- Create: `apps/server/src/brain/tool-executor.ts`
- Create: `apps/server/src/brain/__tests__/tool-executor.test.ts`
- Modify: `apps/server/src/brain/reasoning.ts` (tool use loop)
- Modify: `apps/server/src/brain/pipeline.ts` (pass tools)
- Modify: `apps/server/src/soul/prompt-builder.ts` (tool instructions)

**Done when:**
- "Remind me to call the electrician tomorrow at 2pm" → Edwin uses schedule_reminder tool → action in DB
- "What did I say about the gym?" → Edwin uses recall tool → finds relevant memories → responds accurately
- "I just signed a new solar contract worth €50k" → Edwin uses remember tool → stored as fact
- Tool calls happen transparently within conversation flow
- Tool use loop handles multiple sequential tool calls

---

### Session 13: Multi-Step Reasoning (THINKING)

**Goal:** Edwin chains multiple pieces of information together to form intelligent recommendations. Weather + schedule + habits + mood → specific, actionable suggestion. Not just answering questions — thinking ahead.

**Dependencies:** Sessions 1-6, 12

**What to build:**
- Enhance system prompt with reasoning instructions:
  - "Before responding, consider: What time is it? What day? What's Jan's current mood? What commitments does he have? What patterns have you noticed? What would serve him best right now?"
  - "Think step by step internally. Don't show your reasoning unless Jan asks why."
- Create reasoning chain examples in prompt:
  - "It's Saturday + weather is nice + Jan hasn't exercised this week + he seems stressed → suggest an outdoor run"
  - "It's 2pm + no lunch mentioned + gym at 5pm + Jan is working → suggest lunch now for energy"
  - "Bill due in 2 days + Jan hasn't mentioned it + auto-pay is off → remind now"
- Build `apps/server/src/brain/reasoning-context.ts`:
  - Synthesize all available data into a reasoning brief:
    - Current time/day/weather (when available)
    - Recent memories and mood
    - Pending commitments and reminders
    - Behavioral patterns
    - Today's events
  - This brief is included in the system prompt as "Your current awareness"
- Increase max_tokens for complex reasoning (1024 → 2048)

**Key files:**
- Create: `apps/server/src/brain/reasoning-context.ts`
- Modify: `apps/server/src/soul/prompt-builder.ts` (add reasoning instructions)
- Modify: `apps/server/src/brain/context.ts` (build reasoning brief)
- Modify: `apps/server/src/brain/reasoning.ts` (increase max_tokens)

**Done when:**
- Edwin makes recommendations that combine multiple data points, not just respond to what was said
- Edwin proactively brings up relevant information ("By the way, you have that meeting tomorrow")
- Reasoning feels natural, not forced or robotic
- Edwin considers time, mood, commitments, and patterns together

---

### Session 14: Pattern Recognition (UNDERSTANDING → THINKING)

**Goal:** Edwin detects behavioral patterns over days, weeks, and months. "Jan always skips gym on Wednesdays." "Jan orders Wolt when stressed." "Jan goes quiet when he's avoiding something."

**Dependencies:** Sessions 1-6

**What to build:**
- Create `apps/server/src/brain/understanding/pattern-detector.ts`
- Pattern types:
  - **Temporal**: things that happen at specific times/days ("skips gym on Wednesdays")
  - **Causal**: A leads to B ("stress → Wolt ordering", "gym skip → bad mood next day")
  - **Absence**: things that DON'T happen ("hasn't mentioned friends in 2 weeks")
  - **Trends**: directional changes ("gym attendance declining", "mood improving")
- Detection method:
  - Daily cron: analyze last 7 days of observations
  - Weekly cron: analyze last 4 weeks
  - Look for repetitions, correlations, and absences
  - Use Haiku to evaluate: "Given these observations over the last week, what patterns do you notice?"
- Store detected patterns as observations with category `pattern` and high confidence
- Promote confirmed patterns (detected 3+ times) to identity table
- Surface relevant patterns in reasoning context (Session 13)

**Key files:**
- Create: `apps/server/src/brain/understanding/pattern-detector.ts`
- Create: `apps/server/src/brain/understanding/__tests__/pattern-detector.test.ts`
- Modify: `apps/server/src/jobs/scheduler.ts` (add daily/weekly pattern detection crons)
- Modify: `apps/server/src/brain/reasoning-context.ts` (include patterns in reasoning brief)

**Done when:**
- After a week of observations, Edwin detects patterns in Jan's behavior
- Patterns are stored and available for reasoning
- Edwin can reference patterns naturally: "You tend to skip the gym mid-week, sir"
- Absence detection works: "You haven't mentioned the solar contract in a while"
- Confirmed patterns get promoted to identity for long-term memory

---

### Session 15: Behavioral Prediction (UNDERSTANDING → THINKING)

**Goal:** Edwin predicts what Jan is likely to do — and intervenes before problems happen. "Jan hasn't eaten and has gym in 2 hours" → proactive lunch suggestion. "Jan skipped gym twice this week" → preemptive motivation before the third skip.

**Dependencies:** Sessions 1-6, 14

**What to build:**
- Create `apps/server/src/brain/understanding/predictor.ts`
- Prediction types:
  - **Risk predictions**: "Jan is likely to skip gym today" (based on patterns + current state)
  - **Need predictions**: "Jan probably hasn't eaten" (based on time + no food mentions)
  - **Mood predictions**: "Jan will likely feel bad tonight if he doesn't exercise" (based on causal patterns)
  - **Timing predictions**: "Jan usually goes quiet around 3pm" (based on temporal patterns)
- Predictions feed into reasoning context with confidence levels
- High-confidence predictions → proactive suggestions
- Low-confidence predictions → noted but not acted on
- Prediction accuracy tracking: when Edwin predicts and the outcome is known, score the prediction

**Key files:**
- Create: `apps/server/src/brain/understanding/predictor.ts`
- Create: `apps/server/src/brain/understanding/__tests__/predictor.test.ts`
- Modify: `apps/server/src/brain/reasoning-context.ts` (include predictions)
- Modify: `apps/server/src/brain/context.ts` (trigger predictions when building context)

**Done when:**
- Edwin can predict likely behavior based on patterns and current state
- Predictions are included in reasoning context
- High-confidence predictions lead to proactive suggestions
- Prediction accuracy is tracked over time

---

### Session 16: Priority Calculation (THINKING → CONCLUDING)

**Goal:** Edwin knows what's most important for Jan RIGHT NOW. Not everything is equal. A bill due tomorrow trumps a gym reminder. A client meeting in an hour trumps a supplement reminder. Edwin ranks and acts accordingly.

**Dependencies:** Sessions 1-6, 12-14

**What to build:**
- Create `apps/server/src/brain/thinking/priority-engine.ts`
- Priority factors:
  - **Urgency**: time-sensitive items score higher as deadline approaches
  - **Impact**: financial/health/career items score higher than comfort items
  - **Consequence**: items with real consequences (fines, missed meetings) score highest
  - **Pattern risk**: items Jan tends to forget/skip get priority boost
  - **Mood alignment**: don't push low-priority items when Jan is stressed
- Priority levels: critical (act now), high (today), medium (this week), low (eventually)
- Calculate priorities for:
  - Pending scheduled_actions
  - Commitments from memory
  - Follow-ups due
  - Routine reminders
- Priority ranking available to reasoning context and heartbeat (Phase 4)
- Dashboard can display top priorities

**Key files:**
- Create: `apps/server/src/brain/thinking/priority-engine.ts`
- Create: `apps/server/src/brain/thinking/__tests__/priority-engine.test.ts`
- Modify: `apps/server/src/brain/reasoning-context.ts` (include priorities)
- Modify: `apps/server/src/routes/dashboard.ts` (return prioritized items)

**Done when:**
- Given multiple pending items, Edwin correctly ranks them by importance
- Bill due tomorrow > gym reminder > supplement reminder
- Priorities adjust based on time (approaching deadline = escalation)
- Priority list available in reasoning context for intelligent responses
- Dashboard reflects prioritized pending actions

---

### Session 17: Cost-Benefit Analysis (THINKING → CONCLUDING)

**Goal:** Edwin evaluates proposals before making them. Is this suggestion worth Jan's time? Money? Energy? Edwin doesn't just suggest things — he considers whether they're actually good ideas right now.

**Dependencies:** Sessions 1-6, 16

**What to build:**
- Create `apps/server/src/brain/thinking/evaluator.ts`
- Before Edwin proposes an action, evaluate:
  - **Time cost**: How much of Jan's time does this require?
  - **Money cost**: What's the financial impact?
  - **Energy cost**: Is Jan's current energy level sufficient?
  - **Opportunity cost**: Does this conflict with something more important?
  - **Expected benefit**: How does this serve Jan's goals/vision?
  - **Risk**: What could go wrong?
- Evaluation framework:
  - Score each factor 1-5
  - Weight by Jan's current priorities (financial health is #1 → weight money cost higher)
  - Net score determines whether to propose, defer, or stay silent
- Add evaluation context to Claude's reasoning:
  - "Before proposing, consider whether this is the right time, whether Jan can afford it, and whether something more important needs his attention."

**Key files:**
- Create: `apps/server/src/brain/thinking/evaluator.ts`
- Create: `apps/server/src/brain/thinking/__tests__/evaluator.test.ts`
- Modify: `apps/server/src/soul/prompt-builder.ts` (add evaluation instructions)

**Done when:**
- Edwin doesn't suggest expensive activities when Jan is trying to save money
- Edwin doesn't suggest high-energy tasks when Jan is exhausted
- Proposals include reasoning: "This costs €45 but saves you 2 hours, sir"
- Low-value suggestions are suppressed, not just de-prioritized
- Cost-benefit thinking is natural, not mechanical

---

## Phase 4: Proactive Presence (Sessions 18-24)

Edwin stops waiting for Jan to talk first. He initiates. He checks in. He reaches out. He's present throughout the day — not invisible, not overbearing.

---

### Session 18: The Heartbeat (Background Thinking)

**Goal:** Edwin runs a background loop — a heartbeat — that evaluates context and decides whether to reach out. This is how Edwin exists between conversations. He's not a monitoring system — he's a butler who checks in at natural moments, sleeps at night, and prepares before Jan wakes up.

**Dependencies:** Sessions 1-6, 16

**What to build:**
- Refactor `apps/server/src/jobs/scheduler.ts` into a proper heartbeat system
- Edwin's daily rhythm (Europe/Vienna timezone):
  ```
  NIGHT (10pm–6am)     — Edwin sleeps. Zero processes. No thinking.
  PRE-WAKE (~6:00 AM)  — One process: gather weather, calendar, pending items,
                          yesterday's unfinished business. Prepare morning briefing
                          so it's ready when Jan says good morning.
  MORNING (7:00 AM)    — Deliver morning briefing (Session 19).
  DAY (8am–10pm)       — Heartbeat every 2 hours (8, 10, 12, 2, 4, 6, 8).
                          Each tick: check pending reminders, commitments due,
                          weather changes, follow-ups. Only reach out if there's
                          a real reason.
  EVENING (9:30 PM)    — Evening wind-down (Session 23). Reflect, summarize,
                          preview tomorrow. Last process before sleep.
  ```
- This gives ~7-8 heartbeat evaluations per day, not 48.
- Create `apps/server/src/jobs/heartbeat.ts`:
  - Each tick: load context (time, memories, priorities, pending actions, patterns)
  - Ask Claude (Haiku): "Given this context, should Edwin reach out to Jan right now? If yes, what should he say and through what channel? If no, respond SILENT."
  - If not SILENT → create notification entry in `scheduled_actions`
  - Separate lightweight reminder check (no Claude call): scan `scheduled_actions` for items due NOW → trigger immediately
- Notification storage:
  - Use `scheduled_actions` table: type='notification', status='pending'→'delivered'→'read'
  - Store the message, channel, and priority

**Key files:**
- Modify: `apps/server/src/jobs/scheduler.ts` (expand cron schedule)
- Create: `apps/server/src/jobs/heartbeat.ts`
- Create: `apps/server/src/jobs/__tests__/heartbeat.test.ts`
- Read: `apps/server/src/brain/reasoning-context.ts` (context for evaluation)

**Done when:**
- Server runs heartbeat evaluations on the natural daily rhythm schedule
- No processes run between 10pm and 6am (Edwin sleeps)
- Pre-wake process gathers everything for the morning briefing
- Heartbeat creates notification entries when Edwin decides to reach out
- Heartbeat stays silent when there's nothing meaningful to say
- Reminder checks happen without a Claude call (just DB scan)
- Notifications are stored with appropriate priority and channel
- Heartbeat uses memory, priorities, and patterns — not just time of day

---

### Session 19: Morning Briefing (Real)

**Goal:** Edwin's morning briefing is a personalized, context-rich wake-up call — not a generic greeting. It references yesterday, today's plan, pending commitments, weather, and sets the tone for the day.

**Dependencies:** Sessions 1-6, 18

**What to build:**
- Refactor `apps/server/src/jobs/morning.ts`:
  - Pull yesterday's conversation summary
  - Pull pending commitments and follow-ups
  - Pull today's schedule (calendar integration in future, manual for now)
  - Pull weather (integration in future, skip for now)
  - Pull relevant patterns ("You tend to be productive on Tuesdays, sir")
  - Pull priority items for today
  - Generate briefing via Claude with all this context
- Morning briefing format:
  - Greeting (personalized, energizing)
  - Yesterday recap (1-2 sentences)
  - Today's priorities (top 3 items)
  - Commitments due today
  - Motivational close (calibrated to current patterns)
- Store briefing as a notification
- Briefing available via `GET /api/briefing` with full context

**Key files:**
- Modify: `apps/server/src/jobs/morning.ts` (complete rewrite with context)
- Modify: `apps/server/src/routes/briefing.ts` (enhanced response)
- Read: `apps/server/src/brain/reasoning-context.ts` (reuse context building)

**Done when:**
- Morning briefing references specific things from yesterday
- Briefing includes today's priorities and pending commitments
- Briefing tone matches the soul's morning energy (motivating, driven)
- Briefing is generated daily at 5:30 AM and stored as notification
- `GET /api/briefing` returns the full, personalized briefing

---

### Session 20: Notification System (Backend + Frontend)

**Goal:** Edwin's proactive messages (from heartbeat, briefing, reminders) are visible in the app. Notification badge, notification panel, mark-as-read. Jan can see Edwin's outreach at a glance.

**Dependencies:** Session 18

**What to build:**
- Backend endpoints:
  - `GET /api/notifications` — return unread notifications (from scheduled_actions where type='notification' and status='pending')
  - `POST /api/notifications/:id/read` — mark as read
  - `GET /api/notifications/count` — return unread count
- Frontend:
  - Notification badge on nav (shows unread count)
  - Notification panel/dropdown showing recent notifications
  - Each notification: Edwin's message, timestamp, read/unread status
  - Click notification → mark read, optionally open chat for follow-up
  - Poll `/api/notifications/count` every 30 seconds for badge updates
- Wire heartbeat notifications to the frontend display

**Key files:**
- Create: `apps/server/src/routes/notifications.ts`
- Create: `apps/web/components/notifications/notification-panel.tsx`
- Create: `apps/web/components/notifications/notification-badge.tsx`
- Modify: `apps/server/src/index.ts` (register notification routes)
- Modify: `apps/web/components/layout/nav.tsx` (add badge)
- Modify: `packages/shared/src/types.ts` (notification types)

**Done when:**
- Heartbeat creates notifications → they appear in the app
- Notification badge shows unread count
- Notification panel lists recent notifications with timestamps
- Marking a notification as read updates the badge
- Notifications feel like Edwin reaching out, not system alerts

---

### Session 21: Push Notifications

**Goal:** Edwin can buzz Jan's phone even when the browser tab is closed. He exists outside the app.

**Dependencies:** Sessions 18, 20

**What to build:**
- Backend:
  - Generate VAPID keys (one-time, store in env)
  - `POST /api/push/subscribe` — store push subscription (endpoint, p256dh, auth)
  - Add `push_subscriptions` table to schema
  - `sendPush(title, body, url)` function using `web-push` npm package
- Service worker (`apps/web/public/sw.js`):
  - Listen for `push` events → show native notification
  - Handle `notificationclick` → open app to relevant page
- Frontend:
  - Notification permission prompt (tasteful, not aggressive)
  - Subscribe to push on permission grant
  - Send subscription to backend
  - Store permission status in localStorage
- Wire heartbeat to push:
  - When heartbeat creates a notification, also send push to all subscriptions
  - Push payload: { title: "Edwin", body: "message text", url: "/chat" }

**Key files:**
- Create: `apps/server/src/push/push-service.ts`
- Create: `apps/server/src/routes/push.ts`
- Create: `apps/web/public/sw.js` (or enhance existing)
- Create: `apps/web/components/push-prompt.tsx`
- Modify: `apps/server/src/db/schema.ts` (push_subscriptions table)
- Modify: `apps/server/src/jobs/heartbeat.ts` (trigger push)
- Modify: `apps/server/src/index.ts` (register push routes)
- Modify: `apps/server/package.json` (add web-push)

**Done when:**
- Open app → asked for notification permission
- Grant permission → subscription stored on server
- Close browser entirely
- Heartbeat fires → phone buzzes with Edwin's message
- Tap notification → app opens to Edwin's message
- Permission denial is respected gracefully

---

### Session 22: Check-ins & Follow-ups (ACTING)

**Goal:** Edwin follows up on commitments and checks in throughout the day. "Did you make it to the gym?" "How did the meeting go?" "You said you'd call the electrician — did that happen?"

**Dependencies:** Sessions 1-6, 18-20

**What to build:**
- Create `apps/server/src/jobs/follow-up-engine.ts`:
  - Scan observations for commitments approaching their expiry
  - Scan observations for follow-ups due today
  - Generate natural follow-up messages via Claude (Haiku)
  - Schedule as notifications via heartbeat
- Follow-up rules:
  - Commitments made today → check back end of day or next morning
  - "Tomorrow" commitments → check back the next afternoon
  - Open-ended commitments → check back in 2-3 days
  - Don't follow up more than once per commitment (unless Jan didn't respond)
- Check-in types:
  - Commitment follow-up: "Did you call the electrician, sir?"
  - Activity check: "How did the gym go?"
  - Wellbeing: "How are you feeling today?" (only if mood trend is concerning)
  - Accountability: "You said you'd do X — how's that going?"

**Key files:**
- Create: `apps/server/src/jobs/follow-up-engine.ts`
- Create: `apps/server/src/jobs/__tests__/follow-up-engine.test.ts`
- Modify: `apps/server/src/jobs/heartbeat.ts` (use follow-up engine in evaluation)
- Modify: `apps/server/src/memory/store.ts` (add query for pending commitments/follow-ups)

**Done when:**
- Tell Edwin "I'll go to the gym tomorrow"
- Next day, Edwin follows up: "Did you make it to the gym, sir?"
- Tell Edwin "I have a meeting with the supplier Friday"
- Friday evening: "How did the meeting go?"
- Follow-ups are natural, not robotic
- No double follow-ups on the same commitment

---

### Session 23: Evening Wind-down (ACTING)

**Goal:** Edwin gently closes the day. Reflects on what happened, previews tomorrow, helps Jan wind down. Not a task list — a warm closing.

**Dependencies:** Sessions 1-6, 18-20

**What to build:**
- Create `apps/server/src/jobs/evening.ts`:
  - Pull today's conversation summaries
  - Pull completed and missed commitments
  - Pull tomorrow's known items (schedule, reminders)
  - Generate evening message via Claude with gentle evening tone
- Evening message format:
  - Day reflection (1-2 sentences on what was accomplished)
  - Acknowledgment (what went well, empathy for what was hard)
  - Tomorrow preview (what's coming, keep it brief)
  - Wind-down suggestion (rest, reading, early bed)
- Tone: gentle, calming, warm. Never productivity-pushing at night.
- Schedule at 9:30 PM — Edwin's last process before he sleeps

**Key files:**
- Create: `apps/server/src/jobs/evening.ts`
- Modify: `apps/server/src/jobs/scheduler.ts` (9:30 PM cron)
- Read: `apps/server/src/soul/personality.ts` (night tone rules)

**Done when:**
- 9:30 PM → Edwin sends a gentle evening reflection
- References specific things from today's conversations
- Tone is calm and warm, no task pushing
- Includes brief tomorrow preview
- Feels like a friend saying goodnight, not a system notification

---

### Session 24: Channel Selection (CONCLUDING → ACTING)

**Goal:** Edwin chooses the RIGHT channel for each communication. Not everything is a chat message. Some things are notifications. Some are voice. Some are silence. Edwin picks intelligently.

**Dependencies:** Sessions 18-23

**What to build:**
- Create `apps/server/src/brain/concluding/channel-selector.ts`
- Channel rules:
  - **Push notification**: Quick reminders, time-sensitive items, brief updates
  - **Chat message**: Suggestions needing response, proposals, conversations
  - **Voice**: Morning briefing, when Jan is alone and wants company (future)
  - **Dashboard update**: Status changes, progress updates, weather
  - **Silence**: When Jan said "not right now", when it's too late, when there's nothing meaningful
- Selection factors:
  - Urgency (high → notification, low → can wait for chat)
  - Length (short → notification, long → chat)
  - Response needed? (yes → chat, no → notification)
  - Time of day (late → only urgent notifications)
  - Jan's current state (busy → notification only, available → chat)
- Heartbeat uses channel selector when deciding how to deliver messages

**Key files:**
- Create: `apps/server/src/brain/concluding/channel-selector.ts`
- Create: `apps/server/src/brain/concluding/__tests__/channel-selector.test.ts`
- Modify: `apps/server/src/jobs/heartbeat.ts` (use channel selector)

**Done when:**
- Quick reminder → push notification, not a chat message
- Proposal needing response → chat message
- 11pm → only critical items get through
- Edwin stays silent when there's nothing meaningful to say
- Channel selection feels natural and appropriate

---

## Phase 5: Senses (Sessions 25-29)

Edwin needs to see the world. Weather, time, calendar, location. Without senses, he's blind — making suggestions in a vacuum.

---

### Session 25: Weather Integration

**Goal:** Edwin sees the weather and references it naturally. "Bring a jacket, sir." "Perfect day for a run." "Rain expected — might want to reschedule."

**Dependencies:** Session 12 (tool use framework)

**What to build:**
- Create `apps/server/src/integrations/weather.ts`:
  - Use Open-Meteo API (free, no API key)
  - Current weather: temperature, conditions, wind, precipitation
  - Daily forecast: next 3 days
  - Cache response for 30 minutes
  - Graz, Austria: latitude 47.0707, longitude 15.4395
- Implement `get_current_weather` tool in tool-executor:
  - Returns formatted weather data for Claude to interpret
  - Claude describes naturally, not "Temperature: 12°C, Humidity: 65%"
- Add weather to morning briefing context
- Add weather to dashboard response
- Frontend: weather display on dashboard

**Key files:**
- Create: `apps/server/src/integrations/weather.ts`
- Create: `apps/server/src/integrations/__tests__/weather.test.ts`
- Modify: `apps/server/src/brain/tool-executor.ts` (implement weather tool)
- Modify: `apps/server/src/jobs/morning.ts` (include weather in briefing)
- Modify: `apps/server/src/routes/dashboard.ts` (include weather data)
- Modify: `apps/web/app/page.tsx` (display weather)

**Done when:**
- "What's the weather?" → Edwin responds with current conditions naturally
- Morning briefing includes weather
- Dashboard shows weather
- Weather data is cached (not hitting API every request)
- Edwin references weather proactively in relevant contexts ("Nice day for the park, sir")

---

### Session 26: Time & Day Intelligence

**Goal:** Edwin doesn't just know the time — he understands what it means. Saturday morning vs Monday morning. January vs July. The rhythm of Jan's week and year.

**Dependencies:** Sessions 1-6, 14

**What to build:**
- Enhance `apps/server/src/brain/context.ts`:
  - Day-of-week significance (not just weekday/weekend):
    - Monday: fresh start, planning energy
    - Wednesday: mid-week slump risk
    - Friday: wind-down, weekend anticipation
    - Saturday: activity day, social potential
    - Sunday: rest, gentle, no pressure
  - Seasonal awareness:
    - Winter: shorter days, mood impact, indoor activities
    - Summer: outdoor suggestions, longer active hours
    - Seasonal events (holidays, daylight savings)
  - Weekly position: beginning (plan), middle (execute), end (reflect)
  - Monthly position: beginning (bills due), end (month summary)
- Jan's rhythm (learned from patterns):
  - When does Jan typically wake up? (observed, not assumed)
  - When is Jan most productive? Most social? Most likely to skip gym?
  - Seasonal behavior changes
- Temporal context feeds into all reasoning and soul decisions

**Key files:**
- Modify: `apps/server/src/brain/context.ts` (enhanced temporal awareness)
- Create: `apps/server/src/brain/temporal-context.ts` (dedicated temporal intelligence)
- Create: `apps/server/src/brain/__tests__/temporal-context.test.ts`

**Done when:**
- Monday morning → Edwin references fresh start energy
- Wednesday → Edwin preemptively motivates (mid-week slump pattern)
- January → Edwin references shorter days, suggests indoor activities
- Edwin's temporal awareness goes beyond time-of-day into weekly/monthly/seasonal rhythm

---

### Session 27: Calendar Integration

**Goal:** Edwin knows Jan's schedule. Upcoming meetings, blocked time, free windows. He doesn't double-book, doesn't suggest gym during a client call, and reminds before important events.

**Dependencies:** Session 12 (tool use framework)

**What to build:**
- Create `apps/server/src/integrations/calendar.ts`:
  - Google Calendar API integration (OAuth2, read access)
  - Fetch today's events, this week's events
  - Cache with 15-minute refresh
- New tools:
  - `get_schedule` — returns today's or this week's calendar events
  - `create_event` — add event to calendar (medium-stakes: propose first)
- Calendar awareness in context:
  - Before responding, Edwin knows what's on Jan's schedule
  - "You have a meeting in 2 hours" is proactive, not reactive
- Calendar in morning briefing: "Today you have: supplier call at 10, gym at 5"
- Calendar in heartbeat: "Meeting in 30 minutes" → push notification
- Dashboard: today's schedule displayed

**Key files:**
- Create: `apps/server/src/integrations/calendar.ts`
- Create: `apps/server/src/integrations/__tests__/calendar.test.ts`
- Modify: `apps/server/src/brain/tools.ts` (add calendar tools)
- Modify: `apps/server/src/brain/tool-executor.ts` (implement calendar tools)
- Modify: `apps/server/src/jobs/morning.ts` (include schedule)
- Modify: `apps/server/src/routes/dashboard.ts` (include schedule)
- Modify: `apps/web/app/page.tsx` (display schedule)

**Done when:**
- Edwin knows today's schedule and references it in conversation
- "What's on my schedule?" → Edwin uses get_schedule tool → accurate response
- Morning briefing lists today's events
- Heartbeat sends reminder 30 min before meetings
- Dashboard shows today's schedule

---

### Session 28: Location Awareness

**Goal:** Edwin knows where Jan is — at home, at work, traveling. This informs suggestions, tone, and channel selection.

**Dependencies:** Sessions 1-6, 24

**What to build:**
- Simple location system (not GPS tracking — Jan tells Edwin or Edwin infers):
  - Manual: "I'm in Vienna today" → stored as current location
  - Inference: "Just landed in Berlin" → travel detected
  - Default: Graz, Austria (home)
- Location-aware behavior:
  - At home → household suggestions, cooking, routines
  - At work → focus mode, minimal interruptions
  - Traveling → local suggestions, weather for that city, schedule adjustments
  - New city → "Hey! Are you staying in Vienna tonight? There's an event at 8pm for €5"
- Store current location as observation (category: location)
- Weather adjusts to current location
- New tool: `get_location` — returns Jan's current known location

**Key files:**
- Create: `apps/server/src/integrations/location.ts`
- Modify: `apps/server/src/brain/tools.ts` (add location tool)
- Modify: `apps/server/src/brain/tool-executor.ts` (implement)
- Modify: `apps/server/src/brain/context.ts` (include location in context)

**Done when:**
- "I'm in Vienna today" → Edwin adjusts weather, suggestions, tone
- Edwin remembers location until told otherwise
- Location informs activity suggestions (outdoor vs indoor, local events)
- Default location is Graz when nothing is specified

---

### Session 29: News & Industry Context

**Goal:** Edwin stays informed about things that matter to Jan — solar industry news, Austrian business context, relevant local events. The morning briefing includes real-world context, not just personal data.

**Dependencies:** Sessions 18-19, 25

**What to build:**
- Create `apps/server/src/integrations/news.ts`:
  - RSS or news API for solar industry news
  - Austrian business news
  - Filter by relevance to Jan's interests
  - Cache daily
- Morning briefing enhancement:
  - Include 1-2 relevant news items
  - "The solar industry saw a 12% tariff increase in the EU — worth watching for your supply chain, sir"
- New tool: `get_news` — returns relevant news items
- Keep it curated, not overwhelming. 1-2 items per day, only if genuinely relevant.

**Key files:**
- Create: `apps/server/src/integrations/news.ts`
- Modify: `apps/server/src/brain/tools.ts` (add news tool)
- Modify: `apps/server/src/brain/tool-executor.ts` (implement)
- Modify: `apps/server/src/jobs/morning.ts` (include news)

**Done when:**
- Morning briefing includes relevant industry news
- News is filtered and curated, not a dump
- "Any solar news?" → Edwin checks and responds with relevant items
- News context informs business-related conversations naturally

---

## Phase 6: Stakes & Action (Sessions 30-35)

Edwin doesn't just talk — he ACTS. Proposes, schedules, tracks, manages. This is the executive function system.

---

### Session 30: Stakes-Based Action Flow (CONCLUDING → ACTING)

**Goal:** Edwin proposes actions at the right stakes level. Low stakes → almost assumes yes. Medium → proposes with option, waits. High → initiates conversation, needs authorization. Over time, learns what Jan always says yes to.

**Dependencies:** Sessions 1-6, 12

**What to build:**
- Create `apps/server/src/brain/concluding/stakes-engine.ts`:
  - Evaluate stakes level for each proposed action
  - Low: cost < €10, reversible, routine → "Ordering creatine, arriving Thursday"
  - Medium: cost €10-50, semi-reversible → "Maria available Saturday 10am, €45. Book her?"
  - High: cost > €50, financial moves, irreversible → "Moving €200 to savings?"
- Pre-authorization learning:
  - Track Jan's responses to proposals (accepted/declined)
  - If Jan always says yes to a category → shift toward auto-approval
  - Store in identity: `auto_approved/supplement_reorder = true`
- Proposal tracking:
  - Store in `scheduled_actions` with status flow: proposed → accepted/declined → executing → done
  - Follow up on unanswered proposals after 24 hours

**Key files:**
- Create: `apps/server/src/brain/concluding/stakes-engine.ts`
- Create: `apps/server/src/brain/concluding/__tests__/stakes-engine.test.ts`
- Modify: `apps/server/src/brain/pipeline.ts` (use stakes engine for proposals)
- Modify: `apps/server/src/memory/store.ts` (track approval patterns)

**Done when:**
- Low stakes → Edwin acts with confidence, almost assumes yes
- Medium stakes → Edwin proposes clearly, waits for response
- High stakes → Edwin presents options, waits for authorization
- Approval patterns are tracked and shift over time
- Unanswered proposals get gentle follow-ups

---

### Session 31: Reminder System (ACTING)

**Goal:** Edwin manages reminders — time-based, event-based, recurring. "Remind me at 3pm." "Remind me before the meeting." "Remind me every Monday to review finances."

**Dependencies:** Sessions 12, 18-21

**What to build:**
- Enhance `schedule_reminder` tool:
  - Time-based: "Remind me at 3pm" → absolute time trigger
  - Relative: "Remind me in 2 hours" → calculated absolute time
  - Event-based: "Remind me before the meeting" → linked to calendar event (requires Session 27)
  - Recurring: "Remind me every Monday" → cron-like pattern stored
- Reminder execution:
  - Heartbeat checks for due reminders every tick
  - Due reminder → push notification + in-app notification
  - Completed reminder → mark as done
- Reminder management:
  - `list_reminders` tool → show active reminders
  - `cancel_reminder` tool → mark as cancelled
  - Natural language: "Cancel the electrician reminder"
- Recurring reminder patterns stored in `routines` table

**Key files:**
- Modify: `apps/server/src/brain/tools.ts` (enhance reminder tools)
- Modify: `apps/server/src/brain/tool-executor.ts` (implement reminder features)
- Modify: `apps/server/src/jobs/heartbeat.ts` (check for due reminders)
- Create: `apps/server/src/jobs/__tests__/reminders.test.ts`

**Done when:**
- "Remind me to call the electrician at 3pm" → notification at 3pm
- "Remind me in 2 hours" → notification 2 hours later
- "Remind me every Monday to review finances" → recurring weekly notification
- "What reminders do I have?" → list of active reminders
- "Cancel the electrician reminder" → reminder cancelled
- Reminders trigger as push notifications (phone buzzes at the right time)

---

### Session 32: Habit Tracking (KNOWING → ACTING)

**Goal:** Edwin tracks Jan's habits — gym, sleep, supplements, diet — and holds him accountable with data, not nagging. "You've been to the gym 3 out of 5 days this week. Stronger than last week."

**Dependencies:** Sessions 1-6, 14, 16

**What to build:**
- Create `apps/server/src/tracking/habits.ts`:
  - Track: gym attendance, sleep time, meal quality, supplement intake
  - Data from: conversation mentions, explicit logging, pattern inference
  - Store in observations with category `habit_log`
  - Daily/weekly aggregation
- Accountability features:
  - Streak tracking (gym: 4 days in a row)
  - Comparison to previous weeks
  - Goal vs actual tracking
  - Motivational messaging calibrated by data, not feelings
- Habit tools:
  - `log_habit` — record a habit completion/skip
  - `get_habit_stats` — return this week's stats for a habit
- Accountability in conversation:
  - Edwin references habit data naturally: "Third gym session this week, sir. Keep it up."
  - Edwin notices declining streaks: "You usually hit the gym 4 times a week. This week you're at 1 with 2 days left."

**Key files:**
- Create: `apps/server/src/tracking/habits.ts`
- Create: `apps/server/src/tracking/__tests__/habits.test.ts`
- Modify: `apps/server/src/brain/tools.ts` (add habit tools)
- Modify: `apps/server/src/brain/tool-executor.ts` (implement)
- Modify: `apps/server/src/brain/reasoning-context.ts` (include habit stats)

**Done when:**
- "I went to the gym today" → logged, streak updated
- "How's my gym consistency?" → stats with comparison to last week
- Edwin proactively mentions habit data: "That's 4 days this week, sir"
- Declining patterns trigger accountability messages
- Stats are based on actual data, not vague encouragement

---

### Session 33: Financial Awareness (KNOWING → ACTING)

**Goal:** Edwin tracks Jan's spending, savings, and bills. Not full banking integration yet — manual entry and bill tracking. "You spent €150 on Wolt this week — that's €600/month at this rate."

**Dependencies:** Sessions 1-6, 12, 16

**What to build:**
- Activate the `bills` table (schema exists, nothing uses it):
  - Populate with known recurring bills
  - Track due dates, auto-pay status, payment history
  - Generate reminders before due dates
- Spending awareness:
  - Tool: `log_expense` — record a purchase (amount, category, description)
  - Tool: `get_spending` — summary of spending by category and period
  - Store expenses as observations with category `financial`
  - Weekly spending summary in reasoning context
- Bill management:
  - Tool: `list_bills` — show upcoming bills
  - Heartbeat checks for bills due in next 3 days → reminder notification
  - Track payment: "Did you pay the electricity bill?" → follow up
- Budget awareness:
  - Compare spending to goals
  - Flag unusual spending patterns
  - "You've spent €200 on dining out this month. Your target was €100."

**Key files:**
- Create: `apps/server/src/tracking/finances.ts`
- Create: `apps/server/src/tracking/__tests__/finances.test.ts`
- Modify: `apps/server/src/brain/tools.ts` (add financial tools)
- Modify: `apps/server/src/brain/tool-executor.ts` (implement)
- Modify: `apps/server/src/memory/store.ts` (bill query methods)
- Modify: `apps/server/src/jobs/heartbeat.ts` (bill due reminders)

**Done when:**
- "I spent €30 on Wolt" → logged, weekly total updated
- "How much have I spent on food this week?" → accurate answer from data
- Bill reminders appear before due dates
- Edwin flags concerning spending patterns
- Financial awareness is factual, not judgmental

---

### Session 34: People & Social Tracking (KNOWING → ACTING)

**Goal:** Edwin tracks Jan's social life — friends, contact frequency, relationship maintenance. "You haven't seen Markus in 3 weeks. Saturday looks free."

**Dependencies:** Sessions 1-6, 12

**What to build:**
- Activate the `people` table (schema exists, nothing uses it):
  - Populate through conversation mentions
  - Track: name, relationship, last contact, contact frequency goal
  - Tool: `add_person` — add someone to Jan's circle
  - Tool: `get_people` — list known contacts
- Social awareness:
  - Detect contact mentions in conversation ("Had lunch with Markus today")
  - Update `last_contact` automatically
  - Calculate contact gaps: "You haven't seen X in Y weeks"
  - Compare to `contact_frequency_goal`
- Proactive social suggestions:
  - Heartbeat checks for contact gaps
  - "You haven't hung out with anyone in two weeks. Saturday looks nice."
  - Suggest specific activities based on relationship and weather

**Key files:**
- Create: `apps/server/src/tracking/social.ts`
- Create: `apps/server/src/tracking/__tests__/social.test.ts`
- Modify: `apps/server/src/brain/tools.ts` (add social tools)
- Modify: `apps/server/src/brain/tool-executor.ts` (implement)
- Modify: `apps/server/src/memory/extractor.ts` (detect social mentions)
- Modify: `apps/server/src/jobs/heartbeat.ts` (social gap detection)

**Done when:**
- "I had lunch with Markus" → Markus's last_contact updated
- "Who haven't I seen in a while?" → list with contact gaps
- Heartbeat flags social isolation: "You haven't seen friends in 2 weeks"
- Social suggestions are specific and natural, not generic

---

### Session 35: Inventory & Restocking (KNOWING → ACTING)

**Goal:** Edwin tracks Jan's consumables — supplements, groceries, household items — and reminds or orders before he runs out.

**Dependencies:** Sessions 1-6, 12, 30

**What to build:**
- Activate the `items` table (schema exists, nothing uses it):
  - Track: name, category, quantity, reorder threshold, reorder link
  - Tool: `update_inventory` — update item quantity
  - Tool: `get_inventory` — list items by category
  - Tool: `add_item` — add new item to track
- Depletion prediction:
  - Estimate usage rate from restock frequency
  - Predict when items will run out
  - Alert before depletion: "You'll run out of creatine in ~5 days"
- Restock flow (stakes-based):
  - Low stakes (supplements, household): "Ordering creatine, arriving Thursday"
  - Medium stakes (groceries): "Should I add these to your shopping list?"
  - High stakes (expensive items): Propose with price
- Heartbeat integration: check inventory levels daily

**Key files:**
- Create: `apps/server/src/tracking/inventory.ts`
- Create: `apps/server/src/tracking/__tests__/inventory.test.ts`
- Modify: `apps/server/src/brain/tools.ts` (add inventory tools)
- Modify: `apps/server/src/brain/tool-executor.ts` (implement)
- Modify: `apps/server/src/jobs/heartbeat.ts` (inventory checks)

**Done when:**
- "I restocked creatine" → quantity updated
- "What supplements am I running low on?" → accurate list
- Edwin proactively warns before items run out
- Restock proposals match stakes framework
- Inventory stays current through conversation and manual updates

---

## Phase 7: Deep Intelligence (Sessions 36-40)

The brain's highest functions. Weekly reviews, long-term tracking, course correction. Edwin sees the big picture and keeps Jan on the path to his vision.

---

### Session 36: Weekly Review & Reflection

**Goal:** Every Sunday evening, Edwin generates a comprehensive weekly review — what happened, what was accomplished, what was missed, patterns observed, and suggestions for next week.

**Dependencies:** Sessions 1-6, 5 (compression), 14, 16, 32-33

**What to build:**
- Create `apps/server/src/jobs/weekly-review.ts`:
  - Pull all weekly summaries, habit data, spending data, social data
  - Pull patterns detected this week
  - Pull goal progress
  - Generate comprehensive review via Claude
- Review sections:
  - Accomplishments (what went well)
  - Missed items (what didn't happen, why)
  - Habit report (gym/sleep/diet stats with trends)
  - Financial snapshot (spending vs targets)
  - Social activity (who was seen, gaps)
  - Patterns observed (new insights)
  - Next week focus (top 3 priorities)
- Store in `weekly_summaries` table
- Deliver as notification + detailed view in app
- Schedule: Sunday 7:00 PM

**Key files:**
- Create: `apps/server/src/jobs/weekly-review.ts`
- Modify: `apps/server/src/jobs/scheduler.ts` (Sunday cron)
- Create: `apps/server/src/routes/review.ts` (GET weekly review)
- Modify: `apps/web/app/page.tsx` (display weekly review summary)

**Done when:**
- Sunday evening → comprehensive weekly review generated
- Review includes real data from habits, spending, social, patterns
- Review is insightful, not just a data dump
- Stored in weekly_summaries for long-term trend analysis
- Delivered as notification to Jan

---

### Session 37: Goal Tracking & Vision Progress

**Goal:** Edwin tracks Jan's progress toward his 5-year vision — net worth, fitness, career, relationships. Not daily minutiae but monthly/quarterly trajectory. "You're 8% toward your net worth goal. At current savings rate, you'll reach it in 7 years — we need to accelerate."

**Dependencies:** Sessions 1-6, 32-33, 36

**What to build:**
- Create `apps/server/src/tracking/goals.ts`:
  - Map identity goals to measurable metrics
  - €6M net worth → current net worth, savings rate, projected timeline
  - €15M revenue → current revenue, growth rate, projected timeline
  - Perfect fitness → gym consistency, weight trend, health markers
  - Social goals → contact frequency, relationship quality
- Progress calculation:
  - Current value vs target value → percentage
  - Rate of change → projected completion date
  - Acceleration needed → if behind schedule
- Monthly goal review (first of each month):
  - Progress snapshot
  - Trajectory analysis
  - Course correction suggestions
- Goal progress available in reasoning context for motivational messaging:
  - "Every gym session brings you closer to the shape you want to be in"
  - "At this savings rate, the Vienna apartment is X years away"

**Key files:**
- Create: `apps/server/src/tracking/goals.ts`
- Create: `apps/server/src/tracking/__tests__/goals.test.ts`
- Modify: `apps/server/src/brain/reasoning-context.ts` (include goal progress)
- Modify: `apps/server/src/jobs/scheduler.ts` (monthly goal review cron)

**Done when:**
- Edwin can state progress toward specific 5-year goals with percentages
- Monthly review includes trajectory analysis
- Edwin uses goal data in motivational messaging
- Behind-schedule goals get escalated priority
- Progress is based on real tracked data, not assumptions

---

### Session 38: Conflict Resolution & Trade-off Analysis (THINKING)

**Goal:** When Jan faces conflicting priorities, Edwin helps him navigate. "You want to go out tonight but you have a deadline tomorrow. Here's my suggestion..." Not just flagging conflicts — recommending resolutions.

**Dependencies:** Sessions 1-6, 13, 16-17

**What to build:**
- Create `apps/server/src/brain/thinking/conflict-resolver.ts`:
  - Detect conflicts in Jan's schedule, commitments, and desires
  - Analyze trade-offs: what does each option cost and gain?
  - Recommend based on priorities, patterns, and goals
- Conflict types:
  - Schedule: two commitments at the same time
  - Priority: wants to do X but should do Y
  - Resource: can afford X or Y but not both
  - Energy: wants to do everything but is exhausted
- Resolution strategies:
  - Reschedule the less important item
  - Combine activities ("run to the meeting")
  - Defer with follow-up ("do Y now, X on Saturday")
  - Accept trade-off with eyes open ("if you skip gym, you break the streak")
- Conflict detection feeds into reasoning and heartbeat

**Key files:**
- Create: `apps/server/src/brain/thinking/conflict-resolver.ts`
- Create: `apps/server/src/brain/thinking/__tests__/conflict-resolver.test.ts`
- Modify: `apps/server/src/brain/reasoning-context.ts` (include detected conflicts)

**Done when:**
- Edwin detects when commitments or desires conflict
- Proposals include trade-off analysis
- Recommendations are clear, actionable, and aligned with priorities
- Edwin doesn't just flag problems — he suggests solutions

---

### Session 39: Emotional Intelligence Engine (UNDERSTANDING → TRUSTING)

**Goal:** Edwin's emotional intelligence becomes sophisticated. He knows when to push, when to back off, when to distract, when to celebrate, and when to just be present. Not from rules — from understanding.

**Dependencies:** Sessions 8-11, 14-15

**What to build:**
- Create `apps/server/src/brain/understanding/emotional-intelligence.ts`:
  - Synthesize: mood detection + patterns + predictions + context
  - Decision: what emotional response does Jan need right now?
  - Response modes:
    - **Push**: Jan is avoiding, needs accountability
    - **Support**: Jan is struggling, needs empathy first then help
    - **Celebrate**: Jan accomplished something, amplify the win
    - **Distract**: Jan is spiraling, break the pattern
    - **Be present**: Jan needs company, not advice
    - **Be quiet**: Jan needs space
  - Mode selection based on emotional trajectory (not just current state):
    - Getting better → encourage
    - Getting worse → intervene
    - Stable good → maintain
    - Stable bad → escalate approach
- Emotional intelligence overrides default behavior when needed
- Track effectiveness: when Edwin pushes, does Jan respond positively?

**Key files:**
- Create: `apps/server/src/brain/understanding/emotional-intelligence.ts`
- Create: `apps/server/src/brain/understanding/__tests__/emotional-intelligence.test.ts`
- Modify: `apps/server/src/soul/soul-filter.ts` (use EI engine for response calibration)
- Modify: `apps/server/src/brain/pipeline.ts` (wire EI into response generation)

**Done when:**
- Edwin pushes when Jan is avoiding, not when he's genuinely overwhelmed
- Edwin celebrates wins enthusiastically
- Edwin recognizes spirals and breaks patterns
- Edwin knows when silence is the right response
- Emotional responses feel human, not algorithmic

---

### Session 40: Conversation Memory & Relationship Deepening (TRUSTING)

**Goal:** Edwin's relationship with Jan deepens over time. He references shared history, inside jokes, past wins, past struggles. The relationship has a sense of history, not just data.

**Dependencies:** Sessions 1-6, 36-37

**What to build:**
- Create `apps/server/src/memory/relationship.ts`:
  - Track significant moments: big wins, tough days, funny exchanges, meaningful conversations
  - Store as observations with category `milestone` and no expiry
  - Milestone types: achievement, struggle, humor, growth, connection
- Relationship features:
  - Reference shared history: "Remember when you landed that €50k contract? Same energy."
  - Acknowledge anniversaries: "One month of consistent gym. That's never happened before."
  - Track the relationship itself: how long have they been interacting? Key moments?
  - Inside references: things that come up repeatedly become shared language
- Milestone detection in extractor:
  - After extraction, evaluate: "Is this a significant moment worth remembering long-term?"
  - If yes → store as milestone
- Surface milestones in reasoning context when emotionally relevant

**Key files:**
- Create: `apps/server/src/memory/relationship.ts`
- Create: `apps/server/src/memory/__tests__/relationship.test.ts`
- Modify: `apps/server/src/memory/extractor.ts` (milestone detection)
- Modify: `apps/server/src/brain/reasoning-context.ts` (include milestones when relevant)

**Done when:**
- Edwin references past achievements during slumps: "You've overcome worse, sir"
- Edwin acknowledges streaks and anniversaries
- Significant moments are stored permanently
- The relationship feels like it has history, not just data
- Shared references emerge naturally from repeated interactions

---

## Deep Profiling (Before or After Session 40)

**This is not a code session — it's a conversation session.**

Edwin needs to deeply understand Jan. Not from scattered observations over months, but from a structured, intentional profiling conversation. This happens in two stages:

### Stage 1: Jan ↔ Claude Code — The Deep Interview

Jan has a long, structured conversation with Claude Code (this tool, not Edwin). Topics:
- Daily routines (actual, not aspirational): wake time, meals, work pattern, wind-down
- Triggers: what makes Jan procrastinate, what gets him moving, what shuts him down
- Relationships: who matters, how often, what's the dynamic
- Financial reality: income, expenses, savings rate, debt, spending patterns, weak spots
- Health: current fitness level, gym history, diet patterns, sleep quality, supplements
- Work: client types, revenue streams, what's working, what's not, pipeline, goals
- Personality: conflict style, decision style, social battery, introvert/extrovert balance
- Fears, insecurities, what he avoids talking about
- What has worked before (apps, systems, habits that stuck vs didn't)
- What Edwin should never do (annoy patterns, wrong timing, tone mistakes)

Output: A structured profile document — `jan-deep-profile.json` or similar — with high-confidence `told` observations across every category.

### Stage 2: Seed into Edwin's Memory

- Import the profile as observations with `source='told'` and `confidence=1.0`
- These become Edwin's baseline knowledge — not guesses, not inferences, but facts Jan directly stated
- Edwin's own observations (from conversations) layer on top: confirming, updating, discovering new things
- Over time, Edwin's lived observations may supersede seeded profile data — and that's correct

### Stage 3: Edwin's Own Profiling (Ongoing)

- Edwin continuously profiles Jan through the existing extraction → profiling pipeline (Sessions 1-4)
- The deep profile is the foundation; Edwin's daily observations are the evolution
- Contradictions between seeded profile and observed behavior are resolved via the existing superseding system (Session 3)
- Edwin should eventually know Jan better than the seed profile — that's the goal

**This is not optional.** Without the deep profile, Edwin spends weeks learning basics that could be established in one conversation. The profiling conversation should happen once the core brain is built (after Session 12 at minimum, ideally after Session 40).

---

## Future Sessions (Beyond 40)

Each is independent work once the core brain is built:

- **Voice Quality Optimization** — Test ElevenLabs models, find the right voice
- **Voice Conversations** — Real-time voice dialogue, not just TTS
- **Banking Integration** — Open Banking API for real spending data
- **Booking Integration** — Treatwell/Booksy for appointments
- **Delivery Integration** — Wolt/grocery ordering
- **Email Monitoring** — Track bills, appointments from email
- **Workout Tracker** — Dedicated gym logging interface
- **Dashboard Evolution** — Progress views, financial charts, habit heatmaps
- **PWA Enhancement** — Offline mode, background sync

---

## Execution Rules

**For each session:**
1. Read `EDWIN_SOUL.md`, `CLAUDE.md`, and this plan
2. Read the relevant existing source files listed in the session
3. Plan TDD steps at session start
4. Build substance, not scaffolding
5. Test with real interactions
6. Commit working code
7. Deploy if appropriate

**Dependencies are strict.** Don't start a session before its dependencies are complete.

**Session 7 (Streaming) has no dependencies on Phase 1** — it can run in parallel with Sessions 1-6.

**Each session is one focused block of work** — 2-4 hours. Don't combine sessions. Don't skip ahead. Build the brain one neuron at a time.

**From the mandate:** "Does this make Edwin think better, remember more, understand deeper, or act smarter?" If no, it can wait.
