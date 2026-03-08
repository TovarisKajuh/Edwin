# Edwin — Four Workstreams Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build Edwin's four next features in order: news intelligence, desktop control room, mobile optimization, and notification/alarm system.

**Architecture:** Each workstream extends the existing Fastify + Next.js + SQLite stack. News adds server-side RSS crawling with DB persistence and push alerts. Desktop control room replaces the basic dashboard with a multi-panel command center. Mobile optimizes the PWA for phone use. Notifications enhance the existing push system with morning alarm flow and call-like UI.

**Tech Stack:** Fastify, Next.js 16, Tailwind CSS 4, SQLite (better-sqlite3), Web Push API, ElevenLabs TTS, Claude Sonnet, node-cron

---

## Workstream 1: News Intelligence System

**Current state:** Two RSS feeds (PV Magazine, Renewables Now), 12-hour in-memory cache, keyword-based relevance filter, integrated into morning briefing (2 items) and Claude tools (3 items). File: `apps/server/src/integrations/news.ts`.

**What we're building:** A full news intelligence layer — more sources, persistent storage, relevance scoring, push alerts for important news, and a news feed UI.

---

### Task 1: Add `news_items` table to database

**Files:**
- Modify: `apps/server/src/db/schema.ts`
- Modify: `apps/server/src/db/database.ts`
- Test: `apps/server/src/integrations/__tests__/news.test.ts`

**Step 1: Add schema**

In `apps/server/src/db/schema.ts`, add to the `SCHEMA` string:

```sql
CREATE TABLE IF NOT EXISTS news_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  link TEXT NOT NULL UNIQUE,
  summary TEXT,
  topic TEXT,
  relevance_score REAL DEFAULT 0.0,
  published_at TEXT,
  fetched_at TEXT NOT NULL,
  seen INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_news_items_published ON news_items(published_at);
CREATE INDEX IF NOT EXISTS idx_news_items_relevance ON news_items(relevance_score);
```

**Step 2: Run tests to make sure nothing broke**

Run: `cd apps/server && pnpm test`
Expected: All 816+ tests pass (schema addition is additive).

**Step 3: Commit**

```bash
git add apps/server/src/db/schema.ts
git commit -m "feat(news): add news_items table for persistent news storage"
```

---

### Task 2: Expand RSS feeds and add relevance scoring

**Files:**
- Modify: `apps/server/src/integrations/news.ts`
- Test: `apps/server/src/integrations/__tests__/news.test.ts`

**Step 1: Write failing tests for new feeds and scoring**

Add to `news.test.ts`:

```typescript
describe('Relevance scoring', () => {
  it('should score solar industry news higher than general news', () => {
    const solarItem = { title: 'New solar panel efficiency record', source: 'PV Magazine', link: '', publishedAt: '', summary: 'Breakthrough in photovoltaic cells' };
    const generalItem = { title: 'Local sports team wins', source: 'BBC', link: '', publishedAt: '', summary: 'Football results' };
    expect(scoreRelevance(solarItem)).toBeGreaterThan(scoreRelevance(generalItem));
  });

  it('should score Austria/EU news with moderate relevance', () => {
    const item = { title: 'EU announces new energy policy', source: 'Reuters', link: '', publishedAt: '', summary: 'European Commission proposes renewable targets' };
    expect(scoreRelevance(item)).toBeGreaterThan(0.3);
  });

  it('should score breaking world news as high relevance', () => {
    const item = { title: 'Major earthquake strikes Turkey', source: 'Reuters', link: '', publishedAt: '', summary: 'Magnitude 7.2 earthquake, casualties reported' };
    expect(scoreRelevance(item)).toBeGreaterThan(0.5);
  });

  it('should return 0 for irrelevant celebrity gossip', () => {
    const item = { title: 'Celebrity spotted at restaurant', source: 'TMZ', link: '', publishedAt: '', summary: '' };
    expect(scoreRelevance(item)).toBeLessThan(0.1);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd apps/server && pnpm test -- news.test.ts`
Expected: FAIL — `scoreRelevance` not exported.

**Step 3: Implement expanded feeds and scoring**

In `apps/server/src/integrations/news.ts`:

