# Edwin Foundation Design

Before reading this document, read `EDWIN_SOUL.md`. Every decision here serves it.

---

## Architecture

| Layer | Tech | Hosted On |
|---|---|---|
| Frontend | Next.js + Tailwind CSS (PWA) | Vercel |
| Backend | Node.js (Fastify/Express), persistent process | Railway or Fly.io |
| Database | SQLite on disk | Backend server |
| AI Brain | Claude API | Called from backend |
| Voice (TTS) | ElevenLabs | Called from backend |
| Voice (STT) | Web Speech API | Browser-native |
| Push Notifications | Web Push / Firebase | Backend triggers |

- Monorepo with pnpm workspaces
- Frontend and backend share types, deploy independently
- Persistent backend ensures no serverless limitations — real cron, WebSockets, background processing
- Single user. No auth system, no multi-tenancy.

---

## Project Structure

```
edwin/
├── apps/
│   ├── web/                        # Next.js frontend (PWA) -> Vercel
│   │   ├── app/                    # App Router pages
│   │   │   ├── (dashboard)/        # Dashboard views
│   │   │   ├── chat/               # Chat interface
│   │   │   ├── voice/              # Voice call screen
│   │   │   └── layout.tsx          # Root layout
│   │   ├── components/             # UI components
│   │   ├── hooks/                  # React hooks
│   │   ├── lib/                    # Client utilities
│   │   ├── public/                 # PWA manifest, icons
│   │   └── styles/                 # Tailwind config, globals
│   │
│   └── server/                     # Node.js backend -> Railway
│       ├── src/
│       │   ├── soul/               # WHO Edwin is
│       │   │   ├── identity.ts         # Core truths, relationship to Jan, "sir"
│       │   │   ├── personality.ts      # Tone rules: when to be what
│       │   │   ├── motivators.ts       # Guilt, competition, accountability
│       │   │   ├── boundaries.ts       # When to push, when to be quiet
│       │   │   ├── voice-profiles.ts   # The 4 voice options
│       │   │   └── prompt-builder.ts   # Composes system prompt dynamically
│       │   │
│       │   ├── brain/              # HOW Edwin thinks (serves the soul)
│       │   │   ├── pipeline.ts         # Perceive -> Reason -> Decide -> Act
│       │   │   ├── context.ts          # Builds full context for each interaction
│       │   │   ├── reasoning.ts        # Claude API integration
│       │   │   └── decisions.ts        # Stakes-based action logic
│       │   │
│       │   ├── memory/             # WHAT Edwin knows about Jan
│       │   │   ├── store.ts            # Read/write/query memory (SQLite)
│       │   │   ├── profiler.ts         # Continuous observation & pattern detection
│       │   │   ├── schema.ts           # Memory table definitions
│       │   │   └── seed/               # Pre-seeded knowledge
│       │   │       └── jan-profile.ts  # Everything from conversations
│       │   │
│       │   ├── voice/              # HOW Edwin speaks and listens
│       │   │   ├── speak.ts            # ElevenLabs TTS
│       │   │   ├── listen.ts           # STT coordination
│       │   │   └── conversation.ts     # Voice conversation loop
│       │   │
│       │   ├── conversations/      # Dialogue management
│       │   │   ├── manager.ts          # Session tracking, active state
│       │   │   └── history.ts          # Storage & retrieval of past exchanges
│       │   │
│       │   ├── integrations/       # The external world (grows with phases)
│       │   │   ├── weather.ts
│       │   │   ├── calendar.ts
│       │   │   └── push.ts
│       │   │
│       │   ├── jobs/               # Edwin's initiative
│       │   │   ├── scheduler.ts        # Job orchestration
│       │   │   ├── morning.ts          # Morning briefing
│       │   │   ├── reminders.ts        # Throughout-day nudges
│       │   │   └── evening.ts          # Evening wind-down
│       │   │
│       │   ├── routes/             # API endpoints
│       │   ├── db/                 # SQLite schema, migrations
│       │   └── index.ts            # Server entry point
│       │
│       └── data/                   # SQLite database file
│
├── packages/
│   └── shared/                     # Shared types, constants, API contracts
│       ├── types/
│       └── constants/
│
├── docs/
│   └── plans/                      # Design docs
│
├── EDWIN_SOUL.md                   # The monument
├── VISION.md                       # The vision
└── package.json                    # Monorepo root (pnpm workspaces)
```

