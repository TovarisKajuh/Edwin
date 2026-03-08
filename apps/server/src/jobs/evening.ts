/**
 * Evening Wind-down — Session 23.
 *
 * Edwin gently closes the day. Reflects on what happened, previews
 * tomorrow, helps Jan wind down. Not a task list — a warm closing.
 *
 * Format:
 *   Day reflection (1-2 sentences on what was accomplished)
 *   Acknowledgment (what went well, empathy for what was hard)
 *   Tomorrow preview (what's coming, keep it brief)
 *   Wind-down suggestion (rest, reading, early bed)
 *
 * Runs at 19:30 Vienna time — before lights out at 20:00.
 * Tone: gentle, calming, warm. Never productivity-pushing at night.
 */

import { MemoryStore } from '../memory/store.js';
import { callClaude } from '../brain/reasoning.js';
import { getDayType } from '../soul/personality.js';
import { sendPushToAll } from '../push/push-service.js';

export interface EveningContext {
  dayName: string;
  dateStr: string;
  dayType: string;
  todaySummaries: string[];
  completedToday: string[];
  pendingCommitments: string[];
  tomorrowActions: string[];
  recentMood: string | null;
  patterns: string[];
}

/**
 * Gather context for the evening wind-down.
 */
export function buildEveningContext(store: MemoryStore): EveningContext {
  const now = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[now.getDay()];
  const dateStr = now.toISOString().slice(0, 10);
  const dayType = getDayType(now.getDay());

  // ── Today's conversations ──────────────────────────────────────
  const todayConvos = store.getConversationSummariesForDate(dateStr);
  const todaySummaries = todayConvos.map((c) => c.summary);

  // ── Completed actions today ────────────────────────────────────
  // Check scheduled_actions marked done today
  const allNotifications = store.getNotifications(30);
  const completedToday = allNotifications
    .filter((n) => n.status === 'done' && n.trigger_time.startsWith(dateStr))
    .map((n) => n.description)
    .slice(0, 5);

  // ── Still-pending commitments ──────────────────────────────────
  const commitments = store.getObservationsByCategory('commitment', 5);
  const pendingCommitments = commitments.map((c) => c.content);

  // ── Tomorrow's scheduled actions ───────────────────────────────
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
  const pending = store.getPendingActions(10);
  const tomorrowActions = pending
    .filter((a) => a.trigger_time.startsWith(tomorrowStr))
    .map((a) => a.description);

  // ── Recent mood ────────────────────────────────────────────────
  const emotions = store.getObservationsByCategory('emotional_state', 1);
  const recentMood = emotions.length > 0 ? emotions[0].content : null;

  // ── Evening-relevant patterns ──────────────────────────────────
  const patternObs = store.getObservationsByCategory('pattern', 10);
  const patterns = patternObs
    .filter((p) => {
      const lower = p.content.toLowerCase();
      return lower.includes('evening') || lower.includes('night') || lower.includes('sleep')
        || lower.includes('wind') || lower.includes('rest');
    })
    .slice(0, 3)
    .map((p) => p.content);

  return {
    dayName,
    dateStr,
    dayType,
    todaySummaries,
    completedToday,
    pendingCommitments,
    tomorrowActions,
    recentMood,
    patterns,
  };
}

/**
 * Format evening context into a prompt.
 */
export function formatEveningPrompt(ctx: EveningContext): string {
  const sections: string[] = [];
  sections.push(`Today is ${ctx.dayName}, ${ctx.dateStr}. The day is winding down.`);

  if (ctx.todaySummaries.length > 0) {
    sections.push('');
    sections.push('TODAY\'S CONVERSATIONS:');
    for (const s of ctx.todaySummaries) {
      sections.push(`  ${s}`);
    }
  }

  if (ctx.completedToday.length > 0) {
    sections.push('');
    sections.push('COMPLETED TODAY:');
    for (const c of ctx.completedToday) {
      sections.push(`  - ${c}`);
    }
  }

  if (ctx.pendingCommitments.length > 0) {
    sections.push('');
    sections.push('STILL PENDING:');
    for (const c of ctx.pendingCommitments) {
      sections.push(`  - ${c}`);
    }
  }

  if (ctx.tomorrowActions.length > 0) {
    sections.push('');
    sections.push('TOMORROW:');
    for (const a of ctx.tomorrowActions) {
      sections.push(`  - ${a}`);
    }
  }

  if (ctx.recentMood) {
    sections.push('');
    sections.push(`RECENT MOOD: ${ctx.recentMood}`);
  }

  if (ctx.patterns.length > 0) {
    sections.push('');
    sections.push('EVENING PATTERNS:');
    for (const p of ctx.patterns) {
      sections.push(`  - ${p}`);
    }
  }

  return sections.join('\n');
}

/**
 * Generate the evening wind-down message.
 */
export async function generateEveningMessage(store: MemoryStore): Promise<string> {
  const ctx = buildEveningContext(store);
  const contextPrompt = formatEveningPrompt(ctx);

  const isSunday = ctx.dayType === 'sunday';

  const systemPrompt = [
    'You are Edwin, a personal life companion for Jan.',
    'Generate an evening wind-down message. Address him as "sir".',
    '',
    'Format:',
    '1. A warm evening greeting',
    ctx.todaySummaries.length > 0 || ctx.completedToday.length > 0
      ? '2. Brief reflection on the day (what was accomplished or discussed)'
      : '2. Skip day reflection (no data)',
    '3. Acknowledgment — what went well, empathy for anything hard',
    ctx.tomorrowActions.length > 0
      ? '4. Brief tomorrow preview'
      : '4. Skip tomorrow preview (nothing scheduled)',
    '5. A gentle wind-down close — rest, relax, recharge',
    '',
    'Rules:',
    '- Keep the message under 120 words',
    '- Tone: gentle, calming, warm. NEVER push productivity.',
    '- Do NOT add new tasks or reminders. This is a wind-down.',
    '- Do NOT use asterisks or roleplay formatting',
    '- Pending items: mention briefly if relevant, but don\'t nag',
    isSunday
      ? '- It\'s Sunday evening — extra gentle, restful.'
      : '- Be warm and supportive. The day is done.',
    ctx.recentMood
      ? `- Jan's mood: ${ctx.recentMood}. Be calibrated.`
      : '',
    '- Write naturally, as Edwin would speak aloud',
  ].filter(Boolean).join('\n');

  const message = await callClaude(
    systemPrompt,
    [{ role: 'user', content: contextPrompt }],
    { maxTokens: 300 },
  );

  return message;
}

/**
 * Run the full evening wind-down flow.
 */
export async function runEveningWindDown(store: MemoryStore): Promise<string> {
  const text = await generateEveningMessage(store);

  // Store as notification
  store.addScheduledAction(
    'notification',
    text,
    new Date().toISOString(),
    'low',
  );

  // Push to devices
  sendPushToAll(store, {
    title: 'Edwin — Good Evening',
    body: text.slice(0, 200),
    url: '/',
  }).catch((err) => console.error('[Evening] Push failed:', err));

  console.log('[Evening Wind-down]', text);
  return text;
}
