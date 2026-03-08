import { describe, it, expect, beforeEach } from 'vitest';
import { Database } from '../../db/database';
import { MemoryStore } from '../../memory/store';
import { scanForFollowUps, formatFollowUps } from '../follow-up-engine';

let store: MemoryStore;

beforeEach(() => {
  const db = new Database(':memory:');
  store = new MemoryStore(db);
});

describe('Follow-up Engine', () => {
  // ── Commitment Follow-ups ──────────────────────────────────────

  describe('commitment timing', () => {
    it('should flag today-commitment for evening follow-up (6+ hours old)', () => {
      const sixHoursAgo = new Date(Date.now() - 6 * 3600000).toISOString();
      store.addObservation('commitment', 'Jan will call the electrician today', 1.0, 'told');
      // Backdate the observation
      store['db'].raw().prepare(
        "UPDATE observations SET observed_at = ? WHERE category = 'commitment'",
      ).run(sixHoursAgo);

      const candidates = scanForFollowUps(store, 'evening');

      expect(candidates.some((c) => c.content.includes('electrician'))).toBe(true);
      expect(candidates[0].type).toBe('commitment');
      expect(candidates[0].reason).toContain('Same-day');
    });

    it('should not flag today-commitment too early', () => {
      // Only 2 hours old — too soon
      const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
      store.addObservation('commitment', 'Jan will call the electrician today', 1.0, 'told');
      store['db'].raw().prepare(
        "UPDATE observations SET observed_at = ? WHERE category = 'commitment'",
      ).run(twoHoursAgo);

      const candidates = scanForFollowUps(store, 'afternoon');
      expect(candidates.filter((c) => c.content.includes('electrician'))).toHaveLength(0);
    });

    it('should flag yesterday commitment in the morning', () => {
      const seventeenHoursAgo = new Date(Date.now() - 17 * 3600000).toISOString();
      store.addObservation('commitment', 'Jan will finish the report today', 1.0, 'told');
      store['db'].raw().prepare(
        "UPDATE observations SET observed_at = ? WHERE category = 'commitment'",
      ).run(seventeenHoursAgo);

      const candidates = scanForFollowUps(store, 'morning');
      expect(candidates.some((c) => c.content.includes('report'))).toBe(true);
    });

    it('should flag tomorrow-commitment after 24h in afternoon', () => {
      const thirtyHoursAgo = new Date(Date.now() - 30 * 3600000).toISOString();
      store.addObservation('commitment', 'Jan will go to the gym tomorrow', 1.0, 'told');
      store['db'].raw().prepare(
        "UPDATE observations SET observed_at = ? WHERE category = 'commitment'",
      ).run(thirtyHoursAgo);

      const candidates = scanForFollowUps(store, 'afternoon');
      expect(candidates.some((c) => c.content.includes('gym'))).toBe(true);
    });

    it('should flag open-ended commitment after 2 days', () => {
      const twoDaysAgo = new Date(Date.now() - 50 * 3600000).toISOString();
      store.addObservation('commitment', 'Jan said he would start meal prepping', 1.0, 'told');
      store['db'].raw().prepare(
        "UPDATE observations SET observed_at = ? WHERE category = 'commitment'",
      ).run(twoDaysAgo);

      const candidates = scanForFollowUps(store, 'afternoon');
      expect(candidates.some((c) => c.content.includes('meal prepping'))).toBe(true);
    });

    it('should not flag open-ended commitment that is too old (5+ days)', () => {
      const fiveDaysAgo = new Date(Date.now() - 120 * 3600000).toISOString();
      store.addObservation('commitment', 'Jan said he would start meal prepping', 1.0, 'told');
      store['db'].raw().prepare(
        "UPDATE observations SET observed_at = ? WHERE category = 'commitment'",
      ).run(fiveDaysAgo);

      const candidates = scanForFollowUps(store, 'afternoon');
      expect(candidates.filter((c) => c.content.includes('meal prepping'))).toHaveLength(0);
    });
  });

  // ── Double Follow-up Prevention ────────────────────────────────

  describe('double follow-up prevention', () => {
    it('should not follow up if a notification already mentions the commitment', () => {
      const sixHoursAgo = new Date(Date.now() - 6 * 3600000).toISOString();
      store.addObservation('commitment', 'Jan will call the electrician today', 1.0, 'told');
      store['db'].raw().prepare(
        "UPDATE observations SET observed_at = ? WHERE category = 'commitment'",
      ).run(sixHoursAgo);

      // Simulate a previous follow-up notification
      store.addScheduledAction(
        'notification',
        'Sir, did you manage to call the electrician?',
        new Date().toISOString(),
        'low',
      );

      const candidates = scanForFollowUps(store, 'evening');
      expect(candidates.filter((c) => c.content.includes('electrician'))).toHaveLength(0);
    });

    it('should not follow up if a follow_up observation already exists', () => {
      const sixHoursAgo = new Date(Date.now() - 6 * 3600000).toISOString();
      store.addObservation('commitment', 'Jan will go to the gym today', 1.0, 'told');
      store['db'].raw().prepare(
        "UPDATE observations SET observed_at = ? WHERE category = 'commitment'",
      ).run(sixHoursAgo);

      // Existing follow-up observation
      store.addObservation('follow_up', 'Check if Jan went to the gym', 0.8, 'inferred');

      const candidates = scanForFollowUps(store, 'evening');
      // The commitment shouldn't trigger because the follow_up already covers it
      const commitmentCandidates = candidates.filter((c) => c.type === 'commitment' && c.content.includes('gym'));
      expect(commitmentCandidates).toHaveLength(0);
    });

    it('should allow follow-up for different commitments', () => {
      const sixHoursAgo = new Date(Date.now() - 6 * 3600000).toISOString();
      store.addObservation('commitment', 'Jan will call the electrician today', 1.0, 'told');
      store.addObservation('commitment', 'Jan will finish the report today', 1.0, 'told');
      store['db'].raw().prepare(
        "UPDATE observations SET observed_at = ? WHERE category = 'commitment'",
      ).run(sixHoursAgo);

      // Only followed up on the electrician
      store.addScheduledAction(
        'notification',
        'Sir, did you call the electrician?',
        new Date().toISOString(),
        'low',
      );

      const candidates = scanForFollowUps(store, 'evening');
      expect(candidates.filter((c) => c.content.includes('electrician'))).toHaveLength(0);
      expect(candidates.filter((c) => c.content.includes('report'))).toHaveLength(1);
    });
  });

  // ── Follow-up Observations ─────────────────────────────────────

  describe('follow-up observations', () => {
    it('should flag pending follow-ups that are 4+ hours old', () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 3600000).toISOString();
      store.addObservation('follow_up', 'Check if client responded to proposal', 0.9, 'inferred');
      store['db'].raw().prepare(
        "UPDATE observations SET observed_at = ? WHERE category = 'follow_up'",
      ).run(fiveHoursAgo);

      const candidates = scanForFollowUps(store, 'afternoon');
      expect(candidates.some((c) => c.content.includes('client') && c.type === 'follow_up')).toBe(true);
    });

    it('should not flag recent follow-ups (under 4h)', () => {
      store.addObservation('follow_up', 'Check if client responded', 0.9, 'inferred');

      const candidates = scanForFollowUps(store, 'afternoon');
      expect(candidates.filter((c) => c.type === 'follow_up')).toHaveLength(0);
    });
  });

  // ── Wellbeing Check ────────────────────────────────────────────

  describe('wellbeing check', () => {
    it('should flag wellbeing check when multiple concerning mood signals', () => {
      store.addObservation('emotional_state', 'Jan is stressed about the deadline', 0.8, 'observed');
      store.addObservation('emotional_state', 'Jan seems overwhelmed with work', 0.7, 'observed');

      const candidates = scanForFollowUps(store, 'afternoon');
      expect(candidates.some((c) => c.type === 'wellbeing')).toBe(true);
    });

    it('should not flag wellbeing in morning or evening', () => {
      store.addObservation('emotional_state', 'Jan is stressed', 0.8, 'observed');
      store.addObservation('emotional_state', 'Jan is overwhelmed', 0.7, 'observed');

      const morningCandidates = scanForFollowUps(store, 'morning');
      expect(morningCandidates.filter((c) => c.type === 'wellbeing')).toHaveLength(0);

      const eveningCandidates = scanForFollowUps(store, 'evening');
      expect(eveningCandidates.filter((c) => c.type === 'wellbeing')).toHaveLength(0);
    });

    it('should not flag with only one concerning mood signal', () => {
      store.addObservation('emotional_state', 'Jan is stressed', 0.8, 'observed');

      const candidates = scanForFollowUps(store, 'afternoon');
      expect(candidates.filter((c) => c.type === 'wellbeing')).toHaveLength(0);
    });

    it('should not flag with positive mood', () => {
      store.addObservation('emotional_state', 'Jan is energised', 0.8, 'observed');
      store.addObservation('emotional_state', 'Jan is motivated', 0.7, 'observed');

      const candidates = scanForFollowUps(store, 'afternoon');
      expect(candidates.filter((c) => c.type === 'wellbeing')).toHaveLength(0);
    });
  });

  // ── Empty State ────────────────────────────────────────────────

  describe('empty state', () => {
    it('should return empty when no commitments or follow-ups', () => {
      const candidates = scanForFollowUps(store, 'afternoon');
      expect(candidates).toEqual([]);
    });
  });

  // ── Format ─────────────────────────────────────────────────────

  describe('formatFollowUps', () => {
    it('should format commitment follow-ups', () => {
      const formatted = formatFollowUps([{
        observationId: 1,
        content: 'Jan will call the electrician today',
        type: 'commitment',
        ageHours: 8,
        reason: 'Same-day commitment — evening check-in',
      }]);

      expect(formatted).toHaveLength(1);
      expect(formatted[0]).toContain('FOLLOW-UP DUE');
      expect(formatted[0]).toContain('electrician');
    });

    it('should format wellbeing checks', () => {
      const formatted = formatFollowUps([{
        observationId: 1,
        content: 'Jan is stressed about deadlines',
        type: 'wellbeing',
        ageHours: 0,
        reason: '2 concerning mood signals',
      }]);

      expect(formatted[0]).toContain('WELLBEING CHECK');
    });

    it('should format follow-up observations', () => {
      const formatted = formatFollowUps([{
        observationId: 1,
        content: 'Check if client responded',
        type: 'follow_up',
        ageHours: 5,
        reason: 'Follow-up pending for 5h',
      }]);

      expect(formatted[0]).toContain('CHECK NEEDED');
    });
  });
});
