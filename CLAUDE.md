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

**Next priorities:** Deep profiling interview (seed Edwin's memory with Jan's real data), integration testing, real-world usage iteration.

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
- Voice: ElevenLabs TTS (voice ID: JBFqnCBsd6RMkjVDRZzb, 100K credits)
- Database: SQLite on disk
