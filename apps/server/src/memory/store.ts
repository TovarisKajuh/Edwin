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
        AND (expires_at IS NULL OR expires_at > datetime('now'))
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

  // ── Memory Snapshot ────────────────────────────────────────────────

  buildMemorySnapshot(): string {
    const allIdentity = this.getAllIdentity();
    const lines: string[] = [];

    // Group identity by category
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

    // Recent observations with confidence markers
    const observationCategories = this.db.raw().prepare(`
      SELECT DISTINCT category FROM observations
      WHERE observed_at >= datetime('now', '-7 days')
        AND (expires_at IS NULL OR expires_at > datetime('now'))
    `).all() as { category: string }[];

    if (observationCategories.length > 0) {
      lines.push('\n=== RECENT OBSERVATIONS ===');
      for (const { category } of observationCategories) {
        const observations = this.getRecentObservations(category, 7);
        if (observations.length > 0) {
          lines.push(`\n[${category}]`);
          for (const obs of observations) {
            const marker = obs.confidence >= 0.7 ? '[confirmed]' : '[tentative]';
            lines.push(`  ${marker} ${obs.content}`);
          }
        }
      }
    }

    return lines.join('\n');
  }
}
