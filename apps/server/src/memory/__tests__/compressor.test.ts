import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Database } from '../../db/database';
import { MemoryStore } from '../store';

vi.mock('../../brain/reasoning', () => ({
  callClaude: vi.fn(),
}));

import { callClaude } from '../../brain/reasoning';
import {
  summarizeConversation,
  compressDaily,
  compressWeekly,
  promoteObservations,
} from '../compressor';

const mockedCallClaude = vi.mocked(callClaude);

describe('Memory Compressor', () => {
  let db: Database;
  let store: MemoryStore;

  beforeEach(() => {
    db = new Database(':memory:');
    store = new MemoryStore(db);
    vi.clearAllMocks();
  });

  afterEach(() => {
    db.close();
  });

  // ── Conversation Summarization ──────────────────────────────────

  describe('summarizeConversation', () => {
    it('should summarize a conversation and store the summary', async () => {
      const convId = store.startConversation('chat');
      store.addMessage(convId, 'jan', 'I have a meeting with the solar supplier on Friday.');
      store.addMessage(convId, 'edwin', 'Noted, sir. I\'ll keep that in mind.');
      store.addMessage(convId, 'jan', 'Also, I need to call the electrician about the panel wiring.');
      store.addMessage(convId, 'edwin', 'I\'ll remind you, sir.');

      mockedCallClaude.mockResolvedValueOnce(
        'Jan discussed his upcoming solar supplier meeting on Friday and mentioned needing to call the electrician about panel wiring. The conversation was business-focused and Jan seemed organized.',
      );

      const summary = await summarizeConversation(store, convId);

      expect(summary).toBeDefined();
      expect(summary).toContain('solar supplier');

      // Verify it was stored in the conversation
      const conv = store.getActiveConversation('chat');
      expect(conv?.summary).toBe(summary);
    });

    it('should return null for conversations with fewer than 2 messages', async () => {
      const convId = store.startConversation('chat');
      store.addMessage(convId, 'jan', 'Hi');

      const summary = await summarizeConversation(store, convId);
      expect(summary).toBeNull();
      expect(mockedCallClaude).not.toHaveBeenCalled();
    });

    it('should handle Claude API failure gracefully', async () => {
      const convId = store.startConversation('chat');
      store.addMessage(convId, 'jan', 'Hello');
      store.addMessage(convId, 'edwin', 'Hi sir');

      mockedCallClaude.mockRejectedValueOnce(new Error('API error'));

      const summary = await summarizeConversation(store, convId);
      expect(summary).toBeNull();
    });
  });

  // ── Daily Compression ───────────────────────────────────────────

  describe('compressDaily', () => {
    it('should compress observations for a date into a daily summary', async () => {
      // Insert observations with a specific date
      const today = new Date().toISOString().slice(0, 10);
      db.raw().prepare(`
        INSERT INTO observations (category, content, confidence, source, observed_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run('fact', 'Jan went to the gym', 0.9, 'observed');
      db.raw().prepare(`
        INSERT INTO observations (category, content, confidence, source, observed_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run('fact', 'Jan had a client meeting', 0.85, 'observed');
      db.raw().prepare(`
        INSERT INTO observations (category, content, confidence, source, observed_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run('emotional_state', 'Jan seemed stressed', 0.7, 'observed');

      mockedCallClaude.mockResolvedValueOnce(
        'Jan had an active day — he went to the gym and attended a client meeting. He seemed stressed, likely from work pressure.',
      );

      const summary = await compressDaily(store, today);

      expect(summary).toBeDefined();
      expect(summary).toContain('gym');

      // Verify daily summary observation was created
      const dailySummaries = store.getObservationsByCategory('daily_summary');
      expect(dailySummaries).toHaveLength(1);
      expect(dailySummaries[0].content).toContain(today);

      // Verify original observations were marked as compressed
      const obs1 = db.raw().prepare(
        "SELECT source FROM observations WHERE content = 'Jan went to the gym'"
      ).get() as { source: string };
      expect(obs1.source).toBe('compressed');

      const obs2 = db.raw().prepare(
        "SELECT source FROM observations WHERE content = 'Jan had a client meeting'"
      ).get() as { source: string };
      expect(obs2.source).toBe('compressed');
    });

    it('should not compress if fewer than 3 observations', async () => {
      const today = new Date().toISOString().slice(0, 10);
      db.raw().prepare(`
        INSERT INTO observations (category, content, confidence, source, observed_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run('fact', 'Just one observation', 0.9, 'observed');

      const summary = await compressDaily(store, today);
      expect(summary).toBeNull();
      expect(mockedCallClaude).not.toHaveBeenCalled();
    });

    it('should handle Claude API failure gracefully', async () => {
      const today = new Date().toISOString().slice(0, 10);
      for (let i = 0; i < 3; i++) {
        db.raw().prepare(`
          INSERT INTO observations (category, content, confidence, source, observed_at)
          VALUES (?, ?, ?, ?, datetime('now'))
        `).run('fact', `Observation ${i}`, 0.9, 'observed');
      }

      mockedCallClaude.mockRejectedValueOnce(new Error('API error'));

      const summary = await compressDaily(store, today);
      expect(summary).toBeNull();

      // Original observations should NOT be compressed on failure
      const obs = db.raw().prepare(
        "SELECT source FROM observations WHERE source = 'observed'"
      ).all();
      expect(obs).toHaveLength(3);
    });
  });

  // ── Weekly Compression ──────────────────────────────────────────

  describe('compressWeekly', () => {
    it('should create a weekly summary from daily summaries', async () => {
      // Insert daily summaries for a week
      const weekStart = '2026-03-02';
      db.raw().prepare(`
        INSERT INTO observations (category, content, confidence, source, observed_at)
        VALUES (?, ?, ?, ?, '2026-03-02 20:00:00')
      `).run('daily_summary', '[2026-03-02] Jan worked out and had meetings', 1.0, 'observed');
      db.raw().prepare(`
        INSERT INTO observations (category, content, confidence, source, observed_at)
        VALUES (?, ?, ?, ?, '2026-03-03 20:00:00')
      `).run('daily_summary', '[2026-03-03] Jan skipped gym, ordered Wolt', 1.0, 'observed');

      mockedCallClaude.mockResolvedValueOnce(JSON.stringify({
        highlights: 'Jan had productive work meetings early in the week',
        concerns: 'Gym attendance dropped mid-week, resorting to food delivery',
        patterns: 'Strong start to weeks followed by declining discipline',
        mood_trend: 'Started motivated, became stressed by Wednesday',
      }));

      const result = await compressWeekly(store, weekStart);

      expect(result).toBeDefined();
      expect(result!.highlights).toContain('productive');
      expect(result!.concerns).toContain('Gym');

      // Verify stored in weekly_summaries
      const stored = store.getWeeklySummary(weekStart);
      expect(stored).toBeDefined();
      expect(stored!.highlights).toBe(result!.highlights);
    });

    it('should return null when no observations exist for the week', async () => {
      const result = await compressWeekly(store, '2026-01-01');
      expect(result).toBeNull();
      expect(mockedCallClaude).not.toHaveBeenCalled();
    });

    it('should handle malformed JSON from Claude', async () => {
      db.raw().prepare(`
        INSERT INTO observations (category, content, confidence, source, observed_at)
        VALUES (?, ?, ?, ?, '2026-03-02 20:00:00')
      `).run('daily_summary', '[2026-03-02] Some summary', 1.0, 'observed');

      mockedCallClaude.mockResolvedValueOnce('Not valid JSON');

      const result = await compressWeekly(store, '2026-03-02');
      expect(result).toBeNull();
    });
  });

  // ── Observation Promotion ──────────────────────────────────────

  describe('promoteObservations', () => {
    it('should promote observations to identity when threshold is met', () => {
      // Add 3+ observations in the same category
      store.addObservation('commitment', 'Jan will call the electrician', 0.9, 'observed');
      store.addObservation('commitment', 'Jan will go to the gym', 0.85, 'observed');
      store.addObservation('commitment', 'Jan will fix the car', 0.8, 'observed');

      const promoted = promoteObservations(store);
      expect(promoted).toBe(1);

      // Verify identity was created
      const identity = store.getIdentity('commitment', 'pattern_commitment');
      expect(identity).toBeDefined();
      expect(identity!.source).toBe('inferred');

      // Verify observations were marked as compressed
      const obs = db.raw().prepare(
        "SELECT COUNT(*) as cnt FROM observations WHERE source = 'compressed'"
      ).get() as { cnt: number };
      expect(obs.cnt).toBe(3);
    });

    it('should not promote if below threshold', () => {
      store.addObservation('fact', 'One fact', 0.9, 'observed');
      store.addObservation('fact', 'Two facts', 0.85, 'observed');

      const promoted = promoteObservations(store);
      expect(promoted).toBe(0);
    });

    it('should not promote if identity already exists', () => {
      store.setIdentity('commitment', 'pattern_commitment', 'existing value', 'told');
      store.addObservation('commitment', 'Commit 1', 0.9, 'observed');
      store.addObservation('commitment', 'Commit 2', 0.85, 'observed');
      store.addObservation('commitment', 'Commit 3', 0.8, 'observed');

      const promoted = promoteObservations(store);
      expect(promoted).toBe(0);
    });

    it('should not promote emotional_state or daily_summary categories', () => {
      store.addObservation('emotional_state', 'Stressed', 0.9, 'observed');
      store.addObservation('emotional_state', 'Tired', 0.8, 'observed');
      store.addObservation('emotional_state', 'Happy', 0.7, 'observed');

      const promoted = promoteObservations(store);
      expect(promoted).toBe(0);
    });
  });

  // ── Store Methods ──────────────────────────────────────────────

  describe('store compression methods', () => {
    it('should setConversationSummary', () => {
      const convId = store.startConversation('chat');
      store.setConversationSummary(convId, 'Test summary');

      const conv = store.getActiveConversation('chat');
      expect(conv?.summary).toBe('Test summary');
    });

    it('should getObservationsForDate', () => {
      const today = new Date().toISOString().slice(0, 10);
      store.addObservation('fact', 'Today fact', 0.9, 'observed');
      store.addObservation('fact', 'Also today', 0.8, 'observed');

      const obs = store.getObservationsForDate(today);
      expect(obs).toHaveLength(2);
    });

    it('should exclude superseded and compressed from getObservationsForDate', () => {
      store.addObservation('fact', 'Active', 0.9, 'observed');
      store.addObservation('fact', 'Superseded', 0.9, 'superseded');
      store.addObservation('fact', 'Compressed', 0.9, 'compressed');

      const today = new Date().toISOString().slice(0, 10);
      const obs = store.getObservationsForDate(today);
      expect(obs).toHaveLength(1);
      expect(obs[0].content).toBe('Active');
    });

    it('should markObservationsCompressed', () => {
      store.addObservation('fact', 'Fact 1', 0.9, 'observed');
      store.addObservation('fact', 'Fact 2', 0.85, 'observed');

      const allObs = db.raw().prepare('SELECT id FROM observations').all() as { id: number }[];
      store.markObservationsCompressed(allObs.map((o) => o.id));

      const active = store.getActiveObservations();
      expect(active).toHaveLength(0);

      // Still in DB though
      const total = db.raw().prepare('SELECT COUNT(*) as cnt FROM observations').get() as { cnt: number };
      expect(total.cnt).toBe(2);
    });

    it('should addWeeklySummary and getWeeklySummary', () => {
      store.addWeeklySummary('2026-03-02', 'Highlights', 'Concerns', 'Patterns', 'Good');

      const summary = store.getWeeklySummary('2026-03-02');
      expect(summary).toBeDefined();
      expect(summary!.highlights).toBe('Highlights');
      expect(summary!.concerns).toBe('Concerns');
      expect(summary!.patterns).toBe('Patterns');
      expect(summary!.mood_trend).toBe('Good');
    });

    it('should upsert weekly summary on conflict', () => {
      store.addWeeklySummary('2026-03-02', 'Old', 'Old', 'Old', 'Old');
      store.addWeeklySummary('2026-03-02', 'New', 'New', 'New', 'New');

      const summary = store.getWeeklySummary('2026-03-02');
      expect(summary!.highlights).toBe('New');
    });

    it('should exclude compressed observations from getActiveObservations', () => {
      store.addObservation('fact', 'Active fact', 0.9, 'observed');
      store.addObservation('fact', 'Compressed fact', 0.9, 'compressed');

      const active = store.getActiveObservations();
      expect(active).toHaveLength(1);
      expect(active[0].content).toBe('Active fact');
    });

    it('should exclude compressed observations from getObservationsByCategory', () => {
      store.addObservation('fact', 'Active', 0.9, 'observed');
      store.addObservation('fact', 'Compressed', 0.9, 'compressed');

      const facts = store.getObservationsByCategory('fact');
      expect(facts).toHaveLength(1);
      expect(facts[0].content).toBe('Active');
    });
  });
});
