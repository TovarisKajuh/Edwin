/**
 * Goal Tracking & Vision Progress — Session 37.
 *
 * Edwin tracks Jan's progress toward his 5-year vision:
 *   - €6M net worth → current net worth, savings rate, trajectory
 *   - €15M company revenue → current revenue, growth rate
 *   - Perfect fitness → gym consistency, health markers
 *   - Social goals → contact frequency, relationship quality
 *   - Lifestyle → house, apartment, car, boat
 *   - Personal → partner, child, network
 *
 * Goals are stored as identity entries (category: 'goal').
 * Progress snapshots stored as observations (category: 'goal_progress').
 * Monthly review cron generates trajectory analysis.
 */

import { MemoryStore } from '../memory/store.js';
import { getHabitStats, type HabitName } from './habits.js';
import { getSpendingSummary } from './finances.js';
import { getAllPeople, getOverduePeople } from './social.js';

// ── Types ────────────────────────────────────────────────────────

export interface Goal {
  id: string;
  name: string;
  category: GoalCategory;
  target: number;
  unit: string;
  deadline: string;       // YYYY-MM-DD
  currentValue: number;
  lastUpdated: string | null;
}

export type GoalCategory = 'financial' | 'fitness' | 'social' | 'lifestyle' | 'personal';

export interface GoalProgress {
  goal: Goal;
  percentage: number;
  ratePerMonth: number;
  projectedCompletion: string | null;  // YYYY-MM-DD or null if no data
  monthsRemaining: number;
  onTrack: boolean;
  accelerationNeeded: number | null;   // multiplier (e.g. 2.0 = need to go 2x faster)
}

export interface GoalSnapshot {
  goals: GoalProgress[];
  overallScore: number;         // 0-100, weighted average
  topWin: string | null;
  topConcern: string | null;
}

// ── Default Vision Goals ────────────────────────────────────────

const VISION_GOALS: Omit<Goal, 'currentValue' | 'lastUpdated'>[] = [
  {
    id: 'net_worth',
    name: 'Net Worth',
    category: 'financial',
    target: 6_000_000,
    unit: 'EUR',
    deadline: '2031-12-31',
  },
  {
    id: 'company_revenue',
    name: 'Company Revenue',
    category: 'financial',
    target: 15_000_000,
    unit: 'EUR/year',
    deadline: '2031-12-31',
  },
  {
    id: 'gym_consistency',
    name: 'Gym Consistency',
    category: 'fitness',
    target: 4,
    unit: 'sessions/week',
    deadline: '2031-12-31',
  },
  {
    id: 'social_network',
    name: 'Active Social Network',
    category: 'social',
    target: 15,
    unit: 'active contacts',
    deadline: '2031-12-31',
  },
];

// ── Goal Management ─────────────────────────────────────────────

/**
 * Get all goals with current progress values.
 * Pulls stored values from identity table, enriches with live data.
 */
export function getGoals(store: MemoryStore): Goal[] {
  return VISION_GOALS.map((template) => {
    const stored = store.getIdentity('goal', template.id);
    const currentValue = stored ? parseFloat(stored.value) : 0;
    const lastUpdated = stored ? stored.updated_at : null;

    // Enrich with live data for trackable goals
    const liveValue = getLiveGoalValue(store, template.id);

    return {
      ...template,
      currentValue: liveValue !== null ? liveValue : currentValue,
      lastUpdated,
    };
  });
}

/**
 * Update a goal's current value.
 */
export function updateGoalValue(store: MemoryStore, goalId: string, value: number): void {
  store.setIdentity('goal', goalId, String(value), 'told', 1.0);
}

/**
 * Get live value for goals that can be computed from tracked data.
 */
function getLiveGoalValue(store: MemoryStore, goalId: string): number | null {
  switch (goalId) {
    case 'gym_consistency': {
      const stats = getHabitStats(store, 'gym' as HabitName);
      return stats.thisWeek.completed;
    }
    case 'social_network': {
      const people = getAllPeople(store);
      // Active = contacted within their frequency goal, or within 30 days
      const active = people.filter((p) => {
        if (p.daysSinceContact === null) return false;
        return p.daysSinceContact <= 30;
      });
      return active.length;
    }
    default:
      return null;
  }
}

