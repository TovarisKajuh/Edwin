/**
 * Edwin's Daily Rhythm — Session 18.
 *
 * Edwin is not a monitoring system. He's a butler with a natural daily cycle.
 * He sleeps at night, prepares in the morning, checks in during the day,
 * and winds down in the evening.
 *
 * Jan's schedule:
 *   Wake: 05:30 | Lights out: 20:00 | Asleep: 21:30
 *
 * Edwin's schedule (Europe/Vienna):
 *   SLEEP    21:30–05:00  — Nothing. Zero processes.
 *   PRE-WAKE 05:00        — Gather weather, calendar, pending items, prepare briefing
 *   MORNING  05:30        — Deliver morning briefing
 *   DAY      07,09,11,13,15,17,19 — Heartbeat every 2 hours (7 ticks)
 *   EVENING  19:30        — Wind-down heartbeat (before lights out at 20:00)
 *   NIGHT    21:00        — Pattern detection + daily compression (before sleep)
 *   SUNDAY   21:15        — Weekly compression
 */

import cron from 'node-cron';
import type { MemoryStore } from '../memory/store.js';
import { runMorningBriefing } from './morning.js';
import { compressDaily, compressWeekly, promoteObservations } from '../memory/compressor.js';
import { detectAndStorePatterns } from '../brain/understanding/pattern-detector.js';
import { runHeartbeat, checkDueReminders } from './heartbeat.js';
import { runEveningWindDown } from './evening.js';
import { runWeeklyReview } from './weekly-review.js';
import { generateMonthlySnapshot } from '../tracking/goals.js';

const TZ = 'Europe/Vienna';

export function startScheduler(store: MemoryStore): void {
  // ── PRE-WAKE: 05:00 — Prepare morning context ───────────────
  cron.schedule('0 5 * * *', async () => {
    console.log('[Edwin] Pre-wake: gathering morning context...');
    try {
      const triggered = checkDueReminders(store);
      if (triggered > 0) {
        console.log(`[Edwin] Pre-wake: ${triggered} overnight reminder(s) processed.`);
      }
    } catch (error) {
      console.error('[Edwin] Pre-wake failed:', error);
    }
  }, { timezone: TZ });

  // ── MORNING: 05:30 — Morning briefing ───────────────────────
  cron.schedule('30 5 * * *', async () => {
    console.log('[Edwin] Good morning. Preparing briefing...');
    try {
      await runMorningBriefing(store);
      console.log('[Edwin] Morning briefing delivered.');
    } catch (error) {
      console.error('[Edwin] Morning briefing failed:', error);
    }
  }, { timezone: TZ });

  // ── DAY: Heartbeat every 2 hours (07, 09, 11, 13, 15, 17, 19) ──
  cron.schedule('0 7,9,11,13,15,17,19 * * *', async () => {
    try {
      const result = await runHeartbeat(store);
      if (result.remindersTriggered > 0 || result.outreachMessage) {
        console.log(
          `[Edwin] Heartbeat: ${result.remindersTriggered} reminder(s), ` +
          `outreach: ${result.outreachMessage ? '"' + result.outreachMessage.slice(0, 50) + '..."' : 'silent'}`,
        );
      }
    } catch (error) {
      console.error('[Edwin] Heartbeat failed:', error);
    }
  }, { timezone: TZ });

  // ── EVENING: 19:30 — Wind-down (before lights out at 20:00) ──
  cron.schedule('30 19 * * *', async () => {
    console.log('[Edwin] Evening wind-down...');
    try {
      await runEveningWindDown(store);
      console.log('[Edwin] Evening wind-down delivered.');
    } catch (error) {
      console.error('[Edwin] Evening wind-down failed:', error);
    }
  }, { timezone: TZ });

  // ── NIGHT: 21:00 — Pattern detection + daily compression ────
  cron.schedule('0 21 * * *', async () => {
    try {
      const count = await detectAndStorePatterns(store, 7);
      console.log(`[Edwin] Pattern detection: ${count} new pattern(s).`);

      await compressDaily(store);
      promoteObservations(store);
      console.log('[Edwin] Daily compression complete.');
    } catch (error) {
      console.error('[Edwin] Night processing failed:', error);
    }
  }, { timezone: TZ });

  // ── 1st of MONTH: 06:00 — Monthly goal progress snapshot ────
  cron.schedule('0 6 1 * *', async () => {
    console.log('[Edwin] Monthly goal progress snapshot...');
    try {
      const snapshot = generateMonthlySnapshot(store);
      console.log('[Edwin] Goal snapshot:', snapshot.split('\n')[1]);
    } catch (error) {
      console.error('[Edwin] Goal snapshot failed:', error);
    }
  }, { timezone: TZ });

  // ── SUNDAY: 19:00 — Weekly review ──────────────────────────
  cron.schedule('0 19 * * 0', async () => {
    console.log('[Edwin] Generating weekly review...');
    try {
      await runWeeklyReview(store);
      console.log('[Edwin] Weekly review delivered.');
    } catch (error) {
      console.error('[Edwin] Weekly review failed:', error);
    }
  }, { timezone: TZ });

  // ── SUNDAY: 21:15 — Weekly compression ──────────────────────
  cron.schedule('15 21 * * 0', async () => {
    try {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const weekStart = monday.toISOString().slice(0, 10);

      await compressWeekly(store, weekStart);
      console.log('[Edwin] Weekly compression complete.');
    } catch (error) {
      console.error('[Edwin] Weekly compression failed:', error);
    }
  }, { timezone: TZ });

  // ── Summary ─────────────────────────────────────────────────
  console.log([
    '[Edwin] Daily rhythm active (Europe/Vienna):',
    '  05:00 pre-wake | 05:30 briefing | 07-19 heartbeat (2h) | 19:30 wind-down',
    '  1st 06:00 goal snapshot | Sun 19:00 weekly review | 21:00 patterns + compress | Sun 21:15 weekly compress',
    '  21:30-05:00 sleep (zero processes)',
  ].join('\n'));
}
