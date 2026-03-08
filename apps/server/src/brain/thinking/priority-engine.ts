/**
 * Priority Engine — Session 16.
 *
 * Ranks everything competing for Jan's attention right now.
 * A bill due tomorrow > a gym reminder > a supplement reminder.
 * A client meeting in an hour > everything else.
 *
 * Scores combine urgency, impact, consequence, pattern risk,
 * and mood alignment into a single priority level.
 */

import type { TimeOfDay } from '@edwin/shared';
import { MemoryStore } from '../../memory/store.js';

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';

export interface PrioritizedItem {
  id: string; // unique key: "action:3", "commitment:7", "followup:12"
  description: string;
  priority: PriorityLevel;
  score: number; // 0..100
  reason: string; // why this priority
  source: 'action' | 'commitment' | 'follow_up';
}

// ── Impact keywords → base score boost ────────────────────────

const IMPACT_KEYWORDS: Array<{ keywords: string[]; category: string; boost: number }> = [
  { keywords: ['bill', 'invoice', 'payment', 'pay', 'fine', 'fee', 'tax', 'rent', 'mortgage'],
    category: 'financial', boost: 20 },
  { keywords: ['client', 'customer', 'meeting', 'call', 'presentation', 'deadline', 'contract', 'deal'],
    category: 'career', boost: 18 },
  { keywords: ['doctor', 'hospital', 'appointment', 'health', 'medication', 'prescription'],
    category: 'health', boost: 15 },
  { keywords: ['gym', 'exercise', 'workout', 'run', 'training'],
    category: 'fitness', boost: 10 },
  { keywords: ['cook', 'meal', 'food', 'eat', 'grocery', 'groceries'],
    category: 'nutrition', boost: 8 },
  { keywords: ['clean', 'laundry', 'tidy', 'apartment', 'maintenance'],
    category: 'home', boost: 5 },
  { keywords: ['supplement', 'vitamin', 'water', 'stretch'],
    category: 'routine', boost: 3 },
];

// ── Consequence keywords → extra urgency ──────────────────────

const CONSEQUENCE_KEYWORDS: Array<{ keywords: string[]; boost: number }> = [
  { keywords: ['fine', 'penalty', 'late fee', 'overdue', 'expire', 'cancel'], boost: 15 },
  { keywords: ['deadline', 'due', 'must', 'urgent', 'asap', 'immediately'], boost: 12 },
  { keywords: ['promised', 'committed', 'told', 'agreed'], boost: 8 },
];

/**
 * Calculate priority for all actionable items in Edwin's awareness.
 * Returns items sorted by score (highest first).
 */
export function calculatePriorities(
  store: MemoryStore,
  timeOfDay: TimeOfDay,
  currentMood: string | null,
): PrioritizedItem[] {
  const items: PrioritizedItem[] = [];
  const now = new Date();

  // ── Scheduled actions ──────────────────────────────────────
  const actions = store.getPendingActions(20);
  for (const action of actions) {
    const score = scoreAction(action, now, timeOfDay, currentMood);
    items.push({
      id: `action:${action.id}`,
      description: action.description,
      priority: scoreToPriority(score),
      score,
      reason: explainScore(action.description, action.trigger_time, action.stakes_level, now),
      source: 'action',
    });
  }

  // ── Commitments ────────────────────────────────────────────
  const commitments = store.getObservationsByCategory('commitment', 10);
  for (const commitment of commitments) {
    const score = scoreCommitment(commitment.content, timeOfDay, currentMood);
    items.push({
      id: `commitment:${commitment.id}`,
      description: commitment.content,
      priority: scoreToPriority(score),
      score,
      reason: explainCommitmentScore(commitment.content),
      source: 'commitment',
    });
  }

  // ── Follow-ups ─────────────────────────────────────────────
  const followUps = store.getObservationsByCategory('follow_up', 10);
  for (const followUp of followUps) {
    const score = scoreFollowUp(followUp.content, timeOfDay);
    items.push({
      id: `followup:${followUp.id}`,
      description: followUp.content,
      priority: scoreToPriority(score),
      score,
      reason: 'Follow-up pending',
      source: 'follow_up',
    });
  }

  return items.sort((a, b) => b.score - a.score);
}

/**
 * Score a scheduled action (0-100).
 */