---

## Memory Architecture

Three tiers of knowledge:

### Tier 1: Identity (rarely changes)
Core truths — goals, values, vision, personality, motivators, weaknesses. Pre-seeded from conversations. Updated only when Jan's fundamental direction shifts.

### Tier 2: Operational Profile (changes regularly)
Working knowledge for daily use — friends + last contact, supplement stack, current bills + due dates, gym routine, work schedule, financial accounts, habits, apartment inventory. Filled by onboarding, maintained by Edwin.

### Tier 3: Living Context (changes constantly)
Recent patterns, mood trends, what worked/didn't this week, behavioral observations, sleep patterns, spending trends, social frequency. Edwin writes these himself from interactions and data.

### Technical implementation
- SQLite with structured tables (not a JSON blob)
- Each memory has: category, confidence level, source (told / observed / inferred), last updated
- Edwin can query his own memory instantly
- Observations get promoted to profile facts when confirmed across multiple data points
- Old context compressed into summaries (weekly -> monthly -> quarterly)

---

## Voice System

Voice is CORE to Edwin's identity, not an add-on.

### Bidirectional voice conversation loop (client-driven)
1. Jan taps accept / opens voice -> browser mic activates
2. Jan speaks -> Web Speech API (browser-native) -> text
3. Text sent to backend -> brain pipeline processes with full context
4. Response -> ElevenLabs TTS -> audio stream returned
5. Audio plays -> loop continues

### Call initiation
- Backend job triggers push notification: "Edwin would like a word, sir."
- Jan taps -> app opens -> voice conversation begins
- Edwin speaks first, Jan responds

### Edwin addresses Jan as "sir" — always.

---

## Database Schema

```sql
-- Tier 1: Who Jan is (rarely changes)
CREATE TABLE identity (
    id INTEGER PRIMARY KEY,
    category TEXT NOT NULL,        -- goals, personality, business, preferences
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    source TEXT NOT NULL,           -- told, observed, inferred
    confidence REAL DEFAULT 1.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category, key)
);

-- Tier 2: People in Jan's life
CREATE TABLE people (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    relationship TEXT,
    last_contact DATETIME,
    contact_frequency_goal TEXT,    -- weekly, biweekly, monthly
    notes TEXT,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tier 2: Items Jan uses regularly
CREATE TABLE items (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,         -- supplement, grocery, household
    quantity INTEGER,
    reorder_threshold INTEGER,
    reorder_link TEXT,
    last_restocked DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tier 2: Recurring bills
CREATE TABLE bills (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    amount REAL,
    currency TEXT DEFAULT 'EUR',
    due_day INTEGER,
    frequency TEXT,                 -- monthly, quarterly, yearly
    auto_pay BOOLEAN DEFAULT 0,
    last_paid DATETIME,
    next_due DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tier 2: Routines and schedules
CREATE TABLE routines (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,             -- gym, supplement, skincare, sleep
    schedule TEXT,                  -- cron-like or descriptive
    details TEXT,                   -- JSON with routine specifics
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tier 3: Edwin's observations about Jan
CREATE TABLE observations (
    id INTEGER PRIMARY KEY,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    confidence REAL DEFAULT 0.5,
    source TEXT NOT NULL,           -- observed, inferred
    observed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME
);

-- Conversation tracking
CREATE TABLE conversations (
    id INTEGER PRIMARY KEY,
    channel TEXT NOT NULL,          -- chat, voice, notification
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    summary TEXT,
    mood TEXT
);

CREATE TABLE messages (
    id INTEGER PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id),
    role TEXT NOT NULL,             -- edwin, jan
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Compressed history
CREATE TABLE weekly_summaries (
    id INTEGER PRIMARY KEY,
    week_start DATE NOT NULL,
    highlights TEXT,
    concerns TEXT,
    patterns TEXT,
    mood_trend TEXT
);

-- Edwin's scheduled actions and proposals
CREATE TABLE scheduled_actions (
    id INTEGER PRIMARY KEY,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    trigger_time DATETIME,
    status TEXT DEFAULT 'pending',  -- pending, proposed, accepted, declined, done
    stakes_level TEXT,              -- low, medium, high
    response TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## UI Surfaces

All surfaces are views into one intelligence.

### Mobile (Daily Companion)

- **Voice Call Screen** — Full screen when active. Edwin's avatar/waveform, mute/end buttons. The primary relationship surface.
- **Chat** — WhatsApp-like. Edwin initiates (proposals, nudges, questions). Jan responds. Voice messages supported.
- **Dashboard (Quick Glance)** — Today's schedule, pending actions, reminders, streaks. Adaptive — only shows what's relevant.
- **Notifications** — "Edwin would like a word, sir." Tapping opens the relevant surface.

### Desktop (Control Room)

Everything mobile has, plus:

- **Full Dashboard** — Wider, denser. Side-by-side panels. Schedule + tasks + weather + financial overview + health stats.
- **Financial View** — Spending breakdown, savings progress, budget tracking, trends.
- **Progress** — Long-term tracking. Weight, strength, finances, habits, social. Visual proof Edwin is working.
- **Memory/Profile** — Jan can see and correct what Edwin knows about him. Full transparency.

### Layout

```
Mobile:  Bottom nav -> Dashboard | Chat | Voice | Menu
Desktop: Sidebar nav -> Dashboard (expandable panels)
                        Chat (collapsible right panel, always accessible)
                        Voice (overlay when active)
                        Financial / Progress / Memory (full pages)
