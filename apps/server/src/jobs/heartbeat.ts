/**
 * Heartbeat — Session 18.
 *
 * Edwin's background thinking loop. Runs every 2 hours during the day.
 * Each tick does two things:
 *
 * 1. Reminder scan (no Claude call): check for due scheduled_actions
 * 2. Context evaluation (Haiku call): should Edwin reach out right now?
 *
 * If there's a reason to reach out, creates a notification entry.
 * If not, stays silent. Edwin is present, not noisy.
 */

import { MemoryStore } from '../memory/store.js';
import { callClaude } from '../brain/reasoning.js';
import { buildReasoningBrief, formatReasoningBrief } from '../brain/reasoning-context.js';
import { getTimeOfDay, getDayType } from '../soul/personality.js';
import { sendPushToAll } from '../push/push-service.js';
import { scanForFollowUps, formatFollowUps } from './follow-up-engine.js';
import { getEventsSoon } from '../integrations/calendar.js';
import { instantiateRecurringReminders } from '../brain/concluding/reminders.js';
import { checkDueBills } from '../tracking/finances.js';
import { checkInventoryLevels } from '../tracking/inventory.js';
import { getNews, scoreRelevance } from '../integrations/news.js';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

export interface HeartbeatResult {
  remindersTriggered: number;
  outreachMessage: string | null;
  timestamp: string;
}

/**
 * Run a full heartbeat tick.
 * 1. Check for due reminders (instant, no API call)
 * 2. Evaluate whether Edwin should reach out (Haiku call)
 */
export async function runHeartbeat(store: MemoryStore): Promise<HeartbeatResult> {
  const timestamp = new Date().toISOString();

  // 1. Lightweight reminder scan
  const remindersTriggered = checkDueReminders(store);

  // 1.5. Check for upcoming calendar events (30-min heads-up)
  checkUpcomingEvents(store);

  // 1.6. Instantiate next recurring reminders if any are due
  instantiateRecurringReminders(store);

  // 1.7. Check for bills due in next 3 days
  checkDueBills(store, 3);

  // 1.8. Check inventory levels
  checkInventoryLevels(store);

  // 1.9. Check for high-relevance news
  await checkNewsAlerts(store);

  // 2. Context-aware outreach evaluation
  const outreachMessage = await evaluateOutreach(store);

  if (remindersTriggered > 0 || outreachMessage) {
    console.log(
      `[Heartbeat] ${timestamp} — ${remindersTriggered} reminder(s), ` +
      `outreach: ${outreachMessage ? 'yes' : 'silent'}`,
    );
  }

  return { remindersTriggered, outreachMessage, timestamp };
}

/**
 * Scan for due reminders and create notification entries.
 * No Claude call — just a DB scan. Fast.
 */
export function checkDueReminders(store: MemoryStore): number {
  const now = new Date().toISOString();
  const dueActions = store.getDueActions(now);

  let triggered = 0;
  for (const action of dueActions) {
    // Skip if it's already a notification (avoid loops)
    if (action.type === 'notification') continue;

    // Create a notification for this due reminder
    store.addScheduledAction(
      'notification',
      `Reminder: ${action.description}`,
      now,
      action.stakes_level,
    );

    // Mark the original action as done
    store.markActionDone(action.id);
    triggered++;
  }

  return triggered;
}

/**
 * Check for calendar events happening soon and send push notifications.
 */
export function checkUpcomingEvents(store: MemoryStore): number {
  const soonEvents = getEventsSoon(store, 35); // 35 min window to avoid missing events between ticks
  let notified = 0;

  for (const event of soonEvents) {
    const eventTime = new Date(event.startTime);
    const minutesUntil = Math.round((eventTime.getTime() - Date.now()) / 60000);
    const timeStr = eventTime.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Vienna',
    });

    const message = minutesUntil <= 5
      ? `"${event.title}" starting now (${timeStr}).`
      : `"${event.title}" in ${minutesUntil} minutes (${timeStr}).`;

    // Store as notification
    store.addScheduledAction(
      'notification',
      message,
      new Date().toISOString(),
      'medium',
    );

    // Push notification
    sendPushToAll(store, {
      title: 'Edwin — Upcoming',
      body: message,
      url: '/',
    }).catch((err) => console.error('[Heartbeat] Calendar push failed:', err));

    notified++;
  }

  return notified;
}

