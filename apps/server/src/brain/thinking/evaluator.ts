/**
 * Cost-Benefit Evaluator — Session 17.
 *
 * Before Edwin proposes an action, evaluate whether it's worth it.
 * Assesses Jan's current capacity (energy, time, finances) and
 * generates evaluation context for Claude's reasoning.
 *
 * This prevents Edwin from:
 * - Suggesting expensive things when Jan should save money
 * - Pushing high-energy tasks when Jan is exhausted
 * - Proposing things that conflict with higher priorities
 * - Making suggestions that don't serve the 5-year vision
 */

import type { TimeOfDay, DayType } from '@edwin/shared';
import { MemoryStore } from '../../memory/store.js';
import { getTopPriorities } from './priority-engine.js';

export interface CapacityAssessment {
  energy: 'high' | 'moderate' | 'low';
  timeAvailable: 'abundant' | 'limited' | 'none';
  financialMode: 'spending' | 'neutral' | 'saving';
  topPriorityCount: number;
  guidelines: string[];
}

/**
 * Assess Jan's current capacity for new proposals.
 * Fast, no Claude calls — pure heuristics from available data.
 */
export function assessCapacity(
  store: MemoryStore,
  timeOfDay: TimeOfDay,
  dayType: DayType,
): CapacityAssessment {
  const guidelines: string[] = [];

  // ── Energy assessment ──────────────────────────────────────
  const energy = assessEnergy(store, timeOfDay);

  // ── Time availability ──────────────────────────────────────
  const timeAvailable = assessTimeAvailable(store, timeOfDay, dayType);

  // ── Financial mode ─────────────────────────────────────────
  const financialMode = assessFinancialMode(store);

  // ── Top priorities ─────────────────────────────────────────
  const emotions = store.getObservationsByCategory('emotional_state');
  const currentMood = emotions.length > 0 ? emotions[0].content : null;
  const topPriorities = getTopPriorities(store, timeOfDay, currentMood, 3);
  const topPriorityCount = topPriorities.length;

  // ── Generate guidelines ────────────────────────────────────
  if (energy === 'low') {
    guidelines.push('Jan is low-energy. Only suggest easy, low-effort actions. No gym, no deep work, no cooking.');
  } else if (energy === 'high') {
    guidelines.push('Jan has energy. This is a good window for challenging tasks or exercise.');
  }

  if (timeAvailable === 'none') {
    guidelines.push('Jan has no free time right now. Do not suggest new activities.');
  } else if (timeAvailable === 'limited') {
    guidelines.push('Jan has limited time. Only suggest quick wins (< 15 minutes).');
  }

  if (financialMode === 'saving') {
    guidelines.push('Jan is in saving mode. Do not suggest spending money. Prefer free alternatives.');
  } else if (financialMode === 'spending') {
    guidelines.push('Jan is comfortable spending. Okay to suggest paid services if they save time.');
  }

  if (topPriorityCount > 0) {
    const topDescs = topPriorities.map((p) => p.description).join('; ');
    guidelines.push(`Top priorities right now: ${topDescs}. New suggestions should not conflict with these.`);
  }

  // Time-of-day guidelines
  if (timeOfDay === 'night') {
    guidelines.push('It is late at night. Do not suggest anything active. Encourage sleep.');
  } else if (timeOfDay === 'evening') {
    guidelines.push('It is evening. Keep suggestions light — relaxation, reflection, prep for tomorrow.');
  }

  return { energy, timeAvailable, financialMode, topPriorityCount, guidelines };
}

/**
 * Assess energy level from mood observations and time of day.
 */
function assessEnergy(store: MemoryStore, timeOfDay: TimeOfDay): 'high' | 'moderate' | 'low' {
  const emotions = store.getObservationsByCategory('emotional_state');

  if (emotions.length > 0) {
    const moodLower = emotions[0].content.toLowerCase();

    const lowEnergy = ['tired', 'exhaust', 'drained', 'fatigue', 'burnt out', 'burnout',
      'wiped', 'sleepy', 'lethargic', 'sick', 'ill', 'unwell'];
    if (lowEnergy.some((kw) => moodLower.includes(kw))) return 'low';

    const highEnergy = ['energi', 'excited', 'pumped', 'fired up', 'motivated',
      'great', 'fantastic', 'amazing', 'ready', 'focused'];
    if (highEnergy.some((kw) => moodLower.includes(kw))) return 'high';

    const stressedOrAnxious = ['stress', 'overwhelm', 'anxious', 'panic'];
    if (stressedOrAnxious.some((kw) => moodLower.includes(kw))) return 'low';
  }

  // Default by time of day
  if (timeOfDay === 'morning') return 'high';
  if (timeOfDay === 'afternoon') return 'moderate';
  if (timeOfDay === 'evening') return 'moderate';
  return 'low'; // night
}

/**
 * Assess time availability from scheduled actions and commitments.
 */
function assessTimeAvailable(
  store: MemoryStore,
  timeOfDay: TimeOfDay,
  _dayType: DayType,
): 'abundant' | 'limited' | 'none' {
  if (timeOfDay === 'night') return 'none';

  const actions = store.getPendingActions(10);
  const commitments = store.getObservationsByCategory('commitment', 10);

  // Count items due in the next few hours
  const now = Date.now();
  const soonCutoff = now + 3 * 3600000; // next 3 hours
  const soonActions = actions.filter((a) => {
    const triggerTime = new Date(a.trigger_time).getTime();
    return triggerTime > now && triggerTime < soonCutoff;
  });

  const todayCommitments = commitments.filter((c) =>
    c.content.toLowerCase().includes('today'),
  );

  const busyItems = soonActions.length + todayCommitments.length;

  if (busyItems >= 3) return 'none';
  if (busyItems >= 1) return 'limited';
  return 'abundant';
}

/**
 * Assess financial mode from observations.
 * Looks for keywords about money, spending, saving in recent observations.
 */
function assessFinancialMode(store: MemoryStore): 'spending' | 'neutral' | 'saving' {
  const financialObs = store.getObservationsByCategory('fact', 30);

  for (const obs of financialObs) {
    const lower = obs.content.toLowerCase();

    const savingKeywords = ['save money', 'saving', 'budget', 'tight', 'expensive',
      'cut costs', 'cut spending', 'can\'t afford', 'too much money', 'broke',
      'bills piling', 'overdue', 'debt'];
    if (savingKeywords.some((kw) => lower.includes(kw))) return 'saving';

    const spendingKeywords = ['bonus', 'raise', 'good month', 'extra money',
      'treat', 'splurge', 'celebrate', 'reward'];
    if (spendingKeywords.some((kw) => lower.includes(kw))) return 'spending';
  }

  // Also check if there are overdue payment actions
  const actions = store.getPendingActions(10);
  const now = new Date();
  const overduePayments = actions.some((a) => {
    const overdue = new Date(a.trigger_time) < now;
    const financial = /bill|payment|invoice|rent/i.test(a.description);
    return overdue && financial;
  });
  if (overduePayments) return 'saving';

  return 'neutral';
}

/**
 * Format the capacity assessment as evaluation instructions for Claude.
 */
export function formatEvaluationContext(assessment: CapacityAssessment): string | null {
  if (assessment.guidelines.length === 0) return null;

  const lines = [
    '[PROPOSAL EVALUATION]',
    'Before suggesting, proposing, or recommending anything to Jan, consider:',
    ...assessment.guidelines.map((g) => `  - ${g}`),
    '',
    'Think: Is this the right suggestion for RIGHT NOW? Is the timing right? Does Jan have the energy, time, and money? Does it serve his vision or is it noise?',
  ];

  return lines.join('\n');
}
