/**
 * Habit Tracking — Session 32.
 *
 * Edwin tracks Jan's habits with data, not feelings:
 *   - Gym attendance, sleep, supplements, diet, hydration
 *   - Streak tracking (current + longest)
 *   - Weekly comparison (this week vs last week)
 *   - Goal vs actual
 *   - Accountability messaging calibrated by numbers
 *
 * Logs stored as observations with category 'habit_log'.
 * Format: "[habit_name] completed|skipped|value: details"
 */

import { MemoryStore } from '../memory/store.js';

// ── Types ────────────────────────────────────────────────────────

export type HabitName = 'gym' | 'sleep' | 'supplements' | 'diet' | 'hydration' | 'reading' | 'meditation';

export interface HabitLog {
  habit: HabitName;
  action: 'completed' | 'skipped' | 'value';
  value?: string;     // e.g., "7.5h" for sleep, "3L" for hydration
  date: string;       // YYYY-MM-DD
  notes?: string;
}

export interface HabitStats {
  habit: HabitName;
  thisWeek: {
    completed: number;
    skipped: number;
    total: number;
    values: string[];
  };
  lastWeek: {
    completed: number;
    skipped: number;
    total: number;
  };
  streak: {
    current: number;
    longest: number;
  };
  goal: number | null;  // weekly target
  trend: 'improving' | 'stable' | 'declining';
}

// ── Default Goals ────────────────────────────────────────────────

const DEFAULT_GOALS: Record<HabitName, number> = {
  gym: 4,           // 4x per week
  sleep: 7,         // 7 days of good sleep
  supplements: 7,   // daily
  diet: 5,          // 5 healthy meals tracked
  hydration: 7,     // daily
  reading: 3,       // 3x per week
  meditation: 5,    // 5x per week
};

const VALID_HABITS: HabitName[] = ['gym', 'sleep', 'supplements', 'diet', 'hydration', 'reading', 'meditation'];

// ── Logging ──────────────────────────────────────────────────────

/**
 * Log a habit event.
 */
export function logHabit(store: MemoryStore, log: HabitLog): string {
  if (!VALID_HABITS.includes(log.habit)) {
    throw new Error(`Invalid habit: ${log.habit}. Valid: ${VALID_HABITS.join(', ')}`);
  }

  const date = log.date || todayStr();
  const valueStr = log.value ? `: ${log.value}` : '';
  const notesStr = log.notes ? ` — ${log.notes}` : '';
  const content = `[${log.habit}] ${log.action}${valueStr}${notesStr} (${date})`;

  store.addObservation('habit_log', content, 1.0, 'told');

  // Generate streak feedback
  const streak = calculateCurrentStreak(store, log.habit, date);
  const thisWeekCount = getWeekCompletions(store, log.habit, date);

  if (log.action === 'completed') {
    if (streak >= 7) return `${capitalise(log.habit)} logged. ${streak}-day streak — outstanding consistency, sir.`;
    if (streak >= 3) return `${capitalise(log.habit)} logged. ${streak} days in a row. Keep it up, sir.`;
    if (thisWeekCount === 1) return `${capitalise(log.habit)} logged. First one this week — good start, sir.`;
    return `${capitalise(log.habit)} logged. That's ${thisWeekCount} this week, sir.`;
  }

  if (log.action === 'skipped') {
    const goal = DEFAULT_GOALS[log.habit];
    const remaining = goal - thisWeekCount;
    const dayName = new Date().toLocaleDateString('en-GB', { weekday: 'long' });
    if (remaining > 0) {
      return `${capitalise(log.habit)} skipped. You need ${remaining} more this week to hit your target of ${goal}.`;
    }
    return `${capitalise(log.habit)} skipped. Already hit your weekly target of ${goal} though — well earned rest.`;
  }

  return `${capitalise(log.habit)} logged: ${log.value || 'recorded'}.`;
}

// ── Stats ────────────────────────────────────────────────────────

