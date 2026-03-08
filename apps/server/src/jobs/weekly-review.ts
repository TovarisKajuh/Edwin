/**
 * Weekly Review & Reflection — Session 36.
 *
 * Every Sunday evening at 19:00, Edwin generates a comprehensive weekly review.
 * Not a data dump — an insightful analysis of the week that helps Jan see
 * the big picture and adjust course.
 *
 * Sections:
 *   1. Accomplishments (what went well)
 *   2. Missed items (what didn't happen, why)
 *   3. Habit report (gym/sleep/diet stats with trends)
 *   4. Financial snapshot (spending vs targets)
 *   5. Social activity (who was seen, gaps)
 *   6. Patterns observed (new insights)
 *   7. Next week focus (top 3 priorities)
 *
 * Stored in weekly_summaries for long-term trend analysis.
 * Delivered as push notification with full text available via API.
 */

import { MemoryStore } from '../memory/store.js';
import { callClaude } from '../brain/reasoning.js';
import { sendPushToAll } from '../push/push-service.js';
import { getHabitStats, type HabitName } from '../tracking/habits.js';
import { getSpendingSummary, formatSpendingSummary, getAllBills } from '../tracking/finances.js';
import { getAllPeople, getOverduePeople } from '../tracking/social.js';
import { getLowStockItems } from '../tracking/inventory.js';

// ── Types ────────────────────────────────────────────────────────

export interface WeeklyReviewContext {
  weekStart: string;     // Monday YYYY-MM-DD
  weekEnd: string;       // Sunday YYYY-MM-DD
  conversationSummaries: string[];
  completedActions: string[];
  missedActions: string[];
  habitStats: { habit: string; completed: number; goal: number; trend: string; streak: number }[];
  spendingSummary: string;
  socialActivity: { seen: string[]; overdue: string[] };
  patternsThisWeek: string[];
  lowStockItems: string[];
  previousWeekHighlights: string | null;
}

// ── Context Building ──────────────────────────────────────────────

/**
 * Gather all data Edwin needs for the weekly review.
 */
export function buildWeeklyReviewContext(
  store: MemoryStore,
  referenceDate?: Date,
): WeeklyReviewContext {
  const now = referenceDate || new Date();
  const { weekStart, weekEnd } = getWeekBounds(now);

  // ── Conversation summaries from this week ──────────────────────
  const conversationSummaries = getWeekConversationSummaries(store, weekStart, weekEnd);

  // ── Completed & missed actions ─────────────────────────────────
  const { completed, missed } = getWeekActions(store, weekStart, weekEnd);

  // ── Habit stats for all tracked habits ─────────────────────────
  const habits: HabitName[] = ['gym', 'sleep', 'supplements', 'diet', 'hydration', 'reading', 'meditation'];
  const habitStats = habits.map((habit) => {
    const stats = getHabitStats(store, habit, weekEnd);
    return {
      habit,
      completed: stats.thisWeek.completed,
      goal: stats.goal || 0,
      trend: stats.trend,
      streak: stats.streak.current,
      hasAnyData: stats.thisWeek.total > 0 || stats.lastWeek.total > 0,
    };
  }).filter((h) => h.hasAnyData).map(({ hasAnyData: _, ...rest }) => rest);

  // ── Spending summary ──────────────────────────────────────────
  const spending = getSpendingSummary(store, 'week', weekEnd);
  const spendingSummary = formatSpendingSummary(spending);

  // ── Social activity ───────────────────────────────────────────
  const allPeople = getAllPeople(store);
  const seen = allPeople
    .filter((p) => {
      if (!p.lastContact) return false;
      return p.lastContact >= weekStart && p.lastContact <= weekEnd;
    })
    .map((p) => p.name);
  const overdue = getOverduePeople(store).map((p) => `${p.name} (${p.daysSinceContact}d)`);

  // ── Patterns detected this week ───────────────────────────────
  const patternObs = store.getObservationsByDateRange(weekStart, weekEnd, 'pattern');
  const patternsThisWeek = patternObs.map((p) => p.content);

  // ── Low stock items ───────────────────────────────────────────
  const lowStock = getLowStockItems(store);
  const lowStockItems = lowStock.map((i) => `${i.name}: ${i.quantity} remaining`);

  // ── Previous week highlights ──────────────────────────────────
  const prevWeekStart = getPreviousWeekStart(weekStart);
  const prevSummary = store.getWeeklySummary(prevWeekStart);
  const previousWeekHighlights = prevSummary ? prevSummary.highlights : null;

  return {
    weekStart,
    weekEnd,
    conversationSummaries,
    completedActions: completed,
    missedActions: missed,
    habitStats,
    spendingSummary,
    socialActivity: { seen, overdue },
    patternsThisWeek,
    lowStockItems,
    previousWeekHighlights,
  };
}