function scoreAction(
  action: { description: string; trigger_time: string; stakes_level: string },
  now: Date,
  timeOfDay: TimeOfDay,
  currentMood: string | null,
): number {
  let score = 30; // base

  // ── Stakes level ────────────────────────────────────────────
  if (action.stakes_level === 'high') score += 20;
  else if (action.stakes_level === 'medium') score += 10;

  // ── Urgency: time until trigger ─────────────────────────────
  const triggerTime = new Date(action.trigger_time);
  const hoursUntil = (triggerTime.getTime() - now.getTime()) / 3600000;

  if (hoursUntil < 0) {
    score += 25; // overdue
  } else if (hoursUntil < 1) {
    score += 20; // less than an hour
  } else if (hoursUntil < 3) {
    score += 15; // within 3 hours
  } else if (hoursUntil < 24) {
    score += 8; // today
  } else if (hoursUntil < 72) {
    score += 3; // within 3 days
  }

  // ── Impact keywords ─────────────────────────────────────────
  score += getImpactBoost(action.description);

  // ── Consequence keywords ────────────────────────────────────
  score += getConsequenceBoost(action.description);

  // ── Mood dampening: don't push low-impact items when stressed ──
  if (currentMood && score < 50) {
    const moodLower = currentMood.toLowerCase();
    if (moodLower.includes('stress') || moodLower.includes('overwhelm') || moodLower.includes('exhaust')) {
      score -= 10;
    }
  }

  return clamp(score, 0, 100);
}

/**
 * Score a commitment (0-100).
 */
function scoreCommitment(
  content: string,
  timeOfDay: TimeOfDay,
  currentMood: string | null,
): number {
  let score = 25; // base for commitments

  // ── Impact ──────────────────────────────────────────────────
  score += getImpactBoost(content);

  // ── Consequence ─────────────────────────────────────────────
  score += getConsequenceBoost(content);

  // ── Time sensitivity words ──────────────────────────────────
  const lower = content.toLowerCase();
  if (lower.includes('today')) score += 15;
  else if (lower.includes('tomorrow')) score += 10;
  else if (lower.includes('this week')) score += 5;

  // ── Morning commitments get boost in morning ────────────────
  if (timeOfDay === 'morning' && (lower.includes('morning') || lower.includes('today'))) {
    score += 5;
  }

  // ── Mood dampening ──────────────────────────────────────────
  if (currentMood && score < 45) {
    const moodLower = currentMood.toLowerCase();
    if (moodLower.includes('stress') || moodLower.includes('overwhelm')) {
      score -= 8;
    }
  }

  return clamp(score, 0, 100);
}

/**
 * Score a follow-up (0-100).
 */
function scoreFollowUp(content: string, timeOfDay: TimeOfDay): number {
  let score = 20; // base — follow-ups are generally lower priority

  score += getImpactBoost(content);

  // Follow-ups are best addressed in morning or afternoon
  if (timeOfDay === 'morning' || timeOfDay === 'afternoon') {
    score += 5;
  }

  return clamp(score, 0, 100);
}

// ── Helpers ────────────────────────────────────────────────────

function getImpactBoost(text: string): number {
  const lower = text.toLowerCase();
  let maxBoost = 0;
  for (const { keywords, boost } of IMPACT_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) {
      maxBoost = Math.max(maxBoost, boost);
    }
  }
  return maxBoost;
}

function getConsequenceBoost(text: string): number {
  const lower = text.toLowerCase();
  let maxBoost = 0;
  for (const { keywords, boost } of CONSEQUENCE_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) {
      maxBoost = Math.max(maxBoost, boost);
    }
  }
  return maxBoost;
}

function scoreToPriority(score: number): PriorityLevel {
  if (score >= 70) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function explainScore(description: string, triggerTime: string, stakes: string, now: Date): string {
  const hoursUntil = (new Date(triggerTime).getTime() - now.getTime()) / 3600000;
  const parts: string[] = [];

  if (hoursUntil < 0) parts.push('overdue');
  else if (hoursUntil < 1) parts.push('due within the hour');
  else if (hoursUntil < 3) parts.push('due within 3 hours');
  else if (hoursUntil < 24) parts.push('due today');

  if (stakes === 'high') parts.push('high stakes');
  else if (stakes === 'medium') parts.push('medium stakes');

  const impact = getImpactCategory(description);
  if (impact) parts.push(impact);

  return parts.length > 0 ? parts.join(', ') : 'scheduled';
}

function explainCommitmentScore(content: string): string {
  const parts: string[] = [];
  const lower = content.toLowerCase();

  if (lower.includes('today')) parts.push('due today');
  if (lower.includes('tomorrow')) parts.push('due tomorrow');

  const impact = getImpactCategory(content);
  if (impact) parts.push(impact);

  return parts.length > 0 ? parts.join(', ') : 'active commitment';
}

function getImpactCategory(text: string): string | null {
  const lower = text.toLowerCase();
  for (const { keywords, category } of IMPACT_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category;
    }
  }
  return null;
}

/**
 * Get the top N prioritized items for the reasoning brief.
 */
export function getTopPriorities(
  store: MemoryStore,
  timeOfDay: TimeOfDay,
  currentMood: string | null,
  limit: number = 5,
): PrioritizedItem[] {
  return calculatePriorities(store, timeOfDay, currentMood).slice(0, limit);
}

/**
 * Format priorities for the reasoning brief.
 */
export function formatPriorities(items: PrioritizedItem[]): string[] {
  return items.map((item) => {
    const level = item.priority.toUpperCase();
    return `[${level}] ${item.description} (${item.reason})`;
  });
}