```typescript
// Expanded feed list
const RSS_FEEDS = [
  // Solar / Energy (Jan's industry)
  { url: 'https://www.pv-magazine.com/feed/', source: 'PV Magazine', topic: 'solar' },
  { url: 'https://renewablesnow.com/news/feed/', source: 'Renewables Now', topic: 'renewables' },
  { url: 'https://cleantechnica.com/feed/', source: 'CleanTechnica', topic: 'cleantech' },
  // World / Business
  { url: 'https://feeds.reuters.com/reuters/topNews', source: 'Reuters', topic: 'world' },
  { url: 'https://feeds.reuters.com/reuters/businessNews', source: 'Reuters Business', topic: 'business' },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC World', topic: 'world' },
  // EU / Regional
  { url: 'https://www.euronews.com/rss', source: 'Euronews', topic: 'europe' },
];

// Tiered keyword scoring
const KEYWORD_TIERS: { weight: number; words: string[] }[] = [
  { weight: 1.0, words: ['solar', 'photovoltaic', 'pv', 'avesol', 'energy storage'] },
  { weight: 0.8, words: ['renewable', 'battery', 'grid', 'inverter', 'esco', 'ppa'] },
  { weight: 0.6, words: ['austria', 'austrian', 'slovenia', 'maribor', 'graz', 'eu energy'] },
  { weight: 0.5, words: ['eu', 'european commission', 'subsidy', 'tariff', 'regulation'] },
  { weight: 0.4, words: ['business', 'startup', 'investment', 'funding', 'acquisition'] },
  { weight: 0.7, words: ['war', 'earthquake', 'crisis', 'emergency', 'attack', 'pandemic'] },
  { weight: 0.3, words: ['technology', 'ai', 'climate', 'economy', 'finance', 'stock'] },
];

export function scoreRelevance(item: { title: string; summary: string | null }): number {
  const text = `${item.title} ${item.summary || ''}`.toLowerCase();
  let maxScore = 0;
  for (const tier of KEYWORD_TIERS) {
    for (const word of tier.words) {
      if (text.includes(word)) {
        maxScore = Math.max(maxScore, tier.weight);
      }
    }
  }
  return maxScore;
}
```

**Step 4: Run tests**

Run: `cd apps/server && pnpm test -- news.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/server/src/integrations/news.ts apps/server/src/integrations/__tests__/news.test.ts
git commit -m "feat(news): expand to 7 RSS feeds with tiered relevance scoring"
```

---

### Task 3: Persist news items to database

**Files:**
- Modify: `apps/server/src/memory/store.ts`
- Modify: `apps/server/src/integrations/news.ts`
- Test: `apps/server/src/integrations/__tests__/news.test.ts`

**Step 1: Add store methods**

In `apps/server/src/memory/store.ts`:

```typescript
saveNewsItem(item: {
  title: string; source: string; link: string;
  summary: string | null; topic: string;
  relevanceScore: number; publishedAt: string;
}): number {
  const stmt = this.db.raw().prepare(`
    INSERT OR IGNORE INTO news_items (title, source, link, summary, topic, relevance_score, published_at, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(item.title, item.source, item.link, item.summary, item.topic, item.relevanceScore, item.publishedAt, new Date().toISOString());
  return result.lastInsertRowid as number;
}

getRecentNews(limit = 20, minRelevance = 0.0): Array<{
  id: number; title: string; source: string; link: string;
  summary: string | null; topic: string; relevance_score: number;
  published_at: string; seen: boolean;
}> {
  const stmt = this.db.raw().prepare(`
    SELECT * FROM news_items
    WHERE relevance_score >= ?
    ORDER BY published_at DESC
    LIMIT ?
  `);
  return stmt.all(minRelevance, limit).map((r: any) => ({ ...r, seen: !!r.seen }));
}

getUnseenHighRelevanceNews(threshold = 0.6): Array<{
  id: number; title: string; source: string; relevance_score: number;
}> {
  const stmt = this.db.raw().prepare(`
    SELECT id, title, source, relevance_score FROM news_items
    WHERE relevance_score >= ? AND seen = 0
    ORDER BY relevance_score DESC
    LIMIT 5
  `);
  return stmt.all(threshold);
}