// ── News Alerts ─────────────────────────────────────────────────

// In-memory set of news links we've already alerted on (avoids duplicate pushes)
const alertedNewsLinks = new Set<string>();

/**
 * Check for high-relevance news and push alerts.
 * Only alerts on items scoring >= 0.7, max 3 per heartbeat tick.
 * Tracks alerted links in memory to avoid re-alerting.
 */
export async function checkNewsAlerts(store: MemoryStore): Promise<number> {
  try {
    const feed = await getNews();
    let alerted = 0;

    for (const item of feed.items) {
      if (alerted >= 3) break;
      if (alertedNewsLinks.has(item.link)) continue;

      const score = scoreRelevance(item);
      if (score >= 0.7) {
        alertedNewsLinks.add(item.link);
        await sendPushToAll(store, {
          title: `Edwin — ${item.source}`,
          body: item.title,
          url: item.link,
        });
        alerted++;
      }
    }

    return alerted;
  } catch {
    // News fetch failure should never break the heartbeat
    return 0;
  }
}

/**
 * Evaluate whether Edwin should proactively reach out to Jan.
 * Uses Haiku for cost efficiency. Returns the message or null if silent.
 */
export async function evaluateOutreach(store: MemoryStore): Promise<string | null> {
  const now = new Date();
  const timeOfDay = getTimeOfDay(now.getHours(), now.getMinutes());
  const dayType = getDayType(now.getDay());

  // Build context brief
  const brief = buildReasoningBrief(store, timeOfDay, dayType);
  const contextStr = formatReasoningBrief(brief);

  // Scan for follow-up candidates
  const followUpCandidates = scanForFollowUps(store, timeOfDay);
  const followUpLines = formatFollowUps(followUpCandidates);

  // Check if there's anything meaningful to talk about
  // Predictions alone (e.g. meal window) are not enough — need real context
  const hasContent = brief.pendingActions.length > 0
    || brief.activeCommitments.length > 0
    || brief.priorities.length > 0
    || brief.knownPatterns.length > 0
    || brief.recentMood !== null
    || followUpCandidates.length > 0;

  // If there's nothing in context, don't waste a Haiku call
  if (!hasContent) return null;

  // Build follow-up section if there are candidates
  const followUpSection = followUpLines.length > 0
    ? '\n\nFOLLOW-UPS TO CONSIDER:\n' + followUpLines.map((l) => `  - ${l}`).join('\n')
    : '';

  const prompt = [
    'You are Edwin, a personal life companion for Jan.',
    'It is time for a periodic check-in. Based on the context below,',
    'decide whether to reach out to Jan right now.',
    '',
    contextStr,
    followUpSection,
    '',
    'Rules:',
    '- Only reach out if there is a REAL reason: a due commitment, a relevant pattern,',
    '  a prediction worth acting on, or a follow-up worth checking.',
    '- If there are FOLLOW-UPS listed above, prioritize asking about those.',
    '- Ask ONE thing at a time. Don\'t pile multiple follow-ups into one message.',
    '- Do NOT reach out just to say hello or check in generically.',
    '- Do NOT repeat information Jan already knows.',
    '- If reaching out, write a SHORT message (1-2 sentences) as Edwin would speak.',
    '  Address Jan as "sir". Be warm but concise.',
    '- If there is no good reason to reach out, respond with exactly: SILENT',
    '',
    'Respond with either a short message to Jan, or SILENT.',
  ].join('\n');

  const response = await callClaude(
    'You are Edwin. Decide whether to reach out. Be selective — only speak when it matters.',
    [{ role: 'user', content: prompt }],
    { model: HAIKU_MODEL, maxTokens: 150 },
  );

  if (!response) return null;
  const trimmed = response.trim();
  if (trimmed === 'SILENT' || trimmed.toLowerCase().includes('silent')) {
    return null;
  }

  // Store the outreach as a notification
  store.addScheduledAction(
    'notification',
    trimmed,
    new Date().toISOString(),
    'low',
  );

  // Push to Jan's devices (fire-and-forget)
  sendPushToAll(store, {
    title: 'Edwin',
    body: trimmed,
    url: '/chat',
  }).catch((err) => console.error('[Heartbeat] Push failed:', err));

  return trimmed;
}