```

Chat is always one click away on desktop. Edwin is never hidden.

---

## Phase 1 Scope

Phase 1 must achieve one thing: Jan opens Edwin and feels like someone is there.

### Phase 1 delivers:

1. **Edwin's Soul in Code** — `soul/` fully implemented. Every Claude API call goes through the soul. Edwin never speaks without character.

2. **Chat (Bidirectional)** — Mobile-first chat interface. Edwin initiates, Jan responds. Push notification -> opens chat. Full conversation history stored and summarized. Memory across conversations.

3. **Voice (Bidirectional)** — Edwin speaks every message (ElevenLabs TTS). Jan responds by voice (Web Speech API). Voice call screen. One voice to start: calm butler (the Alfred voice).

4. **Memory System** — SQLite with full schema running. Pre-seeded with Jan's profile. Edwin reads and writes memory on every interaction. Profiler starts observing from day one.

5. **Morning Briefing** — First scheduled job. Every morning at 5:30. Push notification: "Good morning, sir." Edwin speaks: weather, schedule, motivation, one focus for today.

6. **Dashboard (Basic)** — Today's date, weather, schedule at a glance. Chat accessible from dashboard. Desktop: wider layout with chat panel.

### Phase 1 does NOT include:
- Financial tracking or banking
- Workout tracker
- Inventory management
- Appointment booking
- Friend tracking
- Event discovery
- Multiple voice options

### Phase 1 success criteria:
> Jan wakes up to Edwin's voice every morning, talks to him throughout the day, and feels like someone has his back.

---

## Design Decisions Log

| Decision | Choice | Reason |
|---|---|---|
| Hosting model | Persistent backend, not serverless | Full vision requires background jobs, WebSockets, no timeouts |
| Database | SQLite on disk | Single user, simple, fast, no external service needed |
| Monorepo | pnpm workspaces | Shared types, independent deploys, one repo |
| Voice architecture | Client-driven loop | No telephony needed, browser handles mic/audio |
| Memory model | Structured tables, 3 tiers | Doctor's chart, not transcript. Fast queries, clean evolution |
| Soul in code | Top-level `soul/` directory | Edwin's identity is the most important code in the system |
| System prompts | Dynamic composition, not templates | Edwin adapts to context, not time-of-day slots |

---

## Status

- [x] Architecture confirmed
- [x] Project structure confirmed
- [x] Memory architecture confirmed
- [x] Voice system confirmed
- [x] Database schema confirmed
- [x] UI surfaces confirmed
- [x] Phase 1 scope confirmed
- [ ] Implementation plan
