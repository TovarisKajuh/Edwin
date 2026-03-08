import { describe, it, expect, beforeEach } from 'vitest';
import { Database } from '../../../db/database';
import { MemoryStore } from '../../../memory/store';
import { assessCapacity, formatEvaluationContext } from '../evaluator';

let store: MemoryStore;

beforeEach(() => {
  const db = new Database(':memory:');
  store = new MemoryStore(db);
});

describe('Cost-Benefit Evaluator', () => {
  // ── Energy assessment ────────────────────────────────────────

  describe('energy', () => {
    it('should detect low energy from tired mood', () => {
      store.addObservation('emotional_state', 'Jan is exhausted and drained', 0.8, 'observed');

      const assessment = assessCapacity(store, 'afternoon', 'weekday');
      expect(assessment.energy).toBe('low');
    });

    it('should detect high energy from excited mood', () => {
      store.addObservation('emotional_state', 'Jan is energised and ready to go', 0.8, 'observed');

      const assessment = assessCapacity(store, 'afternoon', 'weekday');
      expect(assessment.energy).toBe('high');
    });

    it('should detect low energy from stress', () => {
      store.addObservation('emotional_state', 'Jan is overwhelmed with deadlines', 0.8, 'inferred');

      const assessment = assessCapacity(store, 'afternoon', 'weekday');
      expect(assessment.energy).toBe('low');
    });

    it('should default to high energy in morning without mood data', () => {
      const assessment = assessCapacity(store, 'morning', 'weekday');
      expect(assessment.energy).toBe('high');
    });

    it('should default to low energy at night without mood data', () => {
      const assessment = assessCapacity(store, 'night', 'weekday');
      expect(assessment.energy).toBe('low');
    });

    it('should default to moderate energy in afternoon without mood data', () => {
      const assessment = assessCapacity(store, 'afternoon', 'weekday');
      expect(assessment.energy).toBe('moderate');
    });
  });

  // ── Time availability ────────────────────────────────────────

  describe('time availability', () => {
    it('should be none at night', () => {
      const assessment = assessCapacity(store, 'night', 'weekday');
      expect(assessment.timeAvailable).toBe('none');
    });

    it('should be abundant with no commitments or actions', () => {
      const assessment = assessCapacity(store, 'morning', 'weekday');
      expect(assessment.timeAvailable).toBe('abundant');
    });

    it('should be limited with one today-commitment', () => {
      store.addObservation('commitment', 'Jan will call the supplier today', 1.0, 'told');

      const assessment = assessCapacity(store, 'morning', 'weekday');
      expect(assessment.timeAvailable).toBe('limited');
    });

    it('should be none with many upcoming actions', () => {
      const soon1 = new Date(Date.now() + 1 * 3600000).toISOString();
      const soon2 = new Date(Date.now() + 2 * 3600000).toISOString();
      const soon3 = new Date(Date.now() + 2.5 * 3600000).toISOString();

      store.addScheduledAction('reminder', 'Meeting 1', soon1, 'medium');
      store.addScheduledAction('reminder', 'Meeting 2', soon2, 'medium');
      store.addScheduledAction('reminder', 'Meeting 3', soon3, 'medium');

      const assessment = assessCapacity(store, 'morning', 'weekday');
      expect(assessment.timeAvailable).toBe('none');
    });
  });

  // ── Financial mode ───────────────────────────────────────────

  describe('financial mode', () => {
    it('should default to neutral without financial data', () => {
      const assessment = assessCapacity(store, 'morning', 'weekday');
      expect(assessment.financialMode).toBe('neutral');
    });

    it('should detect saving mode from budget observations', () => {
      store.addObservation('fact', 'Jan mentioned he needs to save money this month', 0.8, 'observed');

      const assessment = assessCapacity(store, 'morning', 'weekday');
      expect(assessment.financialMode).toBe('saving');
    });

    it('should detect saving mode from overdue payments', () => {
      const past = new Date(Date.now() - 86400000).toISOString();
      store.addScheduledAction('reminder', 'Pay electricity bill', past, 'high');

      const assessment = assessCapacity(store, 'morning', 'weekday');
      expect(assessment.financialMode).toBe('saving');
    });

    it('should detect spending mode from positive financial observations', () => {
      store.addObservation('fact', 'Jan got a bonus this month', 0.8, 'observed');

      const assessment = assessCapacity(store, 'morning', 'weekday');
      expect(assessment.financialMode).toBe('spending');
    });
  });

  // ── Guidelines generation ────────────────────────────────────

  describe('guidelines', () => {
    it('should generate low-energy guideline when tired', () => {
      store.addObservation('emotional_state', 'Jan is exhausted', 0.8, 'observed');

      const assessment = assessCapacity(store, 'afternoon', 'weekday');
      expect(assessment.guidelines.some((g) => g.includes('low-energy'))).toBe(true);
    });

    it('should generate high-energy guideline when energised', () => {
      store.addObservation('emotional_state', 'Jan is pumped and ready', 0.8, 'observed');

      const assessment = assessCapacity(store, 'morning', 'weekday');
      expect(assessment.guidelines.some((g) => g.includes('energy'))).toBe(true);
    });

    it('should generate no-time guideline at night', () => {
      const assessment = assessCapacity(store, 'night', 'weekday');
      expect(assessment.guidelines.some((g) => g.includes('late at night'))).toBe(true);
    });

    it('should generate saving guideline when in saving mode', () => {
      store.addObservation('fact', 'Jan needs to cut costs this month', 0.8, 'observed');

      const assessment = assessCapacity(store, 'morning', 'weekday');
      expect(assessment.guidelines.some((g) => g.includes('saving mode'))).toBe(true);
    });

    it('should include top priorities in guidelines when present', () => {
      const soon = new Date(Date.now() + 2 * 3600000).toISOString();
      store.addScheduledAction('reminder', 'Call important client', soon, 'high');

      const assessment = assessCapacity(store, 'morning', 'weekday');
      expect(assessment.guidelines.some((g) => g.includes('Top priorities'))).toBe(true);
      expect(assessment.guidelines.some((g) => g.includes('client'))).toBe(true);
    });

    it('should generate evening guideline in evening', () => {
      const assessment = assessCapacity(store, 'evening', 'weekday');
      expect(assessment.guidelines.some((g) => g.includes('evening'))).toBe(true);
    });
  });

  // ── Format ───────────────────────────────────────────────────

  describe('formatEvaluationContext', () => {
    it('should return null when no guidelines', () => {
      // Morning with high energy, abundant time, neutral finances, no priorities
      // should still have a guideline for high energy
      // Let's create a case with truly no guidelines — hard since there are defaults
      // Actually the function returns null only when guidelines.length === 0
      const assessment = { energy: 'moderate' as const, timeAvailable: 'abundant' as const, financialMode: 'neutral' as const, topPriorityCount: 0, guidelines: [] };
      expect(formatEvaluationContext(assessment)).toBeNull();
    });

    it('should format guidelines with header', () => {
      const assessment = {
        energy: 'low' as const,
        timeAvailable: 'limited' as const,
        financialMode: 'saving' as const,
        topPriorityCount: 1,
        guidelines: ['Jan is low-energy.', 'Jan is in saving mode.'],
      };

      const formatted = formatEvaluationContext(assessment);

      expect(formatted).toContain('[PROPOSAL EVALUATION]');
      expect(formatted).toContain('low-energy');
      expect(formatted).toContain('saving mode');
      expect(formatted).toContain('right suggestion for RIGHT NOW');
    });
  });

  // ── Combined scenarios ───────────────────────────────────────

  describe('realistic scenarios', () => {
    it('exhausted Jan at night with overdue bill = maximum caution', () => {
      store.addObservation('emotional_state', 'Jan is completely wiped out', 0.9, 'observed');
      const past = new Date(Date.now() - 86400000).toISOString();
      store.addScheduledAction('reminder', 'Pay overdue invoice', past, 'high');

      const assessment = assessCapacity(store, 'night', 'weekday');

      expect(assessment.energy).toBe('low');
      expect(assessment.timeAvailable).toBe('none');
      expect(assessment.financialMode).toBe('saving');
      // Should have multiple caution guidelines
      expect(assessment.guidelines.length).toBeGreaterThanOrEqual(3);
    });

    it('energised Jan on weekend morning with no commitments = green light', () => {
      store.addObservation('emotional_state', 'Jan is excited and motivated', 0.9, 'observed');

      const assessment = assessCapacity(store, 'morning', 'saturday');

      expect(assessment.energy).toBe('high');
      expect(assessment.timeAvailable).toBe('abundant');
      expect(assessment.financialMode).toBe('neutral');
      // Should have energy guideline
      expect(assessment.guidelines.some((g) => g.includes('challenging'))).toBe(true);
    });
  });
});