// ── Progress Calculation ────────────────────────────────────────

/**
 * Calculate progress for a single goal.
 */
export function calculateProgress(goal: Goal, referenceDate?: Date): GoalProgress {
  const now = referenceDate || new Date();
  const deadlineDate = new Date(goal.deadline + 'T00:00:00Z');
  const totalMonths = monthsBetween(now, deadlineDate);
  const percentage = goal.target > 0
    ? Math.min(100, Math.round((goal.currentValue / goal.target) * 100))
    : 0;

  // Calculate rate per month based on how long the goal has been tracked
  const startDate = new Date('2026-03-01T00:00:00Z'); // approximate start of tracking
  const monthsElapsed = Math.max(1, monthsBetween(startDate, now));
  const ratePerMonth = goal.currentValue / monthsElapsed;

  // Project completion
  let projectedCompletion: string | null = null;
  let onTrack = false;
  let accelerationNeeded: number | null = null;

  if (ratePerMonth > 0 && goal.currentValue < goal.target) {
    const remaining = goal.target - goal.currentValue;
    const monthsToComplete = remaining / ratePerMonth;
    const projected = new Date(now);
    projected.setMonth(projected.getMonth() + Math.ceil(monthsToComplete));
    projectedCompletion = projected.toISOString().slice(0, 10);

    onTrack = projected <= deadlineDate;

    if (!onTrack && totalMonths > 0) {
      const neededRate = remaining / totalMonths;
      accelerationNeeded = Math.round((neededRate / ratePerMonth) * 10) / 10;
    }
  } else if (goal.currentValue >= goal.target) {
    onTrack = true;
    projectedCompletion = now.toISOString().slice(0, 10);
  }

  return {
    goal,
    percentage,
    ratePerMonth: Math.round(ratePerMonth * 100) / 100,
    projectedCompletion,
    monthsRemaining: Math.max(0, Math.round(totalMonths)),
    onTrack,
    accelerationNeeded,
  };
}

/**
 * Calculate progress for all goals.
 */
export function getGoalSnapshot(store: MemoryStore, referenceDate?: Date): GoalSnapshot {
  const goals = getGoals(store);
  const progressList = goals.map((g) => calculateProgress(g, referenceDate));

  // Weighted overall score
  const weights: Record<GoalCategory, number> = {
    financial: 3,
    fitness: 2,
    social: 1,
    lifestyle: 1,
    personal: 1,
  };

  let weightedSum = 0;
  let totalWeight = 0;
  for (const p of progressList) {
    const w = weights[p.goal.category] || 1;
    weightedSum += p.percentage * w;
    totalWeight += w;
  }
  const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  // Top win = highest percentage goal
  const sorted = [...progressList].sort((a, b) => b.percentage - a.percentage);
  const topWin = sorted.length > 0 && sorted[0].percentage > 0
    ? `${sorted[0].goal.name}: ${sorted[0].percentage}%`
    : null;

  // Top concern = most behind-schedule goal
  const behindSchedule = progressList.filter((p) => !p.onTrack && p.percentage < 100);
  behindSchedule.sort((a, b) => (a.percentage - b.percentage));
  const topConcern = behindSchedule.length > 0
    ? `${behindSchedule[0].goal.name}: ${behindSchedule[0].percentage}% (need ${behindSchedule[0].accelerationNeeded}x acceleration)`
    : null;

  return { goals: progressList, overallScore, topWin, topConcern };
}

// ── Monthly Review ──────────────────────────────────────────────

/**
 * Generate a monthly goal progress snapshot.
 * Stored as an observation for memory and used in reasoning context.
 */
export function generateMonthlySnapshot(store: MemoryStore, referenceDate?: Date): string {
  const snapshot = getGoalSnapshot(store, referenceDate);
  const now = referenceDate || new Date();
  const monthYear = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const lines: string[] = [];
  lines.push(`Goal Progress — ${monthYear}`);
  lines.push(`Overall: ${snapshot.overallScore}%`);

  for (const p of snapshot.goals) {
    const pctStr = `${p.percentage}%`;
    const valueStr = formatGoalValue(p.goal);
    const trackStr = p.onTrack ? 'on track' : p.accelerationNeeded
      ? `behind (need ${p.accelerationNeeded}x)`
      : 'no data';
    lines.push(`  ${p.goal.name}: ${valueStr} → ${pctStr} — ${trackStr}`);
  }

  // Store as observation
  const content = lines.join('\n');
  store.addObservation('goal_progress', content, 1.0, 'told');

  return content;
}