// ── Prompt Building ──────────────────────────────────────────────

/**
 * Format review context into a data prompt for Claude.
 */
export function formatReviewDataPrompt(ctx: WeeklyReviewContext): string {
  const sections: string[] = [];

  sections.push(`WEEKLY REVIEW DATA — ${ctx.weekStart} to ${ctx.weekEnd}`);

  // Conversations
  if (ctx.conversationSummaries.length > 0) {
    sections.push('');
    sections.push('CONVERSATIONS THIS WEEK:');
    for (const s of ctx.conversationSummaries) {
      sections.push(`  - ${s}`);
    }
  } else {
    sections.push('');
    sections.push('CONVERSATIONS: None recorded this week.');
  }

  // Completed actions
  if (ctx.completedActions.length > 0) {
    sections.push('');
    sections.push('COMPLETED:');
    for (const a of ctx.completedActions) {
      sections.push(`  - ${a}`);
    }
  }

  // Missed / still pending
  if (ctx.missedActions.length > 0) {
    sections.push('');
    sections.push('MISSED / STILL PENDING:');
    for (const m of ctx.missedActions) {
      sections.push(`  - ${m}`);
    }
  }

  // Habits
  if (ctx.habitStats.length > 0) {
    sections.push('');
    sections.push('HABIT DATA:');
    for (const h of ctx.habitStats) {
      const pct = h.goal > 0 ? Math.round((h.completed / h.goal) * 100) : 0;
      const streakStr = h.streak > 1 ? `, ${h.streak}-day streak` : '';
      sections.push(`  ${capitalise(h.habit)}: ${h.completed}/${h.goal} (${pct}%) — ${h.trend}${streakStr}`);
    }
  }

  // Spending
  if (!ctx.spendingSummary.includes('No expenses')) {
    sections.push('');
    sections.push('FINANCIAL:');
    sections.push(`  ${ctx.spendingSummary}`);
  }

  // Social
  sections.push('');
  sections.push('SOCIAL:');
  if (ctx.socialActivity.seen.length > 0) {
    sections.push(`  Contacted: ${ctx.socialActivity.seen.join(', ')}`);
  } else {
    sections.push('  No contacts recorded this week.');
  }
  if (ctx.socialActivity.overdue.length > 0) {
    sections.push(`  Overdue: ${ctx.socialActivity.overdue.join(', ')}`);
  }

  // Patterns
  if (ctx.patternsThisWeek.length > 0) {
    sections.push('');
    sections.push('PATTERNS DETECTED:');
    for (const p of ctx.patternsThisWeek) {
      sections.push(`  - ${p}`);
    }
  }

  // Low stock
  if (ctx.lowStockItems.length > 0) {
    sections.push('');
    sections.push('LOW STOCK:');
    for (const item of ctx.lowStockItems) {
      sections.push(`  - ${item}`);
    }
  }

  // Previous week for comparison
  if (ctx.previousWeekHighlights) {
    sections.push('');
    sections.push('LAST WEEK HIGHLIGHTS (for comparison):');
    sections.push(`  ${ctx.previousWeekHighlights}`);
  }

  return sections.join('\n');
}

/**
 * Build system prompt for weekly review generation.
 */
