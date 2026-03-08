import { describe, it, expect, beforeEach } from 'vitest';
import { Database } from '../../db/database';
import { MemoryStore } from '../../memory/store';
import {
  logHabit,
  getHabitStats,
  formatHabitStats,
  formatHabitSummary,
  type HabitLog,
} from '../habits';

let store: MemoryStore;

beforeEach(() => {
  const db = new Database(':memory:');
  store = new MemoryStore(db);
});

describe('Habit Tracking', () => {
  // ── Logging ──────────────────────────────────────────────────

  describe('logHabit', () => {
    it('should log a gym completion', () => {
      const result = logHabit(store, {
        habit: 'gym',
        action: 'completed',
        date: '2026-03-09',
      });

      expect(result).toContain('Gym logged');
      expect(result).toContain('this week');

      const obs = store.getObservationsByCategory('habit_log');
      expect(obs).toHaveLength(1);
      expect(obs[0].content).toContain('[gym] completed');
      expect(obs[0].content).toContain('2026-03-09');
    });

    it('should log a skip with accountability', () => {
      const result = logHabit(store, {
        habit: 'gym',
        action: 'skipped',
        date: '2026-03-09',
      });

      expect(result).toContain('Gym skipped');
      expect(result).toContain('target');
    });

    it('should log sleep with value', () => {
      const result = logHabit(store, {
        habit: 'sleep',
        action: 'value',
        value: '7.5h',
        date: '2026-03-09',
      });

      expect(result).toContain('Sleep logged');
      expect(result).toContain('7.5h');

      const obs = store.getObservationsByCategory('habit_log');
      expect(obs[0].content).toContain('[sleep] value: 7.5h');
    });

    it('should log supplements with notes', () => {
      logHabit(store, {
        habit: 'supplements',
        action: 'completed',
        date: '2026-03-09',
        notes: 'creatine + magnesium',
      });

      const obs = store.getObservationsByCategory('habit_log');
      expect(obs[0].content).toContain('creatine + magnesium');
    });

    it('should reject invalid habits', () => {
      expect(() => logHabit(store, {
        habit: 'gaming' as any,
        action: 'completed',
        date: '2026-03-09',
      })).toThrow('Invalid habit');
    });

    it('should report streak count for consecutive completions', () => {
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-07' });
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-08' });
      const result = logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-09' });

      expect(result).toContain('3 days in a row');
    });

    it('should celebrate long streaks', () => {
      for (let i = 1; i <= 7; i++) {
        const date = `2026-03-${String(i).padStart(2, '0')}`;
        logHabit(store, { habit: 'supplements', action: 'completed', date });
      }

      const result = logHabit(store, { habit: 'supplements', action: 'completed', date: '2026-03-08' });
      expect(result).toContain('8-day streak');
      expect(result).toContain('outstanding');
    });

    it('should say "well earned rest" when goal already hit', () => {
      // Log 4 gym sessions (goal = 4)
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-09' }); // Monday
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-10' });
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-11' });
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-12' });

      // Skip on Friday — but goal already hit
      const result = logHabit(store, { habit: 'gym', action: 'skipped', date: '2026-03-13' });
      expect(result).toContain('well earned rest');
    });
  });

  // ── Stats ────────────────────────────────────────────────────

  describe('getHabitStats', () => {
    it('should return empty stats when no logs exist', () => {
      const stats = getHabitStats(store, 'gym', '2026-03-09');

      expect(stats.habit).toBe('gym');
      expect(stats.thisWeek.completed).toBe(0);
      expect(stats.thisWeek.skipped).toBe(0);
      expect(stats.lastWeek.completed).toBe(0);
      expect(stats.streak.current).toBe(0);
      expect(stats.goal).toBe(4);
      expect(stats.trend).toBe('stable');
    });

    it('should count this week completions', () => {
      // Week of March 9 (Monday)
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-09' });
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-10' });
      logHabit(store, { habit: 'gym', action: 'skipped', date: '2026-03-11' });

      const stats = getHabitStats(store, 'gym', '2026-03-11');

      expect(stats.thisWeek.completed).toBe(2);
      expect(stats.thisWeek.skipped).toBe(1);
      expect(stats.thisWeek.total).toBe(3);
    });

    it('should compare with last week', () => {
      // Last week (March 2-8)
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-02' });
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-03' });
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-04' });

      // This week (March 9-15)
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-09' });

      const stats = getHabitStats(store, 'gym', '2026-03-09');

      expect(stats.thisWeek.completed).toBe(1);
      expect(stats.lastWeek.completed).toBe(3);
      expect(stats.trend).toBe('declining');
    });

    it('should detect improving trend', () => {
      // Last week: 2 completions
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-02' });
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-03' });

      // This week: 3 completions
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-09' });
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-10' });
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-11' });

      const stats = getHabitStats(store, 'gym', '2026-03-11');

      expect(stats.trend).toBe('improving');
    });

    it('should calculate current streak', () => {
      logHabit(store, { habit: 'supplements', action: 'completed', date: '2026-03-07' });
      logHabit(store, { habit: 'supplements', action: 'completed', date: '2026-03-08' });
      logHabit(store, { habit: 'supplements', action: 'completed', date: '2026-03-09' });

      const stats = getHabitStats(store, 'supplements', '2026-03-09');

      expect(stats.streak.current).toBe(3);
    });

    it('should track longest streak', () => {
      // First streak: 5 days
      for (let i = 1; i <= 5; i++) {
        logHabit(store, { habit: 'gym', action: 'completed', date: `2026-02-${String(i).padStart(2, '0')}` });
      }
      // Gap
      logHabit(store, { habit: 'gym', action: 'skipped', date: '2026-02-06' });
      // Second streak: 2 days
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-02-07' });
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-02-08' });

      const stats = getHabitStats(store, 'gym', '2026-02-08');

      expect(stats.streak.longest).toBe(5);
      expect(stats.streak.current).toBe(2);
    });

    it('should collect values for value-type logs', () => {
      logHabit(store, { habit: 'sleep', action: 'value', value: '7.5h', date: '2026-03-09' });
      logHabit(store, { habit: 'sleep', action: 'value', value: '8h', date: '2026-03-10' });
      logHabit(store, { habit: 'sleep', action: 'value', value: '6h', date: '2026-03-11' });

      const stats = getHabitStats(store, 'sleep', '2026-03-11');

      expect(stats.thisWeek.values).toEqual(['7.5h', '8h', '6h']);
    });

    it('should reject invalid habits', () => {
      expect(() => getHabitStats(store, 'gaming' as any)).toThrow('Invalid habit');
    });
  });

  // ── Formatting ───────────────────────────────────────────────

  describe('formatHabitStats', () => {
    it('should format basic stats', () => {
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-09' });
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-10' });

      const stats = getHabitStats(store, 'gym', '2026-03-10');
      const formatted = formatHabitStats(stats);

      expect(formatted).toContain('Gym');
      expect(formatted).toContain('2/4');
      expect(formatted).toContain('streak');
    });

    it('should include comparison when last week has data', () => {
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-02' });
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-03' });
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-09' });

      const stats = getHabitStats(store, 'gym', '2026-03-09');
      const formatted = formatHabitStats(stats);

      expect(formatted).toContain('last week');
    });

    it('should include values for sleep', () => {
      logHabit(store, { habit: 'sleep', action: 'value', value: '7h', date: '2026-03-09' });

      const stats = getHabitStats(store, 'sleep', '2026-03-09');
      const formatted = formatHabitStats(stats);

      expect(formatted).toContain('Values: 7h');
    });
  });

  describe('formatHabitSummary', () => {
    it('should return null when no habits tracked', () => {
      const result = formatHabitSummary(store, '2026-03-09');
      expect(result).toBeNull();
    });

    it('should summarise all tracked habits', () => {
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-09' });
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-10' });
      logHabit(store, { habit: 'supplements', action: 'completed', date: '2026-03-09' });

      const result = formatHabitSummary(store, '2026-03-10');

      expect(result).toContain('HABIT TRACKING');
      expect(result).toContain('Gym: 2/4');
      expect(result).toContain('Supplements: 1/7');
    });

    it('should include streak info for multi-day streaks', () => {
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-08' });
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-09' });
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-10' });

      const result = formatHabitSummary(store, '2026-03-10');

      expect(result).toContain('3-day streak');
    });
  });

  // ── Realistic Scenarios ──────────────────────────────────────

  describe('realistic scenarios', () => {
    it('Jan tracks a full week of gym', () => {
      const dates = ['2026-03-09', '2026-03-10', '2026-03-11', '2026-03-13'];
      for (const date of dates) {
        logHabit(store, { habit: 'gym', action: 'completed', date });
      }
      logHabit(store, { habit: 'gym', action: 'skipped', date: '2026-03-12' });

      const stats = getHabitStats(store, 'gym', '2026-03-13');

      expect(stats.thisWeek.completed).toBe(4); // Hit goal!
      expect(stats.thisWeek.skipped).toBe(1);
      expect(stats.goal).toBe(4);
    });

    it('Edwin notices declining gym attendance', () => {
      // Great last week
      for (let i = 2; i <= 5; i++) {
        logHabit(store, { habit: 'gym', action: 'completed', date: `2026-03-0${i}` });
      }

      // Poor this week
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-09' });

      const stats = getHabitStats(store, 'gym', '2026-03-13');

      expect(stats.trend).toBe('declining');
      expect(stats.lastWeek.completed).toBe(4);
      expect(stats.thisWeek.completed).toBe(1);
    });

    it('Edwin tracks supplements alongside gym', () => {
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-09' });
      logHabit(store, { habit: 'supplements', action: 'completed', date: '2026-03-09', notes: 'creatine' });
      logHabit(store, { habit: 'supplements', action: 'completed', date: '2026-03-10', notes: 'creatine + magnesium' });

      const gymStats = getHabitStats(store, 'gym', '2026-03-10');
      const suppStats = getHabitStats(store, 'supplements', '2026-03-10');

      expect(gymStats.thisWeek.completed).toBe(1);
      expect(suppStats.thisWeek.completed).toBe(2);
    });

    it('full accountability flow: log → stats → format', () => {
      // This week
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-09' });
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-10' });
      logHabit(store, { habit: 'gym', action: 'skipped', date: '2026-03-11' });

      // Last week
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-02' });
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-04' });
      logHabit(store, { habit: 'gym', action: 'completed', date: '2026-03-05' });

      const stats = getHabitStats(store, 'gym', '2026-03-11');
      const formatted = formatHabitStats(stats);

      expect(formatted).toContain('Gym');
      expect(formatted).toContain('2/4');
      expect(formatted).toContain('declining');
    });
  });
});
