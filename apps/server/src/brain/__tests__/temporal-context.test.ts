import { describe, it, expect } from 'vitest';
import {
  getDaySignificance,
  getSeason,
  getSeasonalContext,
  getWeekPosition,
  getMonthPosition,
  getSpecialDay,
  buildTemporalContext,
  formatTemporalContext,
} from '../temporal-context';

describe('Temporal Context', () => {
  // ── Day Significance ──────────────────────────────────────────

  describe('getDaySignificance', () => {
    it('should recognize Monday as fresh start energy', () => {
      const sig = getDaySignificance(1);
      expect(sig.dayName).toBe('Monday');
      expect(sig.energy).toContain('Fresh start');
      expect(sig.focus).toContain('planning');
    });

    it('should flag Wednesday mid-week slump risk', () => {
      const sig = getDaySignificance(3);
      expect(sig.dayName).toBe('Wednesday');
      expect(sig.risk).toContain('slump');
    });

    it('should flag Friday wind-down', () => {
      const sig = getDaySignificance(5);
      expect(sig.dayName).toBe('Friday');
      expect(sig.energy).toContain('Wind-down');
    });

    it('should make Saturday about activity', () => {
      const sig = getDaySignificance(6);
      expect(sig.dayName).toBe('Saturday');
      expect(sig.focus).toContain('social');
    });

    it('should make Sunday about rest', () => {
      const sig = getDaySignificance(0);
      expect(sig.dayName).toBe('Sunday');
      expect(sig.energy).toContain('Rest');
      expect(sig.risk).toBeNull();
    });

    it('should have no risk on rest days', () => {
      const sunday = getDaySignificance(0);
      const tuesday = getDaySignificance(2);
      expect(sunday.risk).toBeNull();
      expect(tuesday.risk).toBeNull();
    });
  });

  // ── Seasonal Awareness ────────────────────────────────────────

  describe('getSeason', () => {
    it('should return winter for Dec-Feb', () => {
      expect(getSeason(12)).toBe('winter');
      expect(getSeason(1)).toBe('winter');
      expect(getSeason(2)).toBe('winter');
    });

    it('should return spring for Mar-May', () => {
      expect(getSeason(3)).toBe('spring');
      expect(getSeason(4)).toBe('spring');
      expect(getSeason(5)).toBe('spring');
    });

    it('should return summer for Jun-Aug', () => {
      expect(getSeason(6)).toBe('summer');
      expect(getSeason(7)).toBe('summer');
      expect(getSeason(8)).toBe('summer');
    });

    it('should return autumn for Sep-Nov', () => {
      expect(getSeason(9)).toBe('autumn');
      expect(getSeason(10)).toBe('autumn');
      expect(getSeason(11)).toBe('autumn');
    });
  });

  describe('getSeasonalContext', () => {
    it('should note shorter days in winter', () => {
      const ctx = getSeasonalContext(12);
      expect(ctx.season).toBe('winter');
      expect(ctx.daylightHours).toBeLessThan(10);
      expect(ctx.moodImpact).toContain('Shorter days');
    });

    it('should note long days in summer', () => {
      const ctx = getSeasonalContext(6);
      expect(ctx.season).toBe('summer');
      expect(ctx.daylightHours).toBeGreaterThan(15);
      expect(ctx.activitySuggestion).toContain('Outdoor');
    });

    it('should note transition in autumn', () => {
      const ctx = getSeasonalContext(10);
      expect(ctx.season).toBe('autumn');
      expect(ctx.awareness).toContain('cooling down');
    });

    it('should note renewal in spring', () => {
      const ctx = getSeasonalContext(4);
      expect(ctx.season).toBe('spring');
      expect(ctx.moodImpact).toContain('Renewal');
    });
  });

  // ── Week Position ─────────────────────────────────────────────

  describe('getWeekPosition', () => {
    it('should return beginning for Mon-Tue', () => {
      expect(getWeekPosition(1)).toBe('beginning');
      expect(getWeekPosition(2)).toBe('beginning');
    });

    it('should return middle for Wed-Thu', () => {
      expect(getWeekPosition(3)).toBe('middle');
      expect(getWeekPosition(4)).toBe('middle');
    });

    it('should return end for Fri-Sun', () => {
      expect(getWeekPosition(5)).toBe('end');
      expect(getWeekPosition(6)).toBe('end');
      expect(getWeekPosition(0)).toBe('end');
    });
  });

  // ── Month Position ────────────────────────────────────────────

  describe('getMonthPosition', () => {
    it('should return beginning for days 1-10', () => {
      expect(getMonthPosition(1)).toBe('beginning');
      expect(getMonthPosition(5)).toBe('beginning');
      expect(getMonthPosition(10)).toBe('beginning');
    });

    it('should return middle for days 11-20', () => {
      expect(getMonthPosition(11)).toBe('middle');
      expect(getMonthPosition(15)).toBe('middle');
      expect(getMonthPosition(20)).toBe('middle');
    });

    it('should return end for days 21+', () => {
      expect(getMonthPosition(21)).toBe('end');
      expect(getMonthPosition(28)).toBe('end');
      expect(getMonthPosition(31)).toBe('end');
    });
  });

  // ── Special Days ──────────────────────────────────────────────

  describe('getSpecialDay', () => {
    it('should recognize New Year', () => {
      const result = getSpecialDay(1, 1);
      expect(result).toContain('New Year');
    });

    it('should recognize Austrian National Day', () => {
      const result = getSpecialDay(10, 26);
      expect(result).toContain('Austrian National Day');
    });

    it('should recognize Christmas', () => {
      const result = getSpecialDay(12, 25);
      expect(result).toContain('Christmas');
    });

    it('should return null for regular days', () => {
      expect(getSpecialDay(3, 15)).toBeNull();
      expect(getSpecialDay(7, 22)).toBeNull();
    });

    it('should recognize Christmas Eve', () => {
      const result = getSpecialDay(12, 24);
      expect(result).toContain('Christmas Eve');
    });
  });

  // ── Full Context Build ────────────────────────────────────────

  describe('buildTemporalContext', () => {
    it('should build complete context for a specific date', () => {
      // Monday, March 9, 2026 — spring, beginning of week, beginning of month
      const date = new Date(2026, 2, 9); // months are 0-indexed
      const ctx = buildTemporalContext(date);

      expect(ctx.day.dayName).toBe('Monday');
      expect(ctx.season.season).toBe('spring');
      expect(ctx.weekPosition).toBe('beginning');
      expect(ctx.monthPosition).toBe('beginning');
      expect(ctx.specialDay).toBeNull();
    });

    it('should detect special day', () => {
      const christmas = new Date(2026, 11, 25); // Dec 25
      const ctx = buildTemporalContext(christmas);

      expect(ctx.specialDay).toContain('Christmas');
    });

    it('should build context for mid-week winter day', () => {
      // Wednesday, January 14, 2026
      const date = new Date(2026, 0, 14);
      const ctx = buildTemporalContext(date);

      expect(ctx.day.dayName).toBe('Wednesday');
      expect(ctx.day.risk).toContain('slump');
      expect(ctx.season.season).toBe('winter');
      expect(ctx.weekPosition).toBe('middle');
      expect(ctx.monthPosition).toBe('middle');
    });

    it('should build context for summer Saturday', () => {
      // Saturday, July 18, 2026
      const date = new Date(2026, 6, 18);
      const ctx = buildTemporalContext(date);

      expect(ctx.day.dayName).toBe('Saturday');
      expect(ctx.season.season).toBe('summer');
      expect(ctx.season.daylightHours).toBeGreaterThan(14);
      expect(ctx.weekPosition).toBe('end');
      expect(ctx.monthPosition).toBe('middle');
    });

    it('should work with default date (now)', () => {
      const ctx = buildTemporalContext();
      expect(ctx.day.dayName).toBeTruthy();
      expect(ctx.season.season).toBeTruthy();
    });
  });

  // ── Formatting ────────────────────────────────────────────────

  describe('formatTemporalContext', () => {
    it('should include all sections', () => {
      const date = new Date(2026, 2, 9); // Monday, March 9
      const ctx = buildTemporalContext(date);
      const formatted = formatTemporalContext(ctx);

      expect(formatted).toContain('[DAY]');
      expect(formatted).toContain('[WEEK]');
      expect(formatted).toContain('[MONTH]');
      expect(formatted).toContain('[SEASON]');
      expect(formatted).toContain('Monday');
      expect(formatted).toContain('Spring');
    });

    it('should include risk when present', () => {
      const wednesday = new Date(2026, 0, 14);
      const ctx = buildTemporalContext(wednesday);
      const formatted = formatTemporalContext(ctx);

      expect(formatted).toContain('Risk:');
      expect(formatted).toContain('slump');
    });

    it('should not include risk when absent', () => {
      const sunday = new Date(2026, 2, 8);
      const ctx = buildTemporalContext(sunday);
      const formatted = formatTemporalContext(ctx);

      expect(formatted).not.toContain('Risk:');
    });

    it('should include special day when present', () => {
      const christmas = new Date(2026, 11, 25);
      const ctx = buildTemporalContext(christmas);
      const formatted = formatTemporalContext(ctx);

      expect(formatted).toContain('[SPECIAL]');
      expect(formatted).toContain('Christmas');
    });

    it('should not include special day section for regular days', () => {
      const regular = new Date(2026, 2, 9);
      const ctx = buildTemporalContext(regular);
      const formatted = formatTemporalContext(ctx);

      expect(formatted).not.toContain('[SPECIAL]');
    });
  });

  // ── Realistic Scenarios ────────────────────────────────────────

  describe('realistic scenarios', () => {
    it('Monday morning winter briefing context', () => {
      // Monday, January 5, 2026
      const date = new Date(2026, 0, 5);
      const ctx = buildTemporalContext(date);
      const formatted = formatTemporalContext(ctx);

      // Should reference fresh start, winter awareness, beginning of week/month
      expect(formatted).toContain('Fresh start');
      expect(formatted).toContain('Winter');
      expect(formatted).toContain('plan');
    });

    it('Wednesday mid-week slump detection', () => {
      // Wednesday, June 17, 2026
      const date = new Date(2026, 5, 17);
      const ctx = buildTemporalContext(date);

      expect(ctx.day.risk).toContain('slump');
      expect(ctx.weekPosition).toBe('middle');
      expect(ctx.season.season).toBe('summer');
    });

    it('end of month financial awareness', () => {
      // Friday, March 27, 2026
      const date = new Date(2026, 2, 27);
      const ctx = buildTemporalContext(date);

      expect(ctx.monthPosition).toBe('end');
      expect(ctx.monthPositionNote).toContain('financial');
    });

    it('Austrian National Day', () => {
      // October 26, 2026 (Monday)
      const date = new Date(2026, 9, 26);
      const ctx = buildTemporalContext(date);

      expect(ctx.specialDay).toContain('Austrian National Day');
      expect(ctx.season.season).toBe('autumn');
    });
  });
});
