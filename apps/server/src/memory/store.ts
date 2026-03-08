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

export interface CalendarEventRow {
  id: number;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  location: string | null;
  event_type: string;
  recurring: string | null;
  external_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemorySearchResult {
  tier: 'observation' | 'identity' | 'conversation' | 'weekly_summary';
  category: string;
  content: string;
  relevance: number;
  date: string | null;
}

export class MemoryStore {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /** Expose raw database for direct queries (used by subsystems like reminders). */
  raw() {
    return this.db.raw();
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

  /** Get conversation summaries for a specific date (YYYY-MM-DD) */
  getConversationSummariesForDate(date: string): { summary: string; channel: string; started_at: string }[] {
    return this.db.raw().prepare(`
      SELECT summary, channel, started_at FROM conversations
      WHERE DATE(started_at) = ?
        AND summary IS NOT NULL
      ORDER BY started_at ASC
    `).all(date) as { summary: string; channel: string; started_at: string }[];
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

  // ── Memory Search ─────────────────────────────────────────────────

  /**
   * Search across all memory tiers by keyword.
   * Returns unified results ranked by relevance: exact match > partial match,
   * with recency and confidence weighting.
   */
  searchMemory(query: string, limit: number = 10): MemorySearchResult[] {
    const results: MemorySearchResult[] = [];
    const lowerQuery = query.toLowerCase();
    const queryPattern = `%${query}%`;

    // 1. Search observations (active only)
    const observations = this.db.raw().prepare(`
      SELECT id, category, content, confidence, source, observed_at
      FROM observations
      WHERE content LIKE ?
        AND source NOT IN ('superseded', 'compressed')
      ORDER BY observed_at DESC
      LIMIT ?
    `).all(queryPattern, limit * 2) as ObservationRow[];

    for (const obs of observations) {
      const lowerContent = obs.content.toLowerCase();
      let relevance = lowerContent.includes(lowerQuery) ? 5 : 1;

      // Exact match bonus
      if (lowerContent === lowerQuery) relevance = 10;

      // Confidence weighting
      relevance *= obs.confidence;

      // Recency bonus (observations from last 7 days get a boost)
      const ageMs = Date.now() - new Date(obs.observed_at).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      if (ageDays < 1) relevance *= 2.0;
      else if (ageDays < 7) relevance *= 1.5;
      else if (ageDays < 30) relevance *= 1.2;

      results.push({
        tier: 'observation',
        category: obs.category,
        content: obs.content,
        relevance,
        date: obs.observed_at,
      });
    }

    // 2. Search identity
    const identityResults = this.db.raw().prepare(`
      SELECT category, key, value, confidence
      FROM identity
      WHERE value LIKE ? OR key LIKE ?
      LIMIT ?
    `).all(queryPattern, queryPattern, limit) as IdentityRow[];

    for (const row of identityResults) {
      const lowerValue = row.value.toLowerCase();
      let relevance = lowerValue.includes(lowerQuery) ? 6 : 3;
      if (lowerValue === lowerQuery) relevance = 10;
      relevance *= row.confidence;

      // Identity is permanent knowledge — boost it
      relevance *= 1.3;

      results.push({
        tier: 'identity',
        category: row.category,
        content: `${row.key}: ${row.value}`,
        relevance,
        date: row.updated_at,
      });
    }

    // 3. Search conversation summaries
    const conversations = this.db.raw().prepare(`
      SELECT summary, started_at
      FROM conversations
      WHERE summary LIKE ?
        AND summary IS NOT NULL
      ORDER BY started_at DESC
      LIMIT ?
    `).all(queryPattern, limit) as { summary: string; started_at: string }[];

    for (const conv of conversations) {
      let relevance = conv.summary.toLowerCase().includes(lowerQuery) ? 4 : 1;
      results.push({
        tier: 'conversation',
        category: 'summary',
        content: conv.summary,
        relevance,
        date: conv.started_at,
      });
    }

    // 4. Search weekly summaries
    const weeklies = this.db.raw().prepare(`
      SELECT week_start, highlights, concerns, patterns, mood_trend
      FROM weekly_summaries
      WHERE highlights LIKE ?
        OR concerns LIKE ?
        OR patterns LIKE ?
      ORDER BY week_start DESC
      LIMIT ?
    `).all(queryPattern, queryPattern, queryPattern, limit) as {
      week_start: string;
      highlights: string;
      concerns: string;
      patterns: string;
      mood_trend: string;
    }[];

    for (const weekly of weeklies) {
      const combined = `${weekly.highlights} ${weekly.concerns} ${weekly.patterns}`;
      let relevance = combined.toLowerCase().includes(lowerQuery) ? 3 : 1;
      results.push({
        tier: 'weekly_summary',
        category: 'weekly',
        content: `Week of ${weekly.week_start}: ${weekly.highlights}. Concerns: ${weekly.concerns}. Patterns: ${weekly.patterns}`,
        relevance,
        date: weekly.week_start,
      });
    }

    // Sort by relevance (highest first), then by date (most recent first)
    results.sort((a, b) => {
      if (b.relevance !== a.relevance) return b.relevance - a.relevance;
      return (b.date ?? '').localeCompare(a.date ?? '');
    });

    return results.slice(0, limit);
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
  // ── Scheduled Actions ──────────────────────────────────────────

  addScheduledAction(
    type: string,
    description: string,
    triggerTime: string,
    stakesLevel: string = 'low',
  ): number {
    const result = this.db.raw().prepare(`
      INSERT INTO scheduled_actions (type, description, trigger_time, stakes_level)
      VALUES (?, ?, ?, ?)
    `).run(type, description, triggerTime, stakesLevel);
    return Number(result.lastInsertRowid);
  }

  getPendingActions(limit: number = 10): { id: number; type: string; description: string; trigger_time: string; stakes_level: string; created_at: string }[] {
    return this.db.raw().prepare(`
      SELECT id, type, description, trigger_time, stakes_level, created_at
      FROM scheduled_actions
      WHERE status = 'pending'
      ORDER BY trigger_time ASC
      LIMIT ?
    `).all(limit) as { id: number; type: string; description: string; trigger_time: string; stakes_level: string; created_at: string }[];
  }

  getDueActions(now: string): { id: number; type: string; description: string; trigger_time: string; stakes_level: string }[] {
    return this.db.raw().prepare(`
      SELECT id, type, description, trigger_time, stakes_level
      FROM scheduled_actions
      WHERE status = 'pending' AND trigger_time <= ?
      ORDER BY trigger_time ASC
    `).all(now) as { id: number; type: string; description: string; trigger_time: string; stakes_level: string }[];
  }

  markActionDone(id: number): void {
    this.db.raw().prepare(`
      UPDATE scheduled_actions SET status = 'done', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(id);
  }

  /** Get notifications (type='notification'), most recent first. Pending = unread. */
  getNotifications(limit: number = 20): { id: number; description: string; trigger_time: string; stakes_level: string; status: string }[] {
    return this.db.raw().prepare(`
      SELECT id, description, trigger_time, stakes_level, status
      FROM scheduled_actions
      WHERE type = 'notification'
      ORDER BY trigger_time DESC
      LIMIT ?
    `).all(limit) as { id: number; description: string; trigger_time: string; stakes_level: string; status: string }[];
  }

  /** Count unread notifications (type='notification' AND status='pending') */
  getUnreadNotificationCount(): number {
    const row = this.db.raw().prepare(`
      SELECT COUNT(*) as count FROM scheduled_actions
      WHERE type = 'notification' AND status = 'pending'
    `).get() as { count: number };
    return row.count;
  }

  /** Mark a notification as read (sets status to 'done') */
  markNotificationRead(id: number): boolean {
    const result = this.db.raw().prepare(`
      UPDATE scheduled_actions
      SET status = 'done', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND type = 'notification'
    `).run(id);
    return result.changes > 0;
  }

  // ── Push Subscriptions ──────────────────────────────────────────

  /** Store or update a push subscription */
  savePushSubscription(endpoint: string, p256dh: string, auth: string): void {
    this.db.raw().prepare(`
      INSERT INTO push_subscriptions (endpoint, p256dh, auth)
      VALUES (?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth
    `).run(endpoint, p256dh, auth);
  }

  /** Get all push subscriptions */
  getAllPushSubscriptions(): { endpoint: string; p256dh: string; auth: string }[] {
    return this.db.raw().prepare(
      'SELECT endpoint, p256dh, auth FROM push_subscriptions',
    ).all() as { endpoint: string; p256dh: string; auth: string }[];
  }

  /** Remove a push subscription (e.g., on 410 Gone) */
  removePushSubscription(endpoint: string): void {
    this.db.raw().prepare(
      'DELETE FROM push_subscriptions WHERE endpoint = ?',
    ).run(endpoint);
  }

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

  // ── Calendar Events ──────────────────────────────────────────

  /** Add a calendar event. Returns the event ID. */
  addCalendarEvent(
    title: string,
    startTime: string,
    endTime?: string,
    options?: { description?: string; location?: string; eventType?: string; recurring?: string; externalId?: string },
  ): number {
    const result = this.db.raw().prepare(
      `INSERT INTO calendar_events (title, description, start_time, end_time, location, event_type, recurring, external_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      title,
      options?.description ?? null,
      startTime,
      endTime ?? null,
      options?.location ?? null,
      options?.eventType ?? 'event',
      options?.recurring ?? null,
      options?.externalId ?? null,
    );
    return result.lastInsertRowid as number;
  }

  /** Get events for a specific date (YYYY-MM-DD). */
  getEventsForDate(date: string): CalendarEventRow[] {
    return this.db.raw().prepare(
      `SELECT * FROM calendar_events
       WHERE start_time >= ? AND start_time < ?
       ORDER BY start_time ASC`,
    ).all(`${date}T00:00:00`, `${date}T23:59:59`) as CalendarEventRow[];
  }

  /** Get events in a date range. */
  getEventsInRange(startDate: string, endDate: string): CalendarEventRow[] {
    return this.db.raw().prepare(
      `SELECT * FROM calendar_events
       WHERE start_time >= ? AND start_time <= ?
       ORDER BY start_time ASC`,
    ).all(`${startDate}T00:00:00`, `${endDate}T23:59:59`) as CalendarEventRow[];
  }

  /** Get upcoming events from now. */
  getUpcomingEvents(limit: number = 10): CalendarEventRow[] {
    const now = new Date().toISOString();
    return this.db.raw().prepare(
      `SELECT * FROM calendar_events
       WHERE start_time >= ?
       ORDER BY start_time ASC
       LIMIT ?`,
    ).all(now, limit) as CalendarEventRow[];
  }

  /** Get a single calendar event by ID. */
  getCalendarEventById(id: number): CalendarEventRow | undefined {
    return this.db.raw().prepare(
      'SELECT * FROM calendar_events WHERE id = ?',
    ).get(id) as CalendarEventRow | undefined;
  }

  /** Delete a calendar event by ID. */
  deleteCalendarEvent(id: number): void {
    this.db.raw().prepare('DELETE FROM calendar_events WHERE id = ?').run(id);
  }
}