markNewsSeen(id: number): void {
  this.db.raw().prepare('UPDATE news_items SET seen = 1 WHERE id = ?').run(id);
}
```

**Step 2: Update `getNews()` to persist items**

Modify the existing `getNews()` function to call `store.saveNewsItem()` for each fetched item after scoring.

**Step 3: Run tests**

Run: `cd apps/server && pnpm test`
Expected: All pass.

**Step 4: Commit**

```bash
git commit -m "feat(news): persist scored news items to database"
```

---

### Task 4: News alerts via push notifications

**Files:**
- Modify: `apps/server/src/jobs/heartbeat.ts`
- Test: `apps/server/src/jobs/__tests__/heartbeat.test.ts`

**Step 1: Add news check to heartbeat**

In the heartbeat function, after the existing reminder/calendar/bill checks, add:

```typescript
// Check for unseen high-relevance news
const urgentNews = store.getUnseenHighRelevanceNews(0.7);
for (const item of urgentNews) {
  store.markNewsSeen(item.id);
  await sendPushToAll(store, {
    title: `Edwin — ${item.source}`,
    body: item.title,
    url: '/news',
  });
}
```

**Step 2: Run tests**

Run: `cd apps/server && pnpm test -- heartbeat.test.ts`
Expected: PASS (new code is additive, existing tests unaffected).

**Step 3: Commit**

```bash
git commit -m "feat(news): push alerts for high-relevance news via heartbeat"
```

---

### Task 5: News API route

**Files:**
- Create: `apps/server/src/routes/news.ts`
- Modify: `apps/server/src/index.ts`

**Step 1: Create the route**

```typescript
// apps/server/src/routes/news.ts
import type { FastifyInstance } from 'fastify';
import type { MemoryStore } from '../memory/store.js';

export async function newsRoutes(server: FastifyInstance, store: MemoryStore) {
  // Get recent news items
  server.get('/api/news', async (request) => {
    const query = request.query as { limit?: string; minRelevance?: string };
    const limit = parseInt(query.limit || '20');
    const minRelevance = parseFloat(query.minRelevance || '0');
    return { items: store.getRecentNews(limit, minRelevance) };
  });

  // Mark item as seen
  server.post<{ Params: { id: string } }>('/api/news/:id/seen', async (request) => {
    store.markNewsSeen(parseInt(request.params.id));
    return { ok: true };
  });
}
```

**Step 2: Register in index.ts**

```typescript
import { newsRoutes } from './routes/news.js';
// ... after other route registrations:
await newsRoutes(server, store);
```

**Step 3: Commit**

```bash
git commit -m "feat(news): add /api/news endpoint for frontend consumption"
```

---

### Task 6: News feed cron job

**Files:**
- Create: `apps/server/src/jobs/news-fetcher.ts`
- Modify: `apps/server/src/jobs/scheduler.ts`

**Step 1: Create dedicated news fetch job**

```typescript
// apps/server/src/jobs/news-fetcher.ts
import { getNews, scoreRelevance } from '../integrations/news.js';
import type { MemoryStore } from '../memory/store.js';

export async function runNewsFetcher(store: MemoryStore): Promise<number> {
  const feed = await getNews();
  let saved = 0;
  for (const item of feed.items) {
    const score = scoreRelevance(item);
    if (score > 0.1) {
      store.saveNewsItem({
        title: item.title,
        source: item.source,
        link: item.link,
        summary: item.summary,
        topic: '', // derived from feed
        relevanceScore: score,
        publishedAt: item.publishedAt,
      });
      saved++;
    }
  }
  console.log(`[News] Fetched and scored ${saved} items`);
  return saved;
}
```

**Step 2: Add to scheduler — run every 4 hours**

In `scheduler.ts`:

```typescript
import { runNewsFetcher } from './news-fetcher.js';

// Every 4 hours: 06:00, 10:00, 14:00, 18:00
cron.schedule('0 6,10,14,18 * * *', () => runNewsFetcher(store), { timezone });
```

**Step 3: Commit**

```bash
git commit -m "feat(news): scheduled fetcher runs every 4 hours, persists scored items"
```

---

### Task 7: Frontend news page

**Files:**
- Create: `apps/web/app/news/page.tsx`
- Modify: `apps/web/lib/api.ts`
- Modify: `apps/web/components/layout/nav.tsx`

**Step 1: Add API function**

In `apps/web/lib/api.ts`:

```typescript
export interface NewsItem {
  id: number;
  title: string;
  source: string;
  link: string;
  summary: string | null;
  topic: string;
  relevance_score: number;
  published_at: string;
  seen: boolean;
}

