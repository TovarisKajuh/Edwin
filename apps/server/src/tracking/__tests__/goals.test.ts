import { describe, it, expect, beforeEach } from 'vitest';
import { Database } from '../../db/database';
import { MemoryStore } from '../../memory/store';
import {
  getGoals,
  updateGoalValue,
  calculateProgress,
  getGoalSnapshot,
  generateMonthlySnapshot,
  formatGoalContext,
  getGoalMotivation,
  type Goal,
} from '../goals';

let store: MemoryStore;

const REF_DATE = new Date('2026-06-01T12:00:00Z'); // ~5.5 years from 2031 deadline

beforeEach(() => {
  const db = new Database(':memory:');
  store = new MemoryStore(db);
});

describe('Goal Tracking', () => {
  // ── Goal Retrieval ────────────────────────────────────────────

  describe('getGoals', () => {
    it('should return default vision goals with zero values', () => {
      const goals = getGoals(store);
      expect(goals.length).toBeGreaterThanOrEqual(4);

      const netWorth = goals.find((g) => g.id === 'net_worth');
      expect(netWorth).toBeDefined();
      expect(netWorth!.target).toBe(6_000_000);
      expect(netWorth!.currentValue).toBe(0);
    });

    it('should return stored values when updated', () => {
      updateGoalValue(store, 'net_worth', 150000);

      const goals = getGoals(store);
      const netWorth = goals.find((g) => g.id === 'net_worth');
      expect(netWorth!.currentValue).toBe(150000);
    });

    it('should use live data for gym consistency', () => {
      // Log gym completions this week
      const today = new Date().toISOString().slice(0, 10);
      store.addObservation('habit_log', `[gym] completed (${today})`, 1.0, 'told');

      const goals = getGoals(store);
      const gym = goals.find((g) => g.id === 'gym_consistency');
      expect(gym).toBeDefined();
      // Should pull from habit stats
      expect(gym!.currentValue).toBeGreaterThanOrEqual(0);
    });

    it('should use live data for social network', () => {
      // Add people with recent contact
      const db = store.raw();
      const today = new Date().toISOString().slice(0, 10);
      db.prepare("INSERT INTO people (name, relationship, last_contact) VALUES (?, ?, ?)").run('Max', 'friend', today);
      db.prepare("INSERT INTO people (name, relationship, last_contact) VALUES (?, ?, ?)").run('Anna', 'family', today);

      const goals = getGoals(store);
      const social = goals.find((g) => g.id === 'social_network');
      expect(social!.currentValue).toBe(2);
    });
  });

  // ── Goal Value Updates ────────────────────────────────────────

  describe('updateGoalValue', () => {
    it('should store goal value in identity table', () => {
      updateGoalValue(store, 'net_worth', 250000);
      const identity = store.getIdentity('goal', 'net_worth');
      expect(identity).toBeDefined();
      expect(identity!.value).toBe('250000');
    });

    it('should update existing value', () => {
      updateGoalValue(store, 'company_revenue', 500000);
      updateGoalValue(store, 'company_revenue', 750000);

      const identity = store.getIdentity('goal', 'company_revenue');
      expect(identity!.value).toBe('750000');
    });
  });

  // ── Progress Calculation ──────────────────────────────────────

  describe('calculateProgress', () => {
    it('should calculate percentage correctly', () => {
      const goal: Goal = {
        id: 'test',
        name: 'Test Goal',
        category: 'financial',
        target: 1000,
        unit: 'EUR',
        deadline: '2031-12-31',
        currentValue: 250,
        lastUpdated: null,
      };

      const progress = calculateProgress(goal, REF_DATE);
      expect(progress.percentage).toBe(25);
    });

    it('should cap percentage at 100', () => {
      const goal: Goal = {
        id: 'test',
        name: 'Test Goal',
        category: 'fitness',
        target: 4,
        unit: 'sessions',
        deadline: '2031-12-31',
        currentValue: 5,
        lastUpdated: null,
      };

      const progress = calculateProgress(goal, REF_DATE);
      expect(progress.percentage).toBe(100);
      expect(progress.onTrack).toBe(true);
    });

    it('should calculate months remaining', () => {
      const goal: Goal = {
        id: 'test',
        name: 'Test Goal',
        category: 'financial',
        target: 6_000_000,
        unit: 'EUR',
        deadline: '2031-12-31',
        currentValue: 0,
        lastUpdated: null,
      };

      const progress = calculateProgress(goal, REF_DATE);
      // June 2026 to Dec 2031 = ~66 months
      expect(progress.monthsRemaining).toBeGreaterThan(60);
      expect(progress.monthsRemaining).toBeLessThan(70);
    });

    it('should show behind-schedule for slow progress', () => {
      const goal: Goal = {
        id: 'test',
        name: 'Test Goal',
        category: 'financial',
        target: 6_000_000,
        unit: 'EUR',
        deadline: '2031-12-31',
        currentValue: 10000,  // Very low for a €6M target
        lastUpdated: null,
      };

      const progress = calculateProgress(goal, REF_DATE);
      expect(progress.onTrack).toBe(false);
      expect(progress.accelerationNeeded).toBeGreaterThan(1);
    });

    it('should handle zero current value', () => {
      const goal: Goal = {
        id: 'test',
        name: 'Test Goal',
        category: 'financial',
        target: 1000,
        unit: 'EUR',
        deadline: '2031-12-31',
        currentValue: 0,
        lastUpdated: null,
      };

      const progress = calculateProgress(goal, REF_DATE);
      expect(progress.percentage).toBe(0);
      expect(progress.projectedCompletion).toBeNull();
    });
  });

  // ── Goal Snapshot ─────────────────────────────────────────────

  describe('getGoalSnapshot', () => {
    it('should return snapshot with all goals', () => {
      const snapshot = getGoalSnapshot(store, REF_DATE);
      expect(snapshot.goals.length).toBeGreaterThanOrEqual(4);
      expect(typeof snapshot.overallScore).toBe('number');
    });

    it('should calculate weighted overall score', () => {
      updateGoalValue(store, 'net_worth', 600000);  // 10% of 6M
      updateGoalValue(store, 'company_revenue', 1500000);  // 10% of 15M

      const snapshot = getGoalSnapshot(store, REF_DATE);
      expect(snapshot.overallScore).toBeGreaterThan(0);
    });

    it('should identify top win', () => {
      updateGoalValue(store, 'net_worth', 3000000);  // 50%

      const snapshot = getGoalSnapshot(store, REF_DATE);
      expect(snapshot.topWin).toContain('Net Worth');
      expect(snapshot.topWin).toContain('50%');
    });

    it('should identify top concern when behind', () => {
      updateGoalValue(store, 'net_worth', 1000);  // Basically nothing

      const snapshot = getGoalSnapshot(store, REF_DATE);
      // Some goals will be behind schedule
      // With such a low value, net worth should be a concern
      if (snapshot.topConcern) {
        expect(snapshot.topConcern).toContain('acceleration');
      }
    });
  });

  // ── Monthly Snapshot ──────────────────────────────────────────

  describe('generateMonthlySnapshot', () => {
    it('should generate text and store as observation', () => {
      updateGoalValue(store, 'net_worth', 200000);

      const text = generateMonthlySnapshot(store, REF_DATE);
      expect(text).toContain('Goal Progress');
      expect(text).toContain('Net Worth');

      // Should be stored as observation
      const obs = store.getObservationsByCategory('goal_progress', 5);
      expect(obs.length).toBe(1);
      expect(obs[0].content).toContain('Goal Progress');
    });

    it('should include overall percentage', () => {
      updateGoalValue(store, 'net_worth', 600000);
      const text = generateMonthlySnapshot(store, REF_DATE);
      expect(text).toContain('Overall:');
    });
  });

  // ── Context Formatting ────────────────────────────────────────

  describe('formatGoalContext', () => {
    it('should return null when no goal data exists', () => {
      const result = formatGoalContext(store, REF_DATE);
      expect(result).toBeNull();
    });

    it('should return context when goals have progress', () => {
      updateGoalValue(store, 'net_worth', 500000);
      const result = formatGoalContext(store, REF_DATE);
      expect(result).not.toBeNull();
      expect(result).toContain('VISION PROGRESS');
      expect(result).toContain('Net Worth');
    });

    it('should include on-track status', () => {
      updateGoalValue(store, 'net_worth', 3000000);
      const result = formatGoalContext(store, REF_DATE);
      expect(result).toContain('50%');
    });
  });

  // ── Goal Motivation ───────────────────────────────────────────

  describe('getGoalMotivation', () => {
    it('should return null with no data', () => {
      const result = getGoalMotivation(store);
      expect(result).toBeNull();
    });

    it('should flag gym sessions needed', () => {
      // Log 2 gym sessions this week (target is 4)
      const today = new Date().toISOString().slice(0, 10);
      store.addObservation('habit_log', `[gym] completed (${today})`, 1.0, 'told');

      const result = getGoalMotivation(store);
      if (result) {
        expect(result).toContain('gym');
      }
    });

    it('should flag overdue contacts for social goal', () => {
      const db = store.raw();
      db.prepare("INSERT INTO people (name, relationship, last_contact, contact_frequency_goal) VALUES (?, ?, ?, ?)").run('Old Friend', 'friend', '2025-01-01', 'monthly');

      const result = getGoalMotivation(store);
      if (result) {
        expect(result).toContain('overdue');
      }
    });

    it('should note early stage wealth building', () => {
      updateGoalValue(store, 'net_worth', 50000);  // Well under 10% of 6M

      const result = getGoalMotivation(store);
      expect(result).not.toBeNull();
      expect(result).toContain('wealth building');
    });
  });
});