export function buildReviewSystemPrompt(): string {
  return [
    'You are Edwin, a personal life companion for Jan.',
    'Generate a comprehensive weekly review. Address Jan as "sir".',
    '',
    'Structure your review as:',
    '',
    '1. OPENING — One warm sentence about the week overall.',
    '',
    '2. WINS — What went well. Be specific. Reference actual data.',
    '   If habits improved, say so. If commitments were met, acknowledge it.',
    '',
    '3. MISSES — What didn\'t happen or fell short. Be honest but not harsh.',
    '   If habits declined, note it without lecturing.',
    '',
    '4. HABITS — Brief habit scorecard. Trends matter more than numbers.',
    '   Highlight improvements and flag concerns.',
    '',
    '5. MONEY — Spending snapshot if data exists. Flag anything notable.',
    '',
    '6. PEOPLE — Social activity. Who was contacted, who\'s overdue.',
    '',
    '7. PATTERNS — Any patterns worth noting. What do the patterns mean?',
    '',
    '8. NEXT WEEK — Top 3 focus areas for next week based on this data.',
    '   Be concrete: "Get back to 4 gym sessions" not "exercise more".',
    '',
    'Rules:',
    '- Keep total review under 350 words',
    '- Be insightful, not just descriptive. "You hit 3/4 gym sessions" is data.',
    '  "Third week in a row above 3 — the habit is solidifying" is insight.',
    '- Skip any section where there\'s no data. Don\'t mention missing data.',
    '- Compare to last week when possible.',
    '- Be honest but constructive. Edwin doesn\'t lecture — he observes.',
    '- Do NOT use asterisks or roleplay formatting',
    '- Write naturally, as Edwin would speak aloud on a Sunday evening',
    '- End with something forward-looking and motivating',
  ].join('\n');
}

// ── Generation ──────────────────────────────────────────────────

/**
 * Generate the weekly review text via Claude.
 */
export async function generateWeeklyReview(store: MemoryStore, referenceDate?: Date): Promise<string> {
  const ctx = buildWeeklyReviewContext(store, referenceDate);
  const systemPrompt = buildReviewSystemPrompt();
  const dataPrompt = formatReviewDataPrompt(ctx);

  const review = await callClaude(
    systemPrompt,
    [{ role: 'user', content: dataPrompt }],
    { maxTokens: 800 },
  );

  return review;
}

/**
 * Store the weekly review in the weekly_summaries table.
 */
export function storeWeeklyReview(
  store: MemoryStore,
  weekStart: string,
  reviewText: string,
  ctx: WeeklyReviewContext,
): void {
  // Extract structured sections for the summary table
  const highlights = ctx.completedActions.length > 0
    ? ctx.completedActions.slice(0, 5).join('; ')
    : 'No specific accomplishments logged';

  const concerns = [
    ...ctx.missedActions.slice(0, 3),
    ...ctx.habitStats
      .filter((h) => h.trend === 'declining')
      .map((h) => `${capitalise(h.habit)} declining`),
    ...ctx.socialActivity.overdue.slice(0, 2).map((o) => `Overdue: ${o}`),
  ].join('; ') || 'No concerns';

  const patterns = ctx.patternsThisWeek.length > 0
    ? ctx.patternsThisWeek.slice(0, 5).join('; ')
    : 'No new patterns';

  const moodTrend = ctx.habitStats.length > 0
    ? ctx.habitStats.map((h) => `${h.habit}:${h.trend}`).join(',')
    : 'no data';

  store.addWeeklySummary(weekStart, highlights, concerns, patterns, moodTrend);

  // Also store the full review as an observation for memory search
  store.addObservation(
    'weekly_review',
    `Weekly review ${weekStart}: ${reviewText.slice(0, 500)}`,
    1.0,
    'told',
  );
}

/**
 * Run the full weekly review flow:
 * 1. Gather context
 * 2. Generate review via Claude
 * 3. Store in weekly_summaries
 * 4. Send push notification
 */
