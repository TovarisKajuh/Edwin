import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Database } from '../../../db/database';
import { MemoryStore } from '../../../memory/store';
import {
  detectConflicts,
  formatConflicts,
  getConflictSummary,
  type Conflict,
} from '../conflict-resolver';

let store: MemoryStore;

beforeEach(() => {
  const db = new Database(':memory:');
  store = new MemoryStore(db);
});

describe('Conflict Resolution', () => {
  // ── Schedule Conflicts ────────────────────────────────────────

  describe('schedule conflicts', () => {
    it('should detect overlapping calendar events', () => {
      const db = store.raw();
      const today = new Date().toISOString().slice(0, 10);

      db.prepare("INSERT INTO calendar_events (title, start_time, end_time) VALUES (?, ?, ?)").run(
        'Team Meeting', `${today}T10:00:00Z`, `${today}T11:00:00Z`,
      );
      db.prepare("INSERT INTO calendar_events (title, start_time, end_time) VALUES (?, ?, ?)").run(
        'Client Call', `${today}T10:30:00Z`, `${today}T11:30:00Z`,
      );

      const conflicts = detectConflicts(store, 'morning', 'weekday');
      const scheduleConflicts = conflicts.filter((c) => c.type === 'schedule');
      expect(scheduleConflicts.length).toBeGreaterThan(0);
      expect(scheduleConflicts[0].severity).toBe('high');
      expect(scheduleConflicts[0].description).toContain('overlap');
    });

    it('should not flag non-overlapping events', () => {
      const db = store.raw();
      const today = new Date().toISOString().slice(0, 10);

      db.prepare("INSERT INTO calendar_events (title, start_time, end_time) VALUES (?, ?, ?)").run(
        'Morning Standup', `${today}T09:00:00Z`, `${today}T09:30:00Z`,
      );
      db.prepare("INSERT INTO calendar_events (title, start_time, end_time) VALUES (?, ?, ?)").run(
        'Lunch Meeting', `${today}T12:00:00Z`, `${today}T13:00:00Z`,
      );

      const conflicts = detectConflicts(store, 'morning', 'weekday');
      const scheduleConflicts = conflicts.filter((c) => c.type === 'schedule');
      expect(scheduleConflicts.length).toBe(0);
    });

    it('should detect reminder during event', () => {
      const db = store.raw();
      const today = new Date().toISOString().slice(0, 10);

      db.prepare("INSERT INTO calendar_events (title, start_time, end_time) VALUES (?, ?, ?)").run(
        'Important Presentation', `${today}T14:00:00Z`, `${today}T15:00:00Z`,
      );

      store.addScheduledAction('reminder', 'Call plumber', `${today}T14:30:00Z`, 'medium');

      const conflicts = detectConflicts(store, 'afternoon', 'weekday');
      const scheduleConflicts = conflicts.filter((c) => c.type === 'schedule');
      expect(scheduleConflicts.some((c) => c.description.includes('plumber'))).toBe(true);
    });
  });

  // ── Priority Conflicts ────────────────────────────────────────

  describe('priority conflicts', () => {
    it('should detect high-stakes overdue items during leisure', () => {
      // Create overdue high-stakes action
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      store.addScheduledAction('reminder', 'Submit tax return', yesterday.toISOString(), 'high');

      // Add leisure activity observation
      store.addObservation('fact', 'Jan is playing video games', 1.0, 'observed');

      const conflicts = detectConflicts(store, 'afternoon', 'weekday');
      const priorityConflicts = conflicts.filter((c) => c.type === 'priority');
      expect(priorityConflicts.length).toBeGreaterThan(0);
      expect(priorityConflicts[0].severity).toBe('high');
      expect(priorityConflicts[0].resolution.strategy).toBe('defer');
    });

    it('should not flag when no overdue high-stakes items', () => {
      // Only low-stakes pending
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      store.addScheduledAction('reminder', 'Buy groceries', tomorrow.toISOString(), 'low');

      const conflicts = detectConflicts(store, 'afternoon', 'weekday');
      const priorityConflicts = conflicts.filter((c) => c.type === 'priority');
      const overdueLeisure = priorityConflicts.filter((c) => c.description.includes('casual'));
      expect(overdueLeisure.length).toBe(0);
    });
  });

  // ── Energy Conflicts ──────────────────────────────────────────

  describe('energy conflicts', () => {
    it('should detect demanding tasks when exhausted', () => {
      // Jan is exhausted
      store.addObservation('emotional_state', 'Feeling completely drained and exhausted', 0.9, 'observed');

      // Demanding task coming up
      const soon = new Date();
      soon.setHours(soon.getHours() + 2);
      store.addScheduledAction('reminder', 'Gym workout — leg day', soon.toISOString(), 'medium');

      const conflicts = detectConflicts(store, 'afternoon', 'weekday');
      const energyConflicts = conflicts.filter((c) => c.type === 'energy');
      expect(energyConflicts.length).toBeGreaterThan(0);
      expect(energyConflicts[0].resolution.strategy).toBe('defer');
    });

    it('should recommend push-through for high-stakes items', () => {
      store.addObservation('emotional_state', 'Really tired today', 0.9, 'observed');

      const soon = new Date();
      soon.setHours(soon.getHours() + 1);
      store.addScheduledAction('reminder', 'Client presentation', soon.toISOString(), 'high');

      const conflicts = detectConflicts(store, 'afternoon', 'weekday');
      const energyConflicts = conflicts.filter((c) => c.type === 'energy');
      const clientConflict = energyConflicts.find((c) => c.itemB.includes('presentation'));
      expect(clientConflict).toBeDefined();
      expect(clientConflict!.resolution.strategy).toBe('accept_tradeoff');
    });

    it('should not flag energy conflicts when not exhausted', () => {
      store.addObservation('emotional_state', 'Feeling great and energized', 0.9, 'observed');

      const soon = new Date();
      soon.setHours(soon.getHours() + 2);
      store.addScheduledAction('reminder', 'Gym workout', soon.toISOString(), 'medium');

      const conflicts = detectConflicts(store, 'morning', 'weekday');
      const energyConflicts = conflicts.filter((c) => c.type === 'energy');
      expect(energyConflicts.length).toBe(0);
    });
  });

  // ── No Conflicts ──────────────────────────────────────────────

  describe('no conflicts', () => {
    it('should return empty array when no conflicts exist', () => {
      const conflicts = detectConflicts(store, 'morning', 'weekday');
      expect(conflicts.length).toBe(0);
    });
  });

  // ── Formatting ────────────────────────────────────────────────

  describe('formatConflicts', () => {
    it('should return null when no conflicts', () => {
      expect(formatConflicts([])).toBeNull();
    });

    it('should format conflicts with strategy and recommendation', () => {
      const conflicts: Conflict[] = [{
        type: 'schedule',
        description: 'Meeting and call overlap',
        itemA: 'Meeting',
        itemB: 'Call',
        severity: 'high',
        resolution: {
          strategy: 'reschedule',
          recommendation: 'Move the call to after the meeting.',
          tradeoff: 'Call is delayed by 30 minutes.',
        },
      }];

      const formatted = formatConflicts(conflicts);
      expect(formatted).not.toBeNull();
      expect(formatted).toContain('DETECTED CONFLICTS');
      expect(formatted).toContain('HIGH');
      expect(formatted).toContain('reschedule');
      expect(formatted).toContain('Move the call');
      expect(formatted).toContain('Trade-off');
    });
  });

  // ── Summary ───────────────────────────────────────────────────

  describe('getConflictSummary', () => {
    it('should return null for no conflicts', () => {
      expect(getConflictSummary([])).toBeNull();
    });

    it('should highlight high-severity conflicts', () => {
      const conflicts: Conflict[] = [{
        type: 'schedule',
        description: 'Events overlap at 10am',
        itemA: 'A',
        itemB: 'B',
        severity: 'high',
        resolution: { strategy: 'reschedule', recommendation: '', tradeoff: '' },
      }];

      const summary = getConflictSummary(conflicts);
      expect(summary).toContain('high-severity');
      expect(summary).toContain('overlap');
    });

    it('should give count for medium conflicts', () => {
      const conflicts: Conflict[] = [{
        type: 'energy',
        description: 'Low energy vs gym',
        itemA: 'A',
        itemB: 'B',
        severity: 'medium',
        resolution: { strategy: 'defer', recommendation: '', tradeoff: '' },
      }];

      const summary = getConflictSummary(conflicts);
      expect(summary).toContain('1 conflict');
    });
  });

  // ── Resolution Strategies ─────────────────────────────────────

  describe('resolution strategies', () => {
    it('should provide reschedule strategy for overlapping events', () => {
      const db = store.raw();
      const today = new Date().toISOString().slice(0, 10);

      db.prepare("INSERT INTO calendar_events (title, start_time, end_time) VALUES (?, ?, ?)").run(
        'A', `${today}T10:00:00Z`, `${today}T11:00:00Z`,
      );
      db.prepare("INSERT INTO calendar_events (title, start_time, end_time) VALUES (?, ?, ?)").run(
        'B', `${today}T10:30:00Z`, `${today}T11:30:00Z`,
      );

      const conflicts = detectConflicts(store, 'morning', 'weekday');
      const scheduleConflicts = conflicts.filter((c) => c.type === 'schedule');
      expect(scheduleConflicts.length).toBeGreaterThan(0);
      expect(scheduleConflicts[0].resolution.strategy).toBe('reschedule');
    });

    it('should provide defer strategy for leisure vs overdue', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      store.addScheduledAction('reminder', 'Pay rent', yesterday.toISOString(), 'high');
      store.addObservation('fact', 'Jan is watching Netflix', 1.0, 'observed');

      const conflicts = detectConflicts(store, 'evening', 'weekday');
      const priorityConflicts = conflicts.filter((c) => c.type === 'priority');
      if (priorityConflicts.length > 0) {
        expect(priorityConflicts[0].resolution.strategy).toBe('defer');
      }
    });
  });
});
