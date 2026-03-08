import { describe, it, expect, beforeEach } from 'vitest';
import { buildReasoningBrief, formatReasoningBrief } from '../reasoning-context';
import { MemoryStore } from '../../memory/store';
import { Database } from '../../db/database';

let store: MemoryStore;

beforeEach(() => {
  const db = new Database(':memory:');
  store = new MemoryStore(db);
});

describe('Reasoning Context', () => {
  // ── Temporal Awareness ─────────────────────────────────────────

  describe('temporal', () => {
    it('should include day name and time of day', () => {
      const brief = buildReasoningBrief(store, 'morning', 'weekday');
      expect(brief.temporal).toContain('morning');
      expect(brief.temporal).toContain('weekday');
    });
  });

  // ── Mood Awareness ─────────────────────────────────────────────

  describe('mood', () => {
    it('should include recent mood when available', () => {
      store.addObservation('emotional_state', 'Jan seems stressed about the deadline', 0.8, 'inferred');

      const brief = buildReasoningBrief(store, 'afternoon', 'weekday');
      expect(brief.recentMood).toContain('stressed');
    });

    it('should return null mood when no emotional observations', () => {
      const brief = buildReasoningBrief(store, 'morning', 'weekday');
      expect(brief.recentMood).toBeNull();
    });

    it('should generate stress awareness signal', () => {
      store.addObservation('emotional_state', 'Jan is stressed', 0.8, 'inferred');

      const brief = buildReasoningBrief(store, 'afternoon', 'weekday');
      expect(brief.awareness.some((a) => a.includes('empathize'))).toBe(true);
    });

    it('should generate energy awareness signal', () => {
      store.addObservation('emotional_state', 'Jan is energised and excited', 0.8, 'observed');

      const brief = buildReasoningBrief(store, 'morning', 'weekday');
      expect(brief.awareness.some((a) => a.includes('match energy'))).toBe(true);
    });

    it('should generate tired awareness signal', () => {
      store.addObservation('emotional_state', 'Jan is exhausted', 0.8, 'observed');

      const brief = buildReasoningBrief(store, 'evening', 'weekday');
      expect(brief.awareness.some((a) => a.includes('rest'))).toBe(true);
    });

    it('should generate anxiety awareness signal', () => {
      store.addObservation('emotional_state', 'Jan seems anxious about the presentation', 0.8, 'inferred');

      const brief = buildReasoningBrief(store, 'morning', 'weekday');
      expect(brief.awareness.some((a) => a.includes('reassure'))).toBe(true);
    });

    it('should generate frustration awareness signal', () => {
      store.addObservation('emotional_state', 'Jan is frustrated with the supplier', 0.8, 'observed');

      const brief = buildReasoningBrief(store, 'afternoon', 'weekday');
      expect(brief.awareness.some((a) => a.includes('next steps'))).toBe(true);
    });

    it('should generate sadness awareness signal', () => {
      store.addObservation('emotional_state', 'Jan is feeling down today', 0.7, 'inferred');

      const brief = buildReasoningBrief(store, 'afternoon', 'weekday');
      expect(brief.awareness.some((a) => a.includes('warm'))).toBe(true);
    });

    it('should generate boredom awareness signal', () => {
      store.addObservation('emotional_state', 'Jan seems bored and unmotivated', 0.7, 'inferred');

      const brief = buildReasoningBrief(store, 'afternoon', 'weekday');
      expect(brief.awareness.some((a) => a.includes('engaging'))).toBe(true);
    });

    it('should generate calm awareness signal', () => {
      store.addObservation('emotional_state', 'Jan is relaxed and calm', 0.8, 'observed');

      const brief = buildReasoningBrief(store, 'afternoon', 'weekday');
      expect(brief.awareness.some((a) => a.includes('planning'))).toBe(true);
    });

    it('should generate anger awareness signal', () => {
      store.addObservation('emotional_state', 'Jan is angry about a client cancellation', 0.9, 'observed');

      const brief = buildReasoningBrief(store, 'afternoon', 'weekday');
      expect(brief.awareness.some((a) => a.includes('vent'))).toBe(true);
    });

    it('should prioritize stress over tiredness when both present', () => {
      // "stressed and drained" contains both stress and drained keywords
      // Stress should win because it's higher priority
      store.addObservation('emotional_state', 'Jan is stressed and drained', 0.8, 'observed');

      const brief = buildReasoningBrief(store, 'afternoon', 'weekday');
      expect(brief.awareness.some((a) => a.includes('empathize'))).toBe(true);
    });
  });

  // ── Commitments ────────────────────────────────────────────────

  describe('commitments', () => {
    it('should include active commitments', () => {
      store.addObservation('commitment', 'Jan will go to the gym tomorrow', 1.0, 'told');
      store.addObservation('commitment', 'Jan will call the electrician this week', 1.0, 'told');

      const brief = buildReasoningBrief(store, 'morning', 'weekday');
      expect(brief.activeCommitments).toHaveLength(2);
      expect(brief.activeCommitments.some((c) => c.includes('gym'))).toBe(true);
    });
  });

  // ── Pending Actions ────────────────────────────────────────────

  describe('pending actions', () => {
    it('should include pending reminders', () => {
      store.addScheduledAction('reminder', 'Call electrician', '2026-03-09T14:00:00', 'medium');

      const brief = buildReasoningBrief(store, 'morning', 'weekday');
      expect(brief.pendingActions).toHaveLength(1);
      expect(brief.pendingActions[0]).toContain('Call electrician');
    });

    it('should generate pending action awareness', () => {
      store.addScheduledAction('reminder', 'Something', '2026-03-09T14:00:00', 'low');

      const brief = buildReasoningBrief(store, 'morning', 'weekday');
      expect(brief.awareness.some((a) => a.includes('pending reminder'))).toBe(true);
    });
  });

  // ── Follow-ups ─────────────────────────────────────────────────

  describe('follow-ups', () => {
    it('should include follow-up awareness', () => {
      store.addObservation('follow_up', 'Ask Jan about the supplier meeting', 0.8, 'observed');

      const brief = buildReasoningBrief(store, 'morning', 'weekday');
      expect(brief.awareness.some((a) => a.includes('Follow-ups pending'))).toBe(true);
    });
  });

  // ── Time-Based Awareness ───────────────────────────────────────

  describe('time-based awareness', () => {
    it('should encourage productivity on weekday mornings', () => {
      const brief = buildReasoningBrief(store, 'morning', 'weekday');
      expect(brief.awareness.some((a) => a.includes('productivity'))).toBe(true);
    });

    it('should encourage rest in the evening', () => {
      const brief = buildReasoningBrief(store, 'evening', 'weekday');
      expect(brief.awareness.some((a) => a.includes('wind down'))).toBe(true);
    });

    it('should discourage productivity at night', () => {
      const brief = buildReasoningBrief(store, 'night', 'weekday');
      expect(brief.awareness.some((a) => a.includes('rest'))).toBe(true);
    });

    it('should balance rest and activity on weekend mornings', () => {
      const brief = buildReasoningBrief(store, 'morning', 'saturday');
      expect(brief.awareness.some((a) => a.includes('Weekend'))).toBe(true);
    });
  });

  // ── Format ─────────────────────────────────────────────────────

  describe('formatReasoningBrief', () => {
    it('should include CURRENT AWARENESS header', () => {
      const brief = buildReasoningBrief(store, 'morning', 'weekday');
      const formatted = formatReasoningBrief(brief);
      expect(formatted).toContain('[YOUR CURRENT AWARENESS]');
    });

    it('should include reasoning instruction', () => {
      const brief = buildReasoningBrief(store, 'morning', 'weekday');
      const formatted = formatReasoningBrief(brief);
      expect(formatted).toContain('Think step by step');
    });

    it('should include all sections when data is available', () => {
      store.addObservation('emotional_state', 'Jan is stressed', 0.8, 'inferred');
      store.addObservation('commitment', 'Gym at 5pm', 1.0, 'told');
      store.addScheduledAction('reminder', 'Call supplier', '2026-03-09T10:00:00', 'medium');

      const brief = buildReasoningBrief(store, 'afternoon', 'weekday');
      const formatted = formatReasoningBrief(brief);

      expect(formatted).toContain('stressed');
      expect(formatted).toContain('Gym at 5pm');
      expect(formatted).toContain('Call supplier');
      expect(formatted).toContain('Consider before responding');
    });
  });
});
