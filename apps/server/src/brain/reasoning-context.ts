/**
 * Reasoning Context — Session 13.
 *
 * Synthesizes all available data into a reasoning brief for Claude.
 * Instead of just dumping memory and context, this builds a structured
 * "current awareness" that encourages multi-step reasoning:
 *
 * Time + mood + commitments + patterns + pending actions → intelligent response.
 */

import type { TimeOfDay, DayType } from '@edwin/shared';
import { MemoryStore } from '../memory/store.js';
import { generatePredictions, formatPredictions } from './understanding/predictor.js';
import { getTopPriorities, formatPriorities } from './thinking/priority-engine.js';

export interface ReasoningBrief {
  temporal: string;
  awareness: string[];
  pendingActions: string[];
  recentMood: string | null;
  activeCommitments: string[];
  knownPatterns: string[];
  predictions: string[];
  priorities: string[];
}

/**
 * Match mood text to a behavioral guidance signal.
 * Ordered by priority — first match wins.
 */
const MOOD_SIGNALS: Array<{ keywords: string[]; signal: string }> = [
  // Negative — high urgency
  { keywords: ['stress', 'overwhelm', 'panic', 'frantic', 'pressur'],
    signal: 'Jan is stressed — empathize first, simplify, reduce cognitive load.' },
  { keywords: ['anxious', 'anxiety', 'nervous', 'worried', 'uneasy'],
    signal: 'Jan is anxious — reassure, help prioritize, break things into steps.' },
  { keywords: ['angry', 'furious', 'pissed', 'rage', 'livid'],
    signal: 'Jan is angry — let him vent, validate, do not dismiss. Address the cause.' },
  { keywords: ['frustrat', 'annoyed', 'irritat', 'fed up'],
    signal: 'Jan is frustrated — acknowledge the obstacle, suggest concrete next steps.' },
  { keywords: ['sad', 'down', 'depress', 'low', 'miserable', 'unhappy'],
    signal: 'Jan is feeling low — be warm, do not push productivity. Presence over performance.' },
  { keywords: ['lonely', 'isolat', 'disconnected'],
    signal: 'Jan is feeling isolated — encourage reaching out to someone. Suggest social activity.' },

  // Negative — low urgency
  { keywords: ['tired', 'exhaust', 'drained', 'fatigue', 'burnt out', 'burnout', 'wiped'],
    signal: 'Jan is tired — suggest rest, lower expectations, do not add tasks.' },
  { keywords: ['bored', 'restless', 'unmotivat', 'apathetic', 'flat'],
    signal: 'Jan is bored or unmotivated — suggest something engaging, reframe goals, spark curiosity.' },
  { keywords: ['distract', 'scatter', 'unfocus', 'can\'t concentrate'],
    signal: 'Jan is distracted — help focus. Suggest one clear next action, not a list.' },

  // Positive
  { keywords: ['energi', 'excited', 'great', 'pumped', 'fired up', 'motivated', 'amped'],
    signal: 'Jan is energised — match energy, push harder, suggest ambitious action.' },
  { keywords: ['happy', 'good', 'positive', 'cheerful', 'upbeat'],
    signal: 'Jan is in a good mood — maintain momentum, this is a window for harder tasks.' },
  { keywords: ['calm', 'relaxed', 'peaceful', 'content', 'steady'],
    signal: 'Jan is calm — good state for planning, reflection, or deeper conversations.' },
  { keywords: ['confident', 'proud', 'accomplished'],
    signal: 'Jan is feeling confident — reinforce it, set the next challenge.' },
  { keywords: ['grateful', 'thankful', 'appreciat'],
    signal: 'Jan is in a reflective, grateful mood — reinforce positive momentum.' },
];

function matchMoodSignal(moodLower: string): string | null {
  for (const { keywords, signal } of MOOD_SIGNALS) {
    if (keywords.some((kw) => moodLower.includes(kw))) {
      return signal;
    }
  }
  return null;
}

/**
 * Build a reasoning brief from all available data.
 * This is NOT a data dump — it's a structured summary that encourages
 * Claude to connect the dots and think before responding.
 */