export async function getNews(): Promise<NewsItem[]> {
  const res = await fetch(`${API_URL}/api/news?limit=30&minRelevance=0.2`, {
    headers: { ...getAuthHeaders() },
  });
  if (res.status === 401) throw new AuthError();
  if (!res.ok) throw new Error(`News error: ${res.status}`);
  const data = await res.json();
  return data.items;
}
```

**Step 2: Create news page**

`apps/web/app/news/page.tsx` — A scrollable feed of news cards:
- Source badge (colored by topic: amber=solar, blue=world, green=europe, gray=business)
- Title (linked to original article)
- Summary (truncated)
- Relevance indicator (dot color: red > 0.7, amber > 0.4, gray otherwise)
- "Published X hours ago" relative timestamp
- Dark theme matching existing UI (zinc-900 cards, zinc-800 borders)

**Step 3: Add to navigation**

Add "News" to both `Sidebar` and `BottomNav` in `apps/web/components/layout/nav.tsx`.

**Step 4: Commit**

```bash
git commit -m "feat(news): frontend news page with relevance-scored feed"
```

---

## Workstream 2: Desktop Control Room

**Current state:** Basic dashboard showing greeting, weather widget, schedule list, and pending actions. Single-column on mobile, two-column on desktop. File: `apps/web/app/page.tsx`.

**What we're building:** A full command center — multi-panel dashboard with live data, quick actions, and a dark "mission control" aesthetic. Desktop-first design. The center of Jan's digital life.

---

### Task 8: Dashboard data expansion (server)

**Files:**
- Modify: `apps/server/src/routes/dashboard.ts`
- Modify: `packages/shared/src/types.ts`

Expand the `/api/dashboard` response to include:

```typescript
interface DashboardData {
  // Existing
  greeting: string;
  date: string;
  weather?: WeatherData;
  schedule: ScheduleItem[];
  pendingActions: PendingAction[];
  // New panels
  goals: { id: number; name: string; category: string; progress: number; onTrack: boolean }[];
  habits: { name: string; streak: number; lastDone: string | null; status: 'done' | 'pending' | 'missed' }[];
  recentNews: { title: string; source: string; relevance: number; link: string }[];
  unreadNotifications: number;
  edwinStatus: {
    lastHeartbeat: string;
    nextBriefing: string;
    mood: string | null;
  };
  financeSummary?: {
    monthlyBurn: number;
    pendingBills: { name: string; amount: number; dueIn: number }[];
  };
  quickStats: {
    conversationsToday: number;
    memoriesExtracted: number;
    activeGoals: number;
    upcomingEvents: number;
  };
}
```

**Commit:** `feat(dashboard): expand API with goals, habits, news, finances, stats`

---

### Task 9: Control room layout (frontend)

**Files:**
- Rewrite: `apps/web/app/page.tsx`
- Create: `apps/web/components/dashboard/` (multiple widget components)

**Layout — Desktop (md+):**
```
┌──────────────────────────────────────────────────────┐
│ HEADER: Greeting + Date + Edwin Status Indicator     │
├──────────┬──────────────────────┬────────────────────┤
│ WEATHER  │   TODAY'S SCHEDULE   │   QUICK STATS      │
│ Widget   │   (timeline view)    │   4 metric cards   │
├──────────┴──────────────────────┴────────────────────┤
│            GOALS TRACKER (horizontal cards)           │
├──────────────────────┬───────────────────────────────┤
│   PENDING ACTIONS    │       NEWS FEED               │
│   (priority sorted)  │   (latest 5, relevance dots)  │
├──────────────────────┼───────────────────────────────┤
│   UPCOMING BILLS     │       HABITS                  │
│   (next 7 days)      │   (streak indicators)         │
└──────────────────────┴───────────────────────────────┘
```

**Layout — Mobile:**
- Single column, stacked widgets
- Weather + stats at top
- Schedule (collapsible)
- Actions (collapsible)
- Everything else in scrollable sections

**Widget components to create:**
- `dashboard/weather-card.tsx` — Current temp, condition, high/low
- `dashboard/schedule-timeline.tsx` — Visual timeline of today's events
- `dashboard/stat-card.tsx` — Single metric (number + label + icon)
- `dashboard/goals-row.tsx` — Horizontal scroll of goal progress bars
- `dashboard/actions-panel.tsx` — Priority-sorted pending actions
- `dashboard/news-ticker.tsx` — Latest 5 news items, compact
- `dashboard/bills-panel.tsx` — Bills due soon with countdown
- `dashboard/habits-grid.tsx` — Habit streaks with visual indicators

**Design language:**
- Background: `bg-zinc-950`
- Cards: `bg-zinc-900 border border-zinc-800 rounded-xl`
- Accent: `amber-400` for highlights, status indicators
- Stakes colors: `red-500` (high), `amber-500` (medium), `zinc-500` (low)
- Status dots: pulsing green = healthy, amber = needs attention, red = overdue
- Font: Inter, compact spacing, data-dense

**Commit per widget pair** (build 2 widgets → commit → next 2).

---

### Task 10: Schedule timeline view

**Files:**
- Create: `apps/web/components/dashboard/schedule-timeline.tsx`

A vertical timeline showing today's events from 05:00 to 22:00:
- Current time indicator (amber line)
- Events as blocks with duration
- Color-coded by type (work=blue, personal=green, health=purple)
- Shows gaps (free time) in subtle gray

---

### Task 11: Goals progress tracker

**Files:**
- Create: `apps/web/components/dashboard/goals-row.tsx`

Horizontal scrollable row of goal cards:
- Goal name + category
- Circular progress ring (percentage)
- On-track indicator (green check or red warning)
- Target + deadline
- Compact, dense design

---

### Task 12: Quick stats bar

**Files:**
- Create: `apps/web/components/dashboard/stat-card.tsx`

Four cards in a row:
- Conversations today (chat icon)
- Active goals (target icon)
- Upcoming events (calendar icon)
- Memories extracted (brain icon)
- Each: number + label, subtle background

---

### Task 13: Financial panel

**Files:**
- Create: `apps/web/components/dashboard/bills-panel.tsx`

Panel showing:
- Monthly burn rate
- Bills due in next 7 days (sorted by urgency)
- Each bill: name, amount, "due in X days"
- Color: red for overdue, amber for ≤3 days, gray for later

---

### Task 14: Habits grid

**Files:**
- Create: `apps/web/components/dashboard/habits-grid.tsx`

Grid of tracked habits:
- Habit name
- Current streak (number + flame icon if ≥3)
- Status today: done (green), pending (amber), missed (red)
- Last completed date

---

### Task 15: Assemble control room page

**Files:**
- Rewrite: `apps/web/app/page.tsx`

Wire all widget components into the responsive grid layout described in Task 9. Use `getDashboard()` with the expanded response. Loading skeleton states for each widget.

**Commit:** `feat(dashboard): desktop control room with 8 widget panels`

---

## Workstream 3: Mobile Optimization

**Current state:** PWA with responsive design (sidebar on desktop, bottom nav on mobile). Three pages. Works but isn't optimized for phone use.

**What we're building:** A streamlined mobile experience — compact dashboard, swipeable schedule, prominent Edwin chat access, and proper touch targets.

---

### Task 16: Mobile-first dashboard

**Files:**
- Modify: `apps/web/app/page.tsx` (add mobile-specific layout)
- Create: `apps/web/components/dashboard/mobile-dashboard.tsx`

**Mobile layout (stacked, thumb-friendly):**
```
┌─────────────────────────┐
│  Greeting + Weather      │
│  (compact, one line)     │
├─────────────────────────┤
│  📋 Next Up              │
│  "Meeting with Alex, 2h" │
│  (single prominent card) │
├─────────────────────────┤
│  ⚡ Actions (3 max)      │
│  Swipeable cards         │
├─────────────────────────┤
│  📰 News (2 items)       │
├─────────────────────────┤
│  🎯 Goals (horizontal)   │
└─────────────────────────┘
```

- Use `md:hidden` / `hidden md:block` to show different layouts
- Touch targets ≥ 44px
- Swipeable action cards (swipe right = done)

---

### Task 17: Bottom navigation improvements

**Files:**
- Modify: `apps/web/components/layout/nav.tsx`

- Add notification badge to nav items
- Add "News" tab (4 items total: Dashboard, Chat, Voice, News)
- Active state: amber underline + fill
- Haptic-like visual feedback on tap (scale animation)
- Safe area inset padding for notched phones

---

### Task 18: Chat input mobile optimization

**Files:**
- Modify: `apps/web/components/chat/chat-input.tsx`

- Auto-resize textarea (grows up to 4 lines)
- Keyboard-aware: input stays above keyboard on iOS
- Quick mic button inline (tap to voice-record, sends as voice message)
- Send button: larger touch target on mobile

---

### Task 19: Pull-to-refresh

**Files:**
- Create: `apps/web/hooks/use-pull-to-refresh.ts`
- Modify: `apps/web/app/page.tsx`

Add pull-to-refresh on mobile dashboard to reload data. Visual indicator (amber spinner at top).

**Commit:** `feat(mobile): optimized mobile dashboard, navigation, chat input, pull-to-refresh`

---

## Workstream 4: Notifications, Alarms & Morning Routine

**Current state:** Web Push works (VAPID keys configured), push subscriptions stored in DB, morning briefing generated at 05:30 with notification + push. Service worker registered. No alarm/call UI.

**What we're building:** A complete notification experience — morning alarm that opens Edwin's briefing, "Edwin is calling" incoming call UI, notification categories, and action buttons.

---

### Task 20: Morning alarm push enhancement

**Files:**
- Modify: `apps/server/src/jobs/morning.ts`
- Modify: `public/service-worker.js`

Enhance the morning briefing push:

```typescript
// In morning.ts — enhanced push payload
await sendPushToAll(store, {
  title: 'Edwin — Good Morning, Sir',
  body: briefingPreview, // First sentence of briefing
  url: '/briefing',
  tag: 'morning-briefing',
  actions: [
    { action: 'listen', title: 'Listen to Briefing' },
    { action: 'snooze', title: 'Snooze 10min' },
  ],
  requireInteraction: true, // Don't auto-dismiss
});
```

In service worker — handle notification click:
```javascript
self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  if (action === 'snooze') {
    // Re-schedule notification in 10 minutes
    setTimeout(() => self.registration.showNotification(...), 600000);
  } else {
    // Open/focus the app to briefing page
    event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
  }
  event.notification.close();
});
```

**Commit:** `feat(notifications): morning alarm with listen/snooze actions`

---

### Task 21: Briefing page

**Files:**
- Create: `apps/web/app/briefing/page.tsx`

A dedicated page that:
1. Fetches briefing from `/api/briefing`
2. Auto-plays the audio (Edwin speaks the briefing)
3. Shows the text in a clean reading format
4. Sections: Yesterday recap, Today's priorities, Weather, Schedule, News highlights
5. "Good morning" header with date

This is where the morning push notification links to.

**Commit:** `feat(briefing): dedicated morning briefing page with auto-play`

---

### Task 22: "Edwin is calling" incoming call UI

**Files:**
- Create: `apps/web/components/notifications/incoming-call.tsx`
- Modify: `public/service-worker.js`

When Edwin wants Jan's attention (high-stakes notification, morning briefing, urgent alert):

**Push payload:**
```json
{
  "type": "call",
  "title": "Edwin",
  "body": "Morning briefing ready, sir.",
  "sound": true
}
```

**Incoming call UI (full-screen overlay):**
```
┌─────────────────────────────┐
│                             │
│         ┌─────┐             │
│         │  E  │  (pulsing)  │
│         └─────┘             │
│                             │
│        Edwin                │
│   Morning Briefing          │
│                             │
│   ┌────────┐  ┌────────┐   │
│   │ Decline│  │ Accept │   │
│   │  (red) │  │(green) │   │
│   └────────┘  └────────┘   │
│                             │
└─────────────────────────────┘
```

- Accept → navigate to relevant page (briefing, chat, etc.)
- Decline → dismiss, mark notification as seen
- Auto-dismiss after 30 seconds if no action
- Vibration pattern on mobile (if supported)
- Full-screen on mobile, modal on desktop

**Commit:** `feat(notifications): incoming call UI for high-priority Edwin alerts`

---

### Task 23: Notification categories and actions

**Files:**
- Modify: `apps/server/src/push/push-service.ts`
- Modify: `packages/shared/src/types.ts`
- Modify: `apps/web/components/notifications/notification-panel.tsx`

Add notification categories:

```typescript
type NotificationType =
  | 'briefing'      // Morning/evening briefing
  | 'reminder'      // Due reminder
  | 'alert'         // Important news, urgent action
  | 'nudge'         // Gentle push (habit, check-in)
  | 'info';         // FYI (outreach suggestion, weather change)
