import { Source } from '@edwin/shared';
import { Database } from '../db/database.js';

interface IdentityRow {
  id: number;
  category: string;
  key: string;
  value: string;
  source: Source;
  confidence: number;
  created_at: string;
  updated_at: string;
}

interface ObservationRow {
  id: number;
  category: string;
  content: string;
  confidence: number;
  source: Source;
  observed_at: string;
  expires_at: string | null;
}

interface ConversationRow {
  id: number;
  channel: string;
  started_at: string;
  ended_at: string | null;
  summary: string | null;
  mood: string | null;
}

interface MessageRow {
  id: number;
  conversation_id: number;
  role: 'edwin' | 'jan';
  content: string;
  timestamp: string;
}

export class MemoryStore {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  // ── Identity (Tier 1) ──────────────────────────────────────────────

  setIdentity(
    category: string,
    key: string,
    value: string,
    source: Source,
    confidence: number = 1.0
  ): void {
    this.db.raw().prepare(`
      INSERT INTO identity (category, key, value, source, confidence)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(category, key) DO UPDATE SET
        value = excluded.value,
        source = excluded.source,
        confidence = excluded.confidence,
        updated_at = CURRENT_TIMESTAMP
    `).run(category, key, value, source, confidence);
  }

  getIdentity(category: string, key: string): IdentityRow | undefined {
    return this.db.raw().prepare(
      'SELECT * FROM identity WHERE category = ? AND key = ?'
    ).get(category, key) as IdentityRow | undefined;
  }

  getIdentityCategory(category: string): IdentityRow[] {
    return this.db.raw().prepare(
      'SELECT * FROM identity WHERE category = ?'
    ).all(category) as IdentityRow[];
  }

  getAllIdentity(): IdentityRow[] {
    return this.db.raw().prepare(
      'SELECT * FROM identity ORDER BY category, key'
    ).all() as IdentityRow[];
  }

  // ── Observations (Tier 3) ──────────────────────────────────────────