// ── Context for Reasoning ───────────────────────────────────────

/**
 * Format goal progress for the reasoning context.
 * Returns null if no meaningful data.
 */
export function formatGoalContext(store: MemoryStore, referenceDate?: Date): string | null {
  const snapshot = getGoalSnapshot(store, referenceDate);

  // Only show if there's any progress at all
  const hasData = snapshot.goals.some((g) => g.goal.currentValue > 0);
  if (!hasData) return null;

  const lines: string[] = ['[VISION PROGRESS]'];
  lines.push(`Overall trajectory: ${snapshot.overallScore}% toward 2031 vision`);

  for (const p of snapshot.goals) {
    if (p.goal.currentValue === 0) continue;
    const valueStr = formatGoalValue(p.goal);
    const statusStr = p.onTrack
      ? 'on track'
      : p.accelerationNeeded
        ? `behind schedule (need ${p.accelerationNeeded}x acceleration)`
        : 'tracking';
    lines.push(`  ${p.goal.name}: ${valueStr} (${p.percentage}%) — ${statusStr}`);
  }

  if (snapshot.topConcern) {
    lines.push(`Top concern: ${snapshot.topConcern}`);
  }

  return lines.join('\n');
}

/**
 * Get motivational snippets based on goal progress.
 * Used by reasoning context to add goal-aware messaging.
 */
export function getGoalMotivation(store: MemoryStore): string | null {
  const snapshot = getGoalSnapshot(store);
  const motivations: string[] = [];

  for (const p of snapshot.goals) {
    if (p.goal.id === 'gym_consistency' && p.goal.currentValue >= p.goal.target) {
      motivations.push('Jan is hitting his weekly gym target — reinforce this consistency.');
    }
    if (p.goal.id === 'gym_consistency' && p.goal.currentValue > 0 && p.goal.currentValue < p.goal.target) {
      const remaining = p.goal.target - p.goal.currentValue;
      motivations.push(`Jan needs ${remaining} more gym session(s) this week to stay on track.`);
    }
    if (p.goal.id === 'social_network' && !p.onTrack) {
      const overdue = getOverduePeople(store);
      if (overdue.length > 0) {
        motivations.push(`${overdue.length} contact(s) overdue — social network goal needs attention.`);
      }
    }
    if (p.goal.id === 'net_worth' && p.percentage > 0 && p.percentage < 10) {
      motivations.push('Early stage of wealth building — every financial decision compounds.');
    }
  }

  return motivations.length > 0 ? motivations.join(' ') : null;
}

// ── Helpers ─────────────────────────────────────────────────────

function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

function formatGoalValue(goal: Goal): string {
  if (goal.unit === 'EUR') {
    if (goal.currentValue >= 1_000_000) {
      return `€${(goal.currentValue / 1_000_000).toFixed(1)}M/${(goal.target / 1_000_000).toFixed(0)}M`;
    }
    if (goal.currentValue >= 1_000) {
      return `€${(goal.currentValue / 1_000).toFixed(0)}K/${(goal.target / 1_000_000).toFixed(0)}M`;
    }
    return `€${goal.currentValue.toFixed(0)}/${(goal.target / 1_000_000).toFixed(0)}M`;
  }
  if (goal.unit === 'EUR/year') {
    if (goal.currentValue >= 1_000_000) {
      return `€${(goal.currentValue / 1_000_000).toFixed(1)}M/${(goal.target / 1_000_000).toFixed(0)}M p.a.`;
    }
    if (goal.currentValue >= 1_000) {
      return `€${(goal.currentValue / 1_000).toFixed(0)}K/${(goal.target / 1_000_000).toFixed(0)}M p.a.`;
    }
    return `€${goal.currentValue.toFixed(0)}/${(goal.target / 1_000_000).toFixed(0)}M p.a.`;
  }
  return `${goal.currentValue}/${goal.target} ${goal.unit}`;
}
