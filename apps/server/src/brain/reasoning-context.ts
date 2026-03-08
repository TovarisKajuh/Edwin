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

export interface ReasoningBrief {
  temporal: string;
  awareness: string[];
  pendingActions: string[];
  recentMood: string | null;
  activeCommitments: string[];
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

  // Mood-based awareness
  if (recentMood) {
    const moodLower = recentMood.toLowerCase();
    if (moodLower.includes('stress') || moodLower.includes('overwhelm')) {
      awareness.push('Jan is stressed — empathize first, simplify, reduce cognitive load.');
    } else if (moodLower.includes('tired') || moodLower.includes('exhaust') || moodLower.includes('drained')) {
      awareness.push('Jan is tired — suggest rest, lower expectations, do not add tasks.');
    } else if (moodLower.includes('energi') || moodLower.includes('excited') || moodLower.includes('great')) {
      awareness.push('Jan is energised — match energy, push harder, suggest ambitious action.');
    }
  }

  // Pending action awareness
  if (pendingActions.length > 0) {
    awareness.push(`${pendingActions.length} pending reminder(s) — mention if relevant to conversation.`);
  }

  return {
    temporal,
    awareness,
    pendingActions,
    recentMood,
    activeCommitments,
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