/**
 * Get habit stats for this week vs last week.
 */
export function getHabitStats(store: MemoryStore, habit: HabitName, referenceDate?: string): HabitStats {
  if (!VALID_HABITS.includes(habit)) {
    throw new Error(`Invalid habit: ${habit}. Valid: ${VALID_HABITS.join(', ')}`);
  }

  const date = referenceDate || todayStr();
  const { weekStart, weekEnd } = getWeekBounds(date);
  const { weekStart: lastWeekStart, weekEnd: lastWeekEnd } = getLastWeekBounds(date);

  const thisWeekLogs = getHabitLogs(store, habit, weekStart, weekEnd);
  const lastWeekLogs = getHabitLogs(store, habit, lastWeekStart, lastWeekEnd);

  const thisWeekCompleted = thisWeekLogs.filter((l) => l.includes('completed')).length;
  const thisWeekSkipped = thisWeekLogs.filter((l) => l.includes('skipped')).length;
  const thisWeekValues = thisWeekLogs
    .filter((l) => l.includes('value:'))
    .map((l) => {
      const match = l.match(/value: (.+?)(?:\s*—|\s*\()/);
      return match ? match[1].trim() : '';
    })
    .filter(Boolean);

  const lastWeekCompleted = lastWeekLogs.filter((l) => l.includes('completed')).length;
  const lastWeekSkipped = lastWeekLogs.filter((l) => l.includes('skipped')).length;

  const currentStreak = calculateCurrentStreak(store, habit, date);
  const longestStreak = calculateLongestStreak(store, habit);

  // Determine trend
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (lastWeekCompleted > 0) {
    if (thisWeekCompleted > lastWeekCompleted) trend = 'improving';
    else if (thisWeekCompleted < lastWeekCompleted) trend = 'declining';
  }

  return {
    habit,
    thisWeek: {
      completed: thisWeekCompleted,
      skipped: thisWeekSkipped,
      total: thisWeekCompleted + thisWeekSkipped,
      values: thisWeekValues,
    },
    lastWeek: {
      completed: lastWeekCompleted,
      skipped: lastWeekSkipped,
      total: lastWeekCompleted + lastWeekSkipped,
    },
    streak: {
      current: currentStreak,
      longest: longestStreak,
    },
    goal: DEFAULT_GOALS[habit] ?? null,
    trend,
  };
}

/**
 * Format habit stats for Claude's response.
 */
export function formatHabitStats(stats: HabitStats): string {
  const lines: string[] = [];
  const name = capitalise(stats.habit);

  lines.push(`${name} — This week: ${stats.thisWeek.completed}/${stats.goal || '?'}`);

  if (stats.lastWeek.total > 0) {
    const comparison = stats.thisWeek.completed > stats.lastWeek.completed
      ? `up from ${stats.lastWeek.completed} last week`
      : stats.thisWeek.completed < stats.lastWeek.completed
        ? `down from ${stats.lastWeek.completed} last week`
        : `same as last week (${stats.lastWeek.completed})`;
    lines.push(`  Last week: ${comparison}`);
  }

  if (stats.streak.current > 0) {
    lines.push(`  Current streak: ${stats.streak.current} day(s)`);
  }
  if (stats.streak.longest > stats.streak.current) {
    lines.push(`  Longest streak: ${stats.streak.longest} day(s)`);
  }

  lines.push(`  Trend: ${stats.trend}`);

  if (stats.thisWeek.values.length > 0) {
    lines.push(`  Values: ${stats.thisWeek.values.join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * Format a summary of all tracked habits for the reasoning context.
 */
export function formatHabitSummary(store: MemoryStore, referenceDate?: string): string | null {
  const date = referenceDate || todayStr();
  const summaryLines: string[] = [];

  for (const habit of VALID_HABITS) {
    const logs = getHabitLogs(store, habit, getWeekBounds(date).weekStart, getWeekBounds(date).weekEnd);
    if (logs.length === 0) continue;

    const completed = logs.filter((l) => l.includes('completed')).length;
    const goal = DEFAULT_GOALS[habit];
    const streak = calculateCurrentStreak(store, habit, date);
    const streakStr = streak > 1 ? `, ${streak}-day streak` : '';
    summaryLines.push(`${capitalise(habit)}: ${completed}/${goal} this week${streakStr}`);
  }

  if (summaryLines.length === 0) return null;

  return ['[HABIT TRACKING]', ...summaryLines].join('\n');
}

// ── Streak Calculation ───────────────────────────────────────────

function calculateCurrentStreak(store: MemoryStore, habit: HabitName, fromDate: string): number {
  const allLogs = getAllHabitLogs(store, habit);
  let streak = 0;
  let currentDate = fromDate;

  // Count consecutive completed days backwards from today
  for (let i = 0; i < 365; i++) {
    const dayLogs = allLogs.filter((l) => l.includes(`(${currentDate})`));
    const hasCompletion = dayLogs.some((l) => l.includes('completed'));

    if (hasCompletion) {
      streak++;
      currentDate = prevDay(currentDate);
    } else if (i === 0) {
      // Today might not be logged yet — check yesterday
      currentDate = prevDay(currentDate);
      continue;
    } else {
      break;
    }
  }

  return streak;
}

function calculateLongestStreak(store: MemoryStore, habit: HabitName): number {
  const allLogs = getAllHabitLogs(store, habit);
  if (allLogs.length === 0) return 0;

  // Extract all completion dates
  const completionDates = new Set<string>();
  for (const log of allLogs) {
    if (log.includes('completed')) {
      const match = log.match(/\((\d{4}-\d{2}-\d{2})\)/);
      if (match) completionDates.add(match[1]);
    }
  }

  if (completionDates.size === 0) return 0;

  // Sort dates and find longest consecutive run
  const sorted = Array.from(completionDates).sort();
  let longest = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i++) {
    if (nextDay(sorted[i - 1]) === sorted[i]) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }

  return longest;
}

// ── Date Helpers ─────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function prevDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function nextDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function getWeekBounds(dateStr: string): { weekStart: string; weekEnd: string } {
  const d = new Date(dateStr + 'T12:00:00Z');
  const day = d.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return {
    weekStart: monday.toISOString().slice(0, 10),
    weekEnd: sunday.toISOString().slice(0, 10),
  };
}

function getLastWeekBounds(dateStr: string): { weekStart: string; weekEnd: string } {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - 7);
  return getWeekBounds(d.toISOString().slice(0, 10));
}

function getWeekCompletions(store: MemoryStore, habit: HabitName, date: string): number {
  const { weekStart, weekEnd } = getWeekBounds(date);
  const logs = getHabitLogs(store, habit, weekStart, weekEnd);
  return logs.filter((l) => l.includes('completed')).length;
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Check if a habit was completed today.
 */
export function isHabitDoneToday(store: MemoryStore, habit: HabitName, date?: string): boolean {
  const today = date || todayStr();
  const logs = getHabitLogs(store, habit, today, today);
  return logs.some((l) => l.includes('completed'));
}

// ── Store Queries ────────────────────────────────────────────────

function getHabitLogs(store: MemoryStore, habit: HabitName, from: string, to: string): string[] {
  const allLogs = getAllHabitLogs(store, habit);
  return allLogs.filter((log) => {
    const match = log.match(/\((\d{4}-\d{2}-\d{2})\)/);
    if (!match) return false;
    return match[1] >= from && match[1] <= to;
  });
}

function getAllHabitLogs(store: MemoryStore, habit: HabitName): string[] {
  // getObservationsByCategory returns DESC — reverse for chronological
  const observations = store.getObservationsByCategory('habit_log');
  return observations
    .filter((o) => o.content.startsWith(`[${habit}]`))
    .map((o) => o.content)
    .reverse();
}