```

Each category gets:
- Distinct icon in the notification panel
- Priority ordering (alerts > reminders > briefing > nudges > info)
- Color coding (red, amber, blue, green, gray)
- Actions (e.g., "Mark done" for reminders, "Snooze" for nudges)

**Commit:** `feat(notifications): categorized notifications with actions`

---

### Task 24: Notification sound and vibration

**Files:**
- Create: `apps/web/lib/notification-sound.ts`
- Add: `public/sounds/edwin-notification.mp3` (short, subtle chime)
- Add: `public/sounds/edwin-call.mp3` (phone ring pattern)

```typescript
export function playNotificationSound(type: 'notification' | 'call') {
  const audio = new Audio(type === 'call' ? '/sounds/edwin-call.mp3' : '/sounds/edwin-notification.mp3');
  audio.volume = 0.6;
  audio.play().catch(() => {});

  if ('vibrate' in navigator) {
    navigator.vibrate(type === 'call' ? [200, 100, 200, 100, 200] : [100, 50, 100]);
  }
}
```

**Commit:** `feat(notifications): notification sounds and vibration patterns`

---

### Task 25: Wire notifications into the app lifecycle

**Files:**
- Modify: `apps/web/components/layout/app-shell.tsx`
- Modify: `public/service-worker.js`

1. **Service worker** listens for push events, shows native notification with actions
2. **App shell** polls `/api/notifications/count` every 60 seconds when app is open
3. When notification count changes, show in-app toast (slide down from top)
4. High-priority "call" notifications show the incoming call overlay
5. **Background**: service worker handles push when app is closed

**Commit:** `feat(notifications): full lifecycle — push, in-app toast, polling, call overlay`

---

## Execution Order Summary

| # | Task | Workstream | Estimated Effort |
|---|------|-----------|-----------------|
| 1 | News DB table | News | Small |
| 2 | Expanded feeds + scoring | News | Medium |
| 3 | Persist to DB | News | Medium |
| 4 | Push alerts for news | News | Small |
| 5 | News API route | News | Small |
| 6 | News fetcher cron | News | Small |
| 7 | Frontend news page | News | Medium |
| 8 | Dashboard data expansion | Desktop | Medium |
| 9 | Control room layout | Desktop | Large |
| 10 | Schedule timeline | Desktop | Medium |
| 11 | Goals progress | Desktop | Medium |
| 12 | Quick stats | Desktop | Small |
| 13 | Financial panel | Desktop | Small |
| 14 | Habits grid | Desktop | Small |
| 15 | Assemble control room | Desktop | Medium |
| 16 | Mobile dashboard | Mobile | Medium |
| 17 | Bottom nav improvements | Mobile | Small |
| 18 | Chat input mobile | Mobile | Small |
| 19 | Pull-to-refresh | Mobile | Small |
| 20 | Morning alarm push | Notifications | Medium |
| 21 | Briefing page | Notifications | Medium |
| 22 | Incoming call UI | Notifications | Large |
| 23 | Notification categories | Notifications | Medium |
| 24 | Sound + vibration | Notifications | Small |
| 25 | App lifecycle wiring | Notifications | Medium |

---

## Dependencies & Notes

- **Task 3 depends on Task 1** (DB table must exist)
- **Task 4 depends on Task 3** (needs stored news to check)
- **Task 7 depends on Task 5** (needs API endpoint)
- **Task 15 depends on Tasks 8-14** (all widgets must exist)
- **Task 22 depends on Task 20** (push infrastructure)
- **News feeds may need CORS proxying** if RSS feeds block server-side fetch — add retry logic
- **Sound files** need to be sourced or generated (short, professional chimes)
- **PWA limitations on iOS**: Notifications work but with restrictions. Background fetch is limited. The native Expo app (future) will resolve these.
- **Cost impact**: 4 extra RSS fetches/day is negligible. No extra Claude calls for news (scoring is keyword-based). Dashboard expansion may add 1-2 DB queries per load.
