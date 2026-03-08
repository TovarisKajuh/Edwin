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

  /** Get all active observations (excludes superseded), most recent first. */
  getActiveObservations(limit: number = 50): ObservationRow[] {
    return this.db.raw().prepare(`
      SELECT * FROM observations
      WHERE source != 'superseded'
      ORDER BY observed_at DESC, id DESC
      LIMIT ?
    `).all(limit) as ObservationRow[];
  }

  /** Get active observations of a specific category (excludes superseded), most recent first */
  getObservationsByCategory(category: string, limit: number = 20): ObservationRow[] {
    return this.db.raw().prepare(`
      SELECT * FROM observations
      WHERE category = ?
        AND source != 'superseded'
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
