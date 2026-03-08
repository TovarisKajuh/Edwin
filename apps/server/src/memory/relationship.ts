/**
 * Relationship Memory — Session 40.
 *
 * Edwin's relationship with Jan deepens over time. He references shared
 * history, past wins, struggles, funny exchanges, and meaningful moments.
 *
 * Milestone types:
 *   - achievement: big wins, contracts, personal bests
 *   - struggle: tough days, setbacks, difficult decisions
 *   - humor: funny exchanges, inside jokes
 *   - growth: personal growth moments, habit breakthroughs
 *   - connection: meaningful conversations, emotional openness
 *
 * Milestones are permanent — they never get compressed or superseded.
 * They become the shared history that makes the relationship feel real.
 */

import { MemoryStore } from './store.js';

// ── Types ────────────────────────────────────────────────────────

export type MilestoneType = 'achievement' | 'struggle' | 'humor' | 'growth' | 'connection';

export interface Milestone {
  id: number;
  type: MilestoneType;
  content: string;
  date: string;
}

// ── Milestone Storage ───────────────────────────────────────────

/**
 * Store a milestone. Milestones use the observations table with
 * category 'milestone' and are never compressed or superseded.
 */
export function addMilestone(
  store: MemoryStore,
  type: MilestoneType,
  content: string,
  date?: string,
): void {
  const milestoneDate = date || new Date().toISOString().slice(0, 10);
  const fullContent = `[${type}] ${content} (${milestoneDate})`;

  // Dedup
  if (store.hasRecentObservation('milestone', fullContent)) return;

  store.addObservation('milestone', fullContent, 1.0, 'told');
}

/**
 * Get all milestones, most recent first.
 */
export function getMilestones(store: MemoryStore, limit: number = 20): Milestone[] {
  const obs = store.getObservationsByCategory('milestone', limit);
  return obs.map((o) => parseMilestone(o.id, o.content)).filter((m): m is Milestone => m !== null);
}

/**
 * Get milestones by type.
 */
export function getMilestonesByType(store: MemoryStore, type: MilestoneType, limit: number = 10): Milestone[] {
  return getMilestones(store, 50).filter((m) => m.type === type).slice(0, limit);
}

/**
 * Search milestones by keyword.
 */
export function searchMilestones(store: MemoryStore, query: string, limit: number = 5): Milestone[] {
  const all = getMilestones(store, 100);
  const lower = query.toLowerCase();
  return all.filter((m) => m.content.toLowerCase().includes(lower)).slice(0, limit);
}

// ── Anniversary Detection ───────────────────────────────────────

/**
 * Check for anniversaries — milestones that happened around this date.
 * Returns milestones from the same week in previous months/years.
 */
export function checkAnniversaries(
  store: MemoryStore,
  referenceDate?: Date,
): Milestone[] {
  const now = referenceDate || new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const anniversaries: Milestone[] = [];

  const all = getMilestones(store, 200);

  for (const m of all) {
    const mDate = new Date(m.date + 'T12:00:00Z');
    const mMonth = mDate.getMonth() + 1;
    const mDay = mDate.getDate();

    // Same month, within 3 days, but not current year
    if (mMonth === month && Math.abs(mDay - day) <= 3 && mDate.getFullYear() < now.getFullYear()) {
      anniversaries.push(m);
    }
  }

  return anniversaries;
}

// ── Streak & Relationship Duration ──────────────────────────────

/**
 * Get relationship duration — how long Edwin and Jan have been interacting.
 */
export function getRelationshipDuration(store: MemoryStore): {
  days: number;
  firstInteraction: string | null;
} {
  const db = store.raw();
  const first = db.prepare(
    "SELECT MIN(started_at) as first_date FROM conversations",
  ).get() as { first_date: string | null } | undefined;

  if (!first?.first_date) {
    return { days: 0, firstInteraction: null };
  }

  const firstDate = new Date(first.first_date);
  const days = Math.floor((Date.now() - firstDate.getTime()) / 86400000);

  return { days, firstInteraction: first.first_date };
}

/**
 * Get conversation count — total interactions.
 */
export function getConversationCount(store: MemoryStore): number {
  const db = store.raw();
  const row = db.prepare("SELECT COUNT(*) as cnt FROM conversations").get() as { cnt: number };
  return row.cnt;
}

// ── Context for Reasoning ───────────────────────────────────────

/**
 * Format relationship context for the reasoning brief.
 * Returns null if no milestones exist.
 */
export function formatRelationshipContext(store: MemoryStore, referenceDate?: Date): string | null {
  const milestones = getMilestones(store, 10);
  if (milestones.length === 0) return null;

  const lines: string[] = ['[SHARED HISTORY]'];

  // Relationship duration
  const duration = getRelationshipDuration(store);
  if (duration.firstInteraction) {
    lines.push(`Edwin and Jan: ${duration.days} day(s) together.`);
  }

  // Recent milestones (last 5)
  const recent = milestones.slice(0, 5);
  if (recent.length > 0) {
    lines.push('Recent milestones:');
    for (const m of recent) {
      lines.push(`  - [${m.type}] ${m.content}`);
    }
  }

  // Achievements count for motivational reference
  const achievements = milestones.filter((m) => m.type === 'achievement');
  if (achievements.length > 0) {
    lines.push(`Total wins remembered: ${achievements.length}`);
  }

  // Anniversaries
  const anniversaries = checkAnniversaries(store, referenceDate);
  if (anniversaries.length > 0) {
    lines.push('Anniversaries around this date:');
    for (const a of anniversaries) {
      lines.push(`  - ${a.content} (${a.date})`);
    }
  }

  lines.push('');
  lines.push('Use shared history to connect with Jan — reference past wins during slumps, acknowledge growth, and let the relationship feel lived-in.');

  return lines.join('\n');
}

// ── Internal Helpers ─────────────────────────────────────────────

function parseMilestone(id: number, content: string): Milestone | null {
  const match = content.match(/^\[(\w+)\] (.+?) \((\d{4}-\d{2}-\d{2})\)$/);
  if (!match) return null;

  return {
    id,
    type: match[1] as MilestoneType,
    content: match[2],
    date: match[3],
  };
}