export async function runWeeklyReview(store: MemoryStore, referenceDate?: Date): Promise<string> {
  const ctx = buildWeeklyReviewContext(store, referenceDate);
  const systemPrompt = buildReviewSystemPrompt();
  const dataPrompt = formatReviewDataPrompt(ctx);

  const review = await callClaude(
    systemPrompt,
    [{ role: 'user', content: dataPrompt }],
    { maxTokens: 800 },
  );

  // Store structured summary + full review
  storeWeeklyReview(store, ctx.weekStart, review, ctx);

  // Store as notification
  store.addScheduledAction(
    'notification',
    review,
    new Date().toISOString(),
    'medium',
  );

  // Push to Jan
  sendPushToAll(store, {
    title: 'Edwin — Weekly Review',
    body: review.slice(0, 200),
    url: '/',
  }).catch((err) => console.error('[Weekly Review] Push failed:', err));

  console.log('[Weekly Review]', review);
  return review;
}

/**
 * Get the most recent weekly review (for the API).
 */
export function getLatestWeeklyReview(store: MemoryStore): {
  weekStart: string;
  highlights: string;
  concerns: string;
  patterns: string;
  moodTrend: string;
  fullReview: string | null;
} | null {
  // Find the most recent week
  const now = new Date();
  const { weekStart } = getWeekBounds(now);

  // Try current week, then previous
  let summary = store.getWeeklySummary(weekStart);
  if (!summary) {
    const prevStart = getPreviousWeekStart(weekStart);
    summary = store.getWeeklySummary(prevStart);
    if (!summary) return null;
  }

  // Find the full review observation
  const observations = store.getObservationsByCategory('weekly_review', 5);
  const matching = observations.find((o) => o.content.includes(summary!.week_start));
  const fullReview = matching
    ? matching.content.replace(`Weekly review ${summary.week_start}: `, '')
    : null;

  return {
    weekStart: summary.week_start,
    highlights: summary.highlights,
    concerns: summary.concerns,
    patterns: summary.patterns,
    moodTrend: summary.mood_trend,
    fullReview,
  };
}

// ── Internal Helpers ─────────────────────────────────────────────

function getWeekBounds(date: Date): { weekStart: string; weekEnd: string } {
  const d = new Date(date);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    weekStart: monday.toISOString().slice(0, 10),
    weekEnd: sunday.toISOString().slice(0, 10),
  };
}

function getPreviousWeekStart(weekStart: string): string {
  const d = new Date(weekStart + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString().slice(0, 10);
}

function getWeekConversationSummaries(store: MemoryStore, weekStart: string, weekEnd: string): string[] {
  const summaries: string[] = [];
  const d = new Date(weekStart + 'T12:00:00Z');
  const end = new Date(weekEnd + 'T12:00:00Z');

  while (d <= end) {
    const dateStr = d.toISOString().slice(0, 10);
    const daySummaries = store.getConversationSummariesForDate(dateStr);
    for (const s of daySummaries) {
      if (s.summary) summaries.push(s.summary);
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }

  return summaries;
}

function getWeekActions(
  store: MemoryStore,
  weekStart: string,
  weekEnd: string,
): { completed: string[]; missed: string[] } {
  const db = store.raw();

  // Completed actions this week
  const completedRows = db.prepare(`
    SELECT description FROM scheduled_actions
    WHERE status = 'done'
      AND DATE(trigger_time) BETWEEN ? AND ?
      AND type != 'notification'
    ORDER BY trigger_time ASC
  `).all(weekStart, weekEnd) as { description: string }[];

  // Missed: past-due and still pending (overdue from this week)
  const missedRows = db.prepare(`
    SELECT description FROM scheduled_actions
    WHERE status = 'pending'
      AND DATE(trigger_time) BETWEEN ? AND ?
      AND trigger_time < datetime('now')
      AND type != 'notification'
    ORDER BY trigger_time ASC
  `).all(weekStart, weekEnd) as { description: string }[];

  return {
    completed: completedRows.map((r) => r.description),
    missed: missedRows.map((r) => r.description),
  };
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
