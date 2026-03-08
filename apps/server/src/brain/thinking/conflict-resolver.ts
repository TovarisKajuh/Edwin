/**
 * Conflict Resolution & Trade-off Analysis — Session 38.
 *
 * When Jan faces conflicting priorities, Edwin doesn't just flag them —
 * he recommends resolutions. "You want to go out tonight but you have
 * a deadline tomorrow. Here's my suggestion..."
 *
 * Conflict types:
 *   - Schedule: two commitments at the same time
 *   - Priority: wants to do X but should do Y
 *   - Resource: can afford X or Y but not both
 *   - Energy: wants everything but is exhausted
 *
 * Resolution strategies:
 *   - Reschedule the less important item
 *   - Combine activities
 *   - Defer with follow-up
 *   - Accept trade-off with eyes open
 */

import { MemoryStore } from '../../memory/store.js';
import type { TimeOfDay, DayType } from '@edwin/shared';

// ── Types ────────────────────────────────────────────────────────

export type ConflictType = 'schedule' | 'priority' | 'resource' | 'energy';
export type ResolutionStrategy = 'reschedule' | 'combine' | 'defer' | 'accept_tradeoff';

export interface Conflict {
  type: ConflictType;
  description: string;
  itemA: string;
  itemB: string;
  severity: 'low' | 'medium' | 'high';
  resolution: Resolution;
}

export interface Resolution {
  strategy: ResolutionStrategy;
  recommendation: string;
  tradeoff: string;      // What is given up
}

// ── Conflict Detection ──────────────────────────────────────────

/**
 * Detect conflicts in Jan's current commitments, schedule, and state.
 */
export function detectConflicts(
  store: MemoryStore,
  timeOfDay: TimeOfDay,
  dayType: DayType,
): Conflict[] {
  const conflicts: Conflict[] = [];

  conflicts.push(...detectScheduleConflicts(store));
  conflicts.push(...detectPriorityConflicts(store, timeOfDay, dayType));
  conflicts.push(...detectEnergyConflicts(store, timeOfDay));

  return conflicts;
}

/**
 * Detect schedule conflicts: overlapping events or commitments at the same time.
 */
function detectScheduleConflicts(store: MemoryStore): Conflict[] {
  const conflicts: Conflict[] = [];
  const db = store.raw();

  // Get today's calendar events
  const today = new Date().toISOString().slice(0, 10);
  const events = db.prepare(`
    SELECT title, start_time, end_time FROM calendar_events
    WHERE DATE(start_time) = ?
    ORDER BY start_time ASC
  `).all(today) as { title: string; start_time: string; end_time: string | null }[];

  // Check for overlaps
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i];
      const b = events[j];

      const aEnd = a.end_time || addHour(a.start_time);
      const bStart = b.start_time;

      if (aEnd > bStart) {
        conflicts.push({
          type: 'schedule',
          description: `"${a.title}" and "${b.title}" overlap`,
          itemA: a.title,
          itemB: b.title,
          severity: 'high',
          resolution: resolveScheduleConflict(a.title, b.title),
        });
      }
    }
  }

  // Check pending reminders that clash with events
  const pending = store.getPendingActions(20);
  const todayReminders = pending.filter((a) =>
    a.trigger_time.startsWith(today) && a.type !== 'notification',
  );

  for (const reminder of todayReminders) {
    const reminderTime = new Date(reminder.trigger_time).getTime();
    for (const event of events) {
      const eventStart = new Date(event.start_time).getTime();
      const eventEnd = event.end_time ? new Date(event.end_time).getTime() : eventStart + 3600000;

      if (reminderTime >= eventStart && reminderTime <= eventEnd) {
        conflicts.push({
          type: 'schedule',
          description: `Reminder "${reminder.description}" falls during "${event.title}"`,
          itemA: reminder.description,
          itemB: event.title,
          severity: 'medium',
          resolution: {
            strategy: 'reschedule',
            recommendation: `Move "${reminder.description}" to after "${event.title}" finishes.`,
            tradeoff: 'Reminder will trigger later than planned.',
          },
        });
      }
    }
  }

  return conflicts;
}

/**
 * Detect priority conflicts: when current desires conflict with important goals.
 */