  addObservation(
    category: string,
    content: string,
    confidence: number,
    source: Source,
    expiresAt?: string
  ): void {
    this.db.raw().prepare(`
      INSERT INTO observations (category, content, confidence, source, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(category, content, confidence, source, expiresAt ?? null);
  }

  getRecentObservations(category: string, days: number = 7): ObservationRow[] {
    return this.db.raw().prepare(`
      SELECT * FROM observations
      WHERE category = ?
        AND observed_at >= datetime('now', ? || ' days')
      ORDER BY observed_at DESC, id DESC
    `).all(category, -days) as ObservationRow[];
  }

  // ── Conversations ──────────────────────────────────────────────────

  startConversation(channel: string): number {
    const result = this.db.raw().prepare(
      'INSERT INTO conversations (channel) VALUES (?)'
    ).run(channel);
    return Number(result.lastInsertRowid);
  }

  endConversation(id: number, summary?: string, mood?: string): void {
    this.db.raw().prepare(`
      UPDATE conversations
      SET ended_at = CURRENT_TIMESTAMP, summary = ?, mood = ?
      WHERE id = ?
    `).run(summary ?? null, mood ?? null, id);
  }

  addMessage(
    conversationId: number,
    role: 'edwin' | 'jan',
    content: string
  ): number {
    const result = this.db.raw().prepare(
      'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)'
    ).run(conversationId, role, content);
    return Number(result.lastInsertRowid);
  }

  getMessages(conversationId: number): MessageRow[] {
    return this.db.raw().prepare(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC'
    ).all(conversationId) as MessageRow[];
  }

  getRecentMessages(limit: number = 20): MessageRow[] {
    return this.db.raw().prepare(
      'SELECT * FROM messages ORDER BY timestamp DESC, id DESC LIMIT ?'
    ).all(limit) as MessageRow[];
  }

  getActiveConversation(channel: string): ConversationRow | undefined {
    return this.db.raw().prepare(`
      SELECT * FROM conversations
      WHERE channel = ? AND ended_at IS NULL
      ORDER BY started_at DESC
      LIMIT 1
    `).get(channel) as ConversationRow | undefined;
  }

  // ── Health / Diagnostics ───────────────────────────────────────────

  /** Total number of observations in the database */
  getObservationCount(): number {
    const row = this.db.raw().prepare('SELECT COUNT(*) as count FROM observations').get() as { count: number };
    return row.count;
  }

  /** Database file size in MB (0 for in-memory databases) */
  getDatabaseSizeMB(): number {
    try {
      const row = this.db.raw().prepare(
        "SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()"
      ).get() as { size: number } | undefined;
      return row ? row.size / (1024 * 1024) : 0;
    } catch {
      return 0;
    }
  }

  // ── Observation Queries ────────────────────────────────────────────

  /** Get all active observations (excludes superseded and compressed), most recent first. */
  getActiveObservations(limit: number = 50): ObservationRow[] {
    return this.db.raw().prepare(`
      SELECT * FROM observations
      WHERE source NOT IN ('superseded', 'compressed')
      ORDER BY observed_at DESC, id DESC
      LIMIT ?
    `).all(limit) as ObservationRow[];
  }

  /** Get active observations of a specific category (excludes superseded and compressed), most recent first */
  getObservationsByCategory(category: string, limit: number = 20): ObservationRow[] {
    return this.db.raw().prepare(`
      SELECT * FROM observations
      WHERE category = ?
        AND source NOT IN ('superseded', 'compressed')
      ORDER BY observed_at DESC, id DESC
      LIMIT ?
    `).all(category, limit) as ObservationRow[];
  }

  /** Check if a similar observation already exists (deduplication) */
  hasRecentObservation(category: string, content: string): boolean {
    const existing = this.db.raw().prepare(`
      SELECT 1 FROM observations
      WHERE category = ?
        AND content = ?
      LIMIT 1
    `).get(category, content);
    return existing !== undefined;
  }

  /**
   * Mark an observation as superseded by newer information.
   * The old observation is NOT deleted — it's marked so it won't appear
   * in active queries, but the knowledge history is preserved.
   */
  supersedeObservation(id: number, supersededBy: string): void {
    this.db.raw().prepare(`
      UPDATE observations
      SET source = 'superseded',
          confidence = 0,
          expires_at = ?
      WHERE id = ?
    `).run(supersededBy, id);
  }

  /** Get an observation by ID */
  getObservation(id: number): ObservationRow | undefined {
    return this.db.raw().prepare(
      'SELECT * FROM observations WHERE id = ?'
    ).get(id) as ObservationRow | undefined;
  }

  // ── Conversation Management ────────────────────────────────────────

  /** Update conversation with a summary */
  setConversationSummary(id: number, summary: string): void {
    this.db.raw().prepare(
      'UPDATE conversations SET summary = ? WHERE id = ?'
    ).run(summary, id);
  }

  // ── Date-Based Queries ────────────────────────────────────────────

  /** Get active observations for a specific date (YYYY-MM-DD) */
  getObservationsForDate(date: string): ObservationRow[] {
    return this.db.raw().prepare(`
      SELECT * FROM observations
      WHERE DATE(observed_at) = ?
        AND source NOT IN ('superseded', 'compressed')
      ORDER BY observed_at ASC
    `).all(date) as ObservationRow[];
  }

  /** Get observations within a date range, optionally filtered by category */
  getObservationsByDateRange(
    startDate: string,
    endDate: string,
    category?: string,
  ): ObservationRow[] {
    if (category) {
      return this.db.raw().prepare(`
        SELECT * FROM observations
        WHERE DATE(observed_at) BETWEEN ? AND ?
          AND category = ?
          AND source NOT IN ('superseded', 'compressed')
        ORDER BY observed_at ASC
      `).all(startDate, endDate, category) as ObservationRow[];
    }
    return this.db.raw().prepare(`
      SELECT * FROM observations
      WHERE DATE(observed_at) BETWEEN ? AND ?
        AND source NOT IN ('superseded', 'compressed')
      ORDER BY observed_at ASC
    `).all(startDate, endDate) as ObservationRow[];
  }

  // ── Compression ───────────────────────────────────────────────────

  /** Mark observations as compressed (not deleted, just excluded from active queries) */
  markObservationsCompressed(ids: number[]): void {
    if (ids.length === 0) return;
    const placeholders = ids.map(() => '?').join(',');
    this.db.raw().prepare(`
      UPDATE observations
      SET source = 'compressed'
      WHERE id IN (${placeholders})
    `).run(...ids);
  }

  /** Get promotion candidates: categories with many observations that could become identity facts */
  getPromotionCandidates(minCount: number): {
    category: string;
    key: string;
    value: string;
    confidence: number;
    observationIds: number[];
  }[] {
    // Find categories with enough active observations
    const groups = this.db.raw().prepare(`
      SELECT category, COUNT(*) as cnt
      FROM observations
      WHERE source NOT IN ('superseded', 'compressed')
        AND category NOT IN ('daily_summary', 'emotional_state')
      GROUP BY category
      HAVING cnt >= ?
    `).all(minCount) as { category: string; cnt: number }[];

    const candidates: {
      category: string;
      key: string;
      value: string;
      confidence: number;
      observationIds: number[];
    }[] = [];

    for (const group of groups) {
      // Get all observations in this category
      const observations = this.db.raw().prepare(`
        SELECT id, content, confidence FROM observations
        WHERE category = ?
          AND source NOT IN ('superseded', 'compressed')
        ORDER BY confidence DESC, observed_at DESC
      `).all(group.category) as { id: number; content: string; confidence: number }[];

      if (observations.length < minCount) continue;

      // Use the highest confidence observation as the promoted value
      const best = observations[0];
      candidates.push({
        category: group.category === 'fact' ? 'learned_facts' : group.category,
        key: `pattern_${group.category}`,
        value: best.content,
        confidence: best.confidence,
        observationIds: observations.map((o) => o.id),
      });
    }

    return candidates;
  }

  // ── Weekly Summaries ──────────────────────────────────────────────

  /** Store a weekly summary */
  addWeeklySummary(
    weekStart: string,
    highlights: string,
    concerns: string,
    patterns: string,
    moodTrend: string,
  ): void {
    this.db.raw().prepare(`
      INSERT INTO weekly_summaries (week_start, highlights, concerns, patterns, mood_trend)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(week_start) DO UPDATE SET
        highlights = excluded.highlights,
        concerns = excluded.concerns,
        patterns = excluded.patterns,
        mood_trend = excluded.mood_trend
    `).run(weekStart, highlights, concerns, patterns, moodTrend);
  }

  /** Get a weekly summary */
  getWeeklySummary(weekStart: string): {
    week_start: string;
    highlights: string;
    concerns: string;
    patterns: string;
    mood_trend: string;
  } | undefined {
    return this.db.raw().prepare(
      'SELECT * FROM weekly_summaries WHERE week_start = ?'
    ).get(weekStart) as {
      week_start: string;
      highlights: string;
      concerns: string;
      patterns: string;
      mood_trend: string;
    } | undefined;
  }

  // ── Memory Snapshot ────────────────────────────────────────────────

  /** Raw identity snapshot — structured data about Jan */
  buildIdentitySnapshot(): string {
    const allIdentity = this.getAllIdentity();
    const lines: string[] = [];

    const grouped: Record<string, IdentityRow[]> = {};
    for (const row of allIdentity) {
      if (!grouped[row.category]) {
        grouped[row.category] = [];
      }
      grouped[row.category].push(row);
    }

    lines.push('=== IDENTITY ===');
    for (const [category, rows] of Object.entries(grouped)) {
      lines.push(`\n[${category}]`);
      for (const row of rows) {
        lines.push(`  ${row.key}: ${row.value}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Build a natural-language memory context for Claude's system prompt.
   * Prioritizes: commitments > follow-ups > emotional states > facts > preferences
   * Formatted as natural text, capped to stay concise.
   * Uses a single DB query for efficiency.
   */
  buildMemorySnapshot(): string {
    const identitySnapshot = this.buildIdentitySnapshot();

    // Single query: get all active observations, group in code
    const allActive = this.getActiveObservations(100);

    const grouped: Record<string, ObservationRow[]> = {};
    for (const obs of allActive) {
      if (!grouped[obs.category]) {
        grouped[obs.category] = [];
      }
      grouped[obs.category].push(obs);
    }

    const commitments = grouped['commitment'] ?? [];
    const followUps = grouped['follow_up'] ?? [];
    const emotions = grouped['emotional_state'] ?? [];
    const facts = grouped['fact'] ?? [];
    const preferences = grouped['preference'] ?? [];

    const memoryLines: string[] = [];

    if (commitments.length > 0) {
      memoryLines.push('Active commitments from Jan:');
      for (const c of commitments.slice(0, 5)) {
        memoryLines.push(`- ${c.content}`);
      }
    }

    if (followUps.length > 0) {
      memoryLines.push('Things to follow up on:');
      for (const f of followUps.slice(0, 5)) {
        memoryLines.push(`- ${f.content}`);
      }
    }

    if (emotions.length > 0) {
      memoryLines.push(`Jan's recent mood: ${emotions[0].content}`);
    }

    if (facts.length > 0) {
      memoryLines.push('Recent things Jan mentioned:');
      for (const f of facts.slice(0, 8)) {
        memoryLines.push(`- ${f.content}`);
      }
    }

    if (preferences.length > 0) {
      memoryLines.push('Known preferences:');
      for (const p of preferences.slice(0, 5)) {
        memoryLines.push(`- ${p.content}`);
      }
    }

    const sections = [identitySnapshot];
    if (memoryLines.length > 0) {
      sections.push('\n=== WHAT YOU REMEMBER ===\n' + memoryLines.join('\n'));
    }

    return sections.join('\n');
  }
}
