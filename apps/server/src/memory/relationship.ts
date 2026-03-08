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

// ── Milestone Detection Keywords ────────────────────────────────

const ACHIEVEMENT_PATTERNS = [
  'closed', 'signed', 'landed', 'won', 'achieved', 'passed', 'hit',
  'personal best', 'new record', 'promotion', 'deal', 'contract',
  'sold', 'finished', 'completed', 'shipped', 'launched', 'streak',
  'milestone', 'first time', 'never done before',
];

const STRUGGLE_PATTERNS = [
  'lost', 'failed', 'rejected', 'fired', 'broke up', 'breakup',
  'worst day', 'hardest', 'toughest', 'crisis', 'emergency',
  'setback', 'disappointed', 'devastat',
];

const GROWTH_PATTERNS = [
  'realised', 'realized', 'learned', 'changed my mind', 'decided to',
  'never again', 'from now on', 'turning point', 'wake-up call',
  'breakthrough', 'finally understand', 'first week of', 'first month',
  'consistent for', 'been doing', 'every day for',
];

const HUMOR_PATTERNS = [
  'haha', 'lmao', 'that was hilarious', 'funniest', 'made me laugh',
  'inside joke', 'remember when', 'classic',
];

const CONNECTION_PATTERNS = [
  'appreciate you', 'grateful for you', 'means a lot', 'thank you edwin',
  'glad I have you', 'you understand', 'feel better now', 'helped me',
  'needed that', 'you were right',
];

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

// ── Milestone Detection ─────────────────────────────────────────

/**
 * Analyze a conversation exchange and detect if it contains a milestone.
 * Called after memory extraction to identify significant moments.
 */
export function detectMilestone(
  janMessage: string,
  edwinResponse: string,
): { type: MilestoneType; content: string } | null {
  const combined = (janMessage + ' ' + edwinResponse).toLowerCase();
  const janLower = janMessage.toLowerCase();

  // Achievement — Jan shares a win
  if (hasPatterns(janLower, ACHIEVEMENT_PATTERNS)) {
    return {
      type: 'achievement',
      content: summariseMilestone(janMessage, 'achievement'),
    };
  }

  // Struggle — Jan shares a setback
  if (hasPatterns(janLower, STRUGGLE_PATTERNS)) {
    return {
      type: 'struggle',
      content: summariseMilestone(janMessage, 'struggle'),
    };
  }

  // Growth — Jan shows personal growth
  if (hasPatterns(janLower, GROWTH_PATTERNS)) {
    return {
      type: 'growth',
      content: summariseMilestone(janMessage, 'growth'),
    };
  }

  // Connection — Jan expresses appreciation for Edwin
  if (hasPatterns(janLower, CONNECTION_PATTERNS)) {
    return {
      type: 'connection',
      content: summariseMilestone(janMessage, 'connection'),
    };
  }

  // Humor — shared funny moment
  if (hasPatterns(combined, HUMOR_PATTERNS)) {
    return {
      type: 'humor',
      content: summariseMilestone(janMessage, 'humor'),
    };
  }

  return null;
}

/**
 * Detect and store milestones from a conversation.
 * Called from the extraction pipeline after memory extraction.
 */
export function detectAndStoreMilestones(
  store: MemoryStore,
  messages: { role: 'jan' | 'edwin'; content: string }[],
): number {
  let stored = 0;

  for (let i = 0; i < messages.length - 1; i++) {
    const msg = messages[i];
    const next = messages[i + 1];

    if (msg.role === 'jan' && next.role === 'edwin') {
      const milestone = detectMilestone(msg.content, next.content);
      if (milestone) {
        addMilestone(store, milestone.type, milestone.content);
        stored++;
      }
    }
  }

  return stored;
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

function hasPatterns(text: string, patterns: string[]): boolean {
  return patterns.some((p) => text.includes(p));
}

function summariseMilestone(message: string, type: MilestoneType): string {
  // Take first 120 chars, clean up
  const clean = message.replace(/\n/g, ' ').trim();
  if (clean.length <= 120) return clean;
  return clean.slice(0, 117) + '...';
}

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