function detectPriorityConflicts(
  store: MemoryStore,
  timeOfDay: TimeOfDay,
  dayType: DayType,
): Conflict[] {
  const conflicts: Conflict[] = [];

  // Check if there are high-stakes pending items being ignored
  const pending = store.getPendingActions(20);
  const now = new Date();
  const overdue = pending.filter((a) => {
    const trigger = new Date(a.trigger_time);
    return trigger < now && a.stakes_level === 'high';
  });

  if (overdue.length > 0) {
    const commitments = store.getObservationsByCategory('commitment', 5);
    const recentFacts = store.getRecentObservations('fact', 1);

    // Check if recent facts suggest Jan is doing something non-critical
    // while high-stakes items are overdue
    for (const item of overdue) {
      const hasCasualActivity = recentFacts.some((f) => {
        const lower = f.content.toLowerCase();
        return lower.includes('game') || lower.includes('netflix') || lower.includes('youtube')
          || lower.includes('social media') || lower.includes('scrolling');
      });

      if (hasCasualActivity) {
        conflicts.push({
          type: 'priority',
          description: `High-stakes item "${item.description}" is overdue while casual activity detected`,
          itemA: item.description,
          itemB: 'Leisure activity',
          severity: 'high',
          resolution: {
            strategy: 'defer',
            recommendation: `Address "${item.description}" first — it's overdue and high-stakes. Leisure can wait.`,
            tradeoff: 'Leisure is delayed, but the important item gets done.',
          },
        });
      }
    }
  }

  // Weekday morning + no gym this week + gym goal
  if (timeOfDay === 'morning' && (dayType === 'weekday' || dayType === 'saturday')) {
    const gymLogs = store.getObservationsByCategory('habit_log', 20);
    const weekStart = getWeekStart(now);
    const gymThisWeek = gymLogs.filter((l) => {
      const lower = l.content.toLowerCase();
      if (!lower.includes('[gym]') || !lower.includes('completed')) return false;
      const match = l.content.match(/\((\d{4}-\d{2}-\d{2})\)/);
      return match && match[1] >= weekStart;
    }).length;

    if (gymThisWeek < 2 && now.getDay() >= 4) {  // Thursday+ and under 2 sessions
      const commitmentCount = store.getObservationsByCategory('commitment', 10).length;
      if (commitmentCount > 2) {
        conflicts.push({
          type: 'priority',
          description: 'Behind on gym (< 2 sessions) while commitments are piling up',
          itemA: 'Gym sessions',
          itemB: 'Work commitments',
          severity: 'medium',
          resolution: {
            strategy: 'combine',
            recommendation: 'Schedule a short gym session — even 30 minutes helps maintain the habit without stealing time from commitments.',
            tradeoff: 'Less rest time, but both goals get served.',
          },
        });
      }
    }
  }

  return conflicts;
}

/**
 * Detect energy conflicts: when Jan's desired actions don't match his energy.
 */
function detectEnergyConflicts(
  store: MemoryStore,
  timeOfDay: TimeOfDay,
): Conflict[] {
  const conflicts: Conflict[] = [];

  const emotions = store.getObservationsByCategory('emotional_state');
  if (emotions.length === 0) return conflicts;

  const moodLower = emotions[0].content.toLowerCase();
  const isExhausted = ['tired', 'exhaust', 'drained', 'fatigue', 'burnt out', 'burnout', 'wiped']
    .some((kw) => moodLower.includes(kw));

  if (!isExhausted) return conflicts;

  // Check if there are demanding pending actions
  const pending = store.getPendingActions(10);
  const now = new Date();
  const upcomingHard = pending.filter((a) => {
    const trigger = new Date(a.trigger_time);
    const withinHours = trigger.getTime() - now.getTime() < 4 * 3600000 && trigger > now;
    const isDemanding = a.stakes_level === 'high' ||
      /gym|workout|meeting|presentation|deadline/i.test(a.description);
    return withinHours && isDemanding;
  });

  for (const item of upcomingHard) {
    conflicts.push({
      type: 'energy',
      description: `Jan is exhausted but "${item.description}" is coming up`,
      itemA: 'Current energy level (exhausted)',
      itemB: item.description,
      severity: item.stakes_level === 'high' ? 'high' : 'medium',
      resolution: resolveEnergyConflict(item.description, item.stakes_level),
    });
  }

  return conflicts;
}

// ── Resolution Strategies ───────────────────────────────────────

function resolveScheduleConflict(itemA: string, itemB: string): Resolution {
  return {
    strategy: 'reschedule',
    recommendation: `"${itemA}" and "${itemB}" overlap. Consider rescheduling one or adjusting the timing.`,
    tradeoff: 'One event needs to move, but both can still happen.',
  };
}

function resolveEnergyConflict(itemDescription: string, stakes: string): Resolution {
  if (stakes === 'high') {
    return {
      strategy: 'accept_tradeoff',
      recommendation: `"${itemDescription}" is high-stakes and can't be skipped. Consider a short rest or caffeine before, then push through. Rest afterwards.`,
      tradeoff: 'Energy will be spent, but the important item gets done.',
    };
  }

  return {
    strategy: 'defer',
    recommendation: `You're running low on energy. Consider moving "${itemDescription}" to tomorrow if possible.`,
    tradeoff: 'Item is delayed, but you avoid burning out further.',
  };
}

// ── Formatting ──────────────────────────────────────────────────

/**
 * Format detected conflicts for the reasoning context.
 * Returns null if no conflicts detected.
 */
export function formatConflicts(conflicts: Conflict[]): string | null {
  if (conflicts.length === 0) return null;

  const lines = ['[DETECTED CONFLICTS]'];
  for (const c of conflicts) {
    lines.push(`${c.severity.toUpperCase()}: ${c.description}`);
    lines.push(`  Strategy: ${c.resolution.strategy}`);
    lines.push(`  Recommendation: ${c.resolution.recommendation}`);
    lines.push(`  Trade-off: ${c.resolution.tradeoff}`);
  }

  lines.push('');
  lines.push('Use these insights to inform your response. If Jan is discussing related topics, weave the recommendation in naturally. Don\'t list conflicts unless asked.');

  return lines.join('\n');
}

/**
 * Get a brief conflict summary for one-line awareness.
 */
export function getConflictSummary(conflicts: Conflict[]): string | null {
  if (conflicts.length === 0) return null;

  const high = conflicts.filter((c) => c.severity === 'high');
  if (high.length > 0) {
    return `${high.length} high-severity conflict(s): ${high.map((c) => c.description).join('; ')}`;
  }

  return `${conflicts.length} conflict(s) detected — consider mentioning if relevant.`;
}

// ── Helpers ─────────────────────────────────────────────────────

function addHour(isoTime: string): string {
  const d = new Date(isoTime);
  d.setHours(d.getHours() + 1);
  return d.toISOString();
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  return d.toISOString().slice(0, 10);
}
