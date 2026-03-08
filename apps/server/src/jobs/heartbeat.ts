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

  // Check if there's anything meaningful to talk about
  // Predictions alone (e.g. meal window) are not enough — need real context
  const hasContent = brief.pendingActions.length > 0
    || brief.activeCommitments.length > 0
    || brief.priorities.length > 0
    || brief.knownPatterns.length > 0
    || brief.recentMood !== null;

  // If there's nothing in context, don't waste a Haiku call
  if (!hasContent) return null;

  const prompt = [
    'You are Edwin, a personal life companion for Jan.',
    'It is time for a periodic check-in. Based on the context below,',
    'decide whether to reach out to Jan right now.',
    '',
    contextStr,
    '',
    'Rules:',
    '- Only reach out if there is a REAL reason: a due commitment, a relevant pattern,',
    '  a prediction worth acting on, or a follow-up worth checking.',
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

  return trimmed;
}
