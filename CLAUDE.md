# Edwin — Development Rules

## Before You Do Anything
1. Read `EDWIN_SOUL.md` — the monument. Never touch it.
2. Read `docs/plans/2026-03-08-brain-mandate.md` — the mandate.

## Brain Status: COMPLETE
All 40 brain sessions are built and deployed. 813 source tests passing. The 7 systems are operational:
1. **Knowing** (Sessions 1-6): Memory extraction, retrieval, contradiction handling, compression, search
2. **Understanding** (Sessions 7-11): Streaming, soul filtering, mood detection, implicit requests, context
3. **Thinking** (Sessions 12-17): Tool use, multi-step reasoning, pattern recognition, prediction, priorities
4. **Acting** (Sessions 18-24): Heartbeat, morning briefing, notifications, push, follow-ups, channel selection
5. **Sensing** (Sessions 25-29): Weather, temporal intelligence, calendar, location, news
6. **Trusting** (Sessions 30-35): Stakes framework, reminders, habits, finances, people, inventory
7. **Deep Intelligence** (Sessions 36-40): Weekly review, goal tracking, conflict resolution, emotional intelligence, relationship memory

**Deep profiling: COMPLETE.** Jan's full life data seeded into Edwin's memory (identity + observations + people).

## Current Priority: Four Workstreams
**Plan:** `docs/plans/2026-03-08-four-workstreams.md` — 25 tasks across 4 workstreams. Execute in order.

| # | Workstream | Tasks | Status |
|---|-----------|-------|--------|
| 1 | News Intelligence | 1-7 | NOT STARTED |
| 2 | Desktop Control Room | 8-15 | NOT STARTED |
| 3 | Mobile Optimization | 16-19 | NOT STARTED |
| 4 | Notifications & Alarms | 20-25 | NOT STARTED |

**How to execute:** One workstream per session. Read the plan, execute tasks in order, commit after each task. Run `pnpm --filter @edwin/server test` after every change to verify nothing breaks.

## Non-Negotiable Rules
- NEVER downgrade the Claude model without explicit approval (currently claude-sonnet-4-20250514)
- NEVER edit significant code without explicit approval from Jan
- NEVER ship scaffolding as substance — build real functionality
- NEVER ask Jan obvious questions — know what to do from the vision
- Response time must be practically instant, like talking to a person

## Tech Stack
- Monorepo: pnpm workspaces (apps/web, apps/server, packages/shared)
- Frontend: Next.js + Tailwind (Vercel) — https://edwin-app.vercel.app
- Backend: Fastify (Railway) — https://edwin-api-production.up.railway.app
- AI: Claude Sonnet via Anthropic SDK
- Voice: ElevenLabs TTS + STT Scribe (voice ID: JBFqnCBsd6RMkjVDRZzb, 100K credits)
- Auth: Bearer token (EDWIN_ACCESS_KEY) on all API routes
- Database: SQLite on disk