export function buildReasoningBrief(
  store: MemoryStore,
  timeOfDay: TimeOfDay,
  dayType: DayType,
): ReasoningBrief {
  const now = new Date();

  // ── Temporal awareness ──────────────────────────────────────────
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[now.getDay()];
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

  const temporal = `It is ${dayName}, ${timeStr}. Time of day: ${timeOfDay}. Day type: ${dayType}.`;

  // ── Recent mood ─────────────────────────────────────────────────
  const emotions = store.getObservationsByCategory('emotional_state');
  const recentMood = emotions.length > 0 ? emotions[0].content : null;

  // ── Active commitments ──────────────────────────────────────────
  const commitments = store.getObservationsByCategory('commitment');
  const activeCommitments = commitments.slice(0, 5).map((c) => c.content);

  // ── Pending actions/reminders ───────────────────────────────────
  const pending = store.getPendingActions(5);
  const pendingActions = pending.map((a) => {
    const time = new Date(a.trigger_time).toLocaleString('en-GB', {
      timeZone: 'Europe/Vienna',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${a.description} (${time}, ${a.stakes_level})`;
  });

  // ── Known patterns ───────────────────────────────────────────────
  const patternObs = store.getObservationsByCategory('pattern', 10);
  const knownPatterns = patternObs.map((p) => p.content);

  // ── Awareness signals — things Edwin should consider ────────────
  const awareness: string[] = [];

  // Follow-ups due
  const followUps = store.getObservationsByCategory('follow_up');
  if (followUps.length > 0) {
    awareness.push(`Follow-ups pending: ${followUps.slice(0, 3).map((f) => f.content).join('; ')}`);
  }

  // Time-based awareness
  if (timeOfDay === 'morning' && dayType === 'weekday') {
    awareness.push('Morning on a weekday — peak productivity window. Motivate toward action.');
  } else if (timeOfDay === 'morning' && (dayType === 'saturday' || dayType === 'sunday')) {
    awareness.push('Weekend morning — balance rest with meaningful activity.');
  } else if (timeOfDay === 'evening') {
    awareness.push('Evening — wind down, no new tasks. Reflect on the day.');
  } else if (timeOfDay === 'night') {
    awareness.push('Late night — encourage rest. Do not push productivity.');
  }

  // Mood-based awareness — maps detected emotions to behavioral guidance
  if (recentMood) {
    const moodLower = recentMood.toLowerCase();
    const moodSignal = matchMoodSignal(moodLower);
    if (moodSignal) {
      awareness.push(moodSignal);
    }
  }

  // Pending action awareness
  if (pendingActions.length > 0) {
    awareness.push(`${pendingActions.length} pending reminder(s) — mention if relevant to conversation.`);
  }

  // ── Behavioral predictions ─────────────────────────────────────
  const rawPredictions = generatePredictions(store, timeOfDay, dayType);
  const predictions = formatPredictions(rawPredictions);

  // ── Priority ranking ──────────────────────────────────────────
  const topPriorities = getTopPriorities(store, timeOfDay, recentMood);
  const priorities = formatPriorities(topPriorities);

  return {
    temporal,
    awareness,
    pendingActions,
    recentMood,
    activeCommitments,
    knownPatterns,
    predictions,
    priorities,
  };
}

/**
 * Format the reasoning brief for injection into the system prompt.
 * Returns null if there's nothing meaningful to add beyond time.
 */
export function formatReasoningBrief(brief: ReasoningBrief): string {
  const lines: string[] = [
    '[YOUR CURRENT AWARENESS]',
    brief.temporal,
  ];

  if (brief.recentMood) {
    lines.push(`Jan's recent mood: ${brief.recentMood}`);
  }

  if (brief.activeCommitments.length > 0) {
    lines.push('Active commitments:');
    for (const c of brief.activeCommitments) {
      lines.push(`  - ${c}`);
    }
  }

  if (brief.pendingActions.length > 0) {
    lines.push('Upcoming reminders:');
    for (const a of brief.pendingActions) {
      lines.push(`  - ${a}`);
    }
  }

  if (brief.knownPatterns.length > 0) {
    lines.push('Behavioural patterns you\'ve noticed:');
    for (const p of brief.knownPatterns) {
      lines.push(`  - ${p}`);
    }
  }

  if (brief.predictions.length > 0) {
    lines.push('Predictions (act on these if relevant):');
    for (const p of brief.predictions) {
      lines.push(`  - ${p}`);
    }
  }

  if (brief.priorities.length > 0) {
    lines.push('Current priorities (most important first):');
    for (const p of brief.priorities) {
      lines.push(`  - ${p}`);
    }
  }

  if (brief.awareness.length > 0) {
    lines.push('');
    lines.push('Consider before responding:');
    for (const a of brief.awareness) {
      lines.push(`  - ${a}`);
    }
  }

  lines.push('');
  lines.push(
    'Think step by step internally. Connect the dots — time, mood, commitments, patterns. ' +
    'Don\'t show your reasoning unless Jan asks why. Just respond with the right thing at the right time.',
  );

  return lines.join('\n');
}
