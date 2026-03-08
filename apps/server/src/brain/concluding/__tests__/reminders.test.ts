import { describe, it, expect, beforeEach } from 'vitest';
import { Database } from '../../../db/database';
import { MemoryStore } from '../../../memory/store';
import {
  createReminder,
  calculateNextOccurrence,
  instantiateRecurringReminders,
  cancelReminder,
  getActiveReminders,
  formatRemindersForClaude,
  type ReminderInput,
} from '../reminders';

let store: MemoryStore;

beforeEach(() => {
  const db = new Database(':memory:');
  store = new MemoryStore(db);
});

describe('Enhanced Reminder System', () => {
  // ── Absolute Time Reminders ──────────────────────────────────

  describe('absolute time reminders', () => {
    it('should create a reminder at an absolute time', () => {
      const result = createReminder(store, {
        description: 'Call electrician',
        trigger_time: '2026-03-09T15:00:00',
      });

      expect(result.id).toBeGreaterThan(0);
      expect(result.triggerTime).toBe('2026-03-09T15:00:00');
      expect(result.isRecurring).toBe(false);

      const pending = store.getPendingActions(10);
      expect(pending).toHaveLength(1);
      expect(pending[0].description).toBe('Call electrician');
    });

    it('should reject invalid trigger times', () => {
      expect(() => createReminder(store, {
        description: 'Bad reminder',
        trigger_time: 'not-a-date',
      })).toThrow('Invalid trigger_time');
    });

    it('should use default stakes level of low', () => {
      createReminder(store, {
        description: 'Low priority thing',
        trigger_time: '2026-03-09T10:00:00',
      });

      const pending = store.getPendingActions(10);
      expect(pending[0].stakes_level).toBe('low');
    });

    it('should use custom stakes level', () => {
      createReminder(store, {
        description: 'Important thing',
        trigger_time: '2026-03-09T10:00:00',
        stakes_level: 'high',
      });

      const pending = store.getPendingActions(10);
      expect(pending[0].stakes_level).toBe('high');
    });
  });

  // ── Relative Time Reminders ──────────────────────────────────

  describe('relative time reminders', () => {
    it('should create a reminder in N minutes from now', () => {
      const now = new Date('2026-03-09T10:00:00Z');
      const result = createReminder(store, {
        description: 'Check the oven',
        relative_minutes: 30,
      }, now);

      expect(result.triggerTime).toBe('2026-03-09T10:30:00.000Z');
    });

    it('should create a reminder in 2 hours', () => {
      const now = new Date('2026-03-09T14:00:00Z');
      const result = createReminder(store, {
        description: 'Team meeting prep',
        relative_minutes: 120,
      }, now);

      expect(result.triggerTime).toBe('2026-03-09T16:00:00.000Z');
    });

    it('should handle 0 minutes (reminder now)', () => {
      const now = new Date('2026-03-09T10:00:00Z');
      const result = createReminder(store, {
        description: 'Do it now',
        relative_minutes: 0,
      }, now);

      expect(result.triggerTime).toBe('2026-03-09T10:00:00.000Z');
    });
  });

  // ── Event-Based Reminders ────────────────────────────────────

  describe('event-based reminders', () => {
    it('should create a reminder 15 minutes before an event', () => {
      const eventId = store.addCalendarEvent(
        'Client meeting',
        '2026-03-09T14:00:00Z',
        undefined,
        {},
      );

      const result = createReminder(store, {
        description: 'Prepare client meeting notes',
        event_id: eventId,
      });

      // 14:00Z - 15min = 13:45Z
      expect(result.triggerTime).toContain('13:45');
    });

    it('should create a reminder with custom offset', () => {
      const eventId = store.addCalendarEvent(
        'Board presentation',
        '2026-03-09T16:00:00Z',
        undefined,
        {},
      );

      const result = createReminder(store, {
        description: 'Review slides',
        event_id: eventId,
        event_offset_minutes: 60,
      });

      // 16:00Z - 60min = 15:00Z
      expect(result.triggerTime).toContain('15:00');
    });

    it('should throw for non-existent event', () => {
      expect(() => createReminder(store, {
        description: 'Bad reminder',
        event_id: 999,
      })).toThrow('Calendar event not found');
    });
  });

  // ── Recurring Reminders ──────────────────────────────────────

  describe('recurring reminders', () => {
    it('should create a daily recurring reminder', () => {
      const now = new Date('2026-03-09T10:00:00Z'); // Sunday
      const result = createReminder(store, {
        description: 'Take supplements',
        recurring_pattern: 'daily',
        recurring_time: '08:00',
      }, now);

      expect(result.isRecurring).toBe(true);
      // Since 08:00 already passed on the 9th, next is the 10th
      expect(result.triggerTime).toContain('2026-03-10');
    });

    it('should create a weekly Monday reminder', () => {
      const now = new Date('2026-03-08T10:00:00Z'); // Sunday March 8
      const result = createReminder(store, {
        description: 'Review finances',
        recurring_pattern: 'weekly:monday',
        recurring_time: '09:00',
      }, now);

      expect(result.isRecurring).toBe(true);
      // Next Monday is March 9
      expect(result.triggerTime).toContain('2026-03-09');
    });

    it('should create a weekdays-only reminder', () => {
      const now = new Date('2026-03-06T18:00:00Z'); // Friday evening
      const result = createReminder(store, {
        description: 'Morning standup',
        recurring_pattern: 'weekdays',
        recurring_time: '09:00',
      }, now);

      expect(result.isRecurring).toBe(true);
      // Next weekday after Friday evening is Monday March 9
      expect(result.triggerTime).toContain('2026-03-09');
    });

    it('should reject invalid recurring patterns', () => {
      expect(() => createReminder(store, {
        description: 'Bad pattern',
        recurring_pattern: 'biweekly',
        recurring_time: '09:00',
      })).toThrow('Invalid recurring_pattern');
    });

    it('should store routine in routines table', () => {
      createReminder(store, {
        description: 'Review finances',
        recurring_pattern: 'weekly:monday',
        recurring_time: '09:00',
      });

      const routines = store.raw().prepare(
        'SELECT * FROM routines WHERE active = 1',
      ).all() as { name: string; type: string; schedule: string }[];

      expect(routines).toHaveLength(1);
      expect(routines[0].name).toBe('Review finances');
      expect(routines[0].type).toBe('reminder');
      expect(routines[0].schedule).toBe('weekly:monday@09:00');
    });
  });

  // ── Next Occurrence Calculation ──────────────────────────────

  describe('calculateNextOccurrence', () => {
    it('should return today if time has not passed', () => {
      const now = new Date('2026-03-09T07:00:00Z');
      const result = calculateNextOccurrence('daily', '09:00', now);
      expect(result).toContain('2026-03-09');
    });

    it('should return tomorrow if time has passed', () => {
      const now = new Date('2026-03-09T10:00:00Z');
      const result = calculateNextOccurrence('daily', '09:00', now);
      expect(result).toContain('2026-03-10');
    });

    it('should skip weekends for weekdays pattern', () => {
      // March 7, 2026 is a Saturday
      const saturday = new Date('2026-03-07T10:00:00Z');
      const result = calculateNextOccurrence('weekdays', '09:00', saturday);
      // Next weekday is Monday March 9
      expect(result).toContain('2026-03-09');
    });

    it('should calculate next weekly:friday', () => {
      const monday = new Date('2026-03-09T10:00:00Z');
      const result = calculateNextOccurrence('weekly:friday', '17:00', monday);
      // Next Friday is March 13
      expect(result).toContain('2026-03-13');
    });

    it('should return next week if same day has passed', () => {
      const monday = new Date('2026-03-09T18:00:00Z');
      const result = calculateNextOccurrence('weekly:monday', '09:00', monday);
      // Next Monday is March 16
      expect(result).toContain('2026-03-16');
    });

    it('should handle monthly pattern', () => {
      const now = new Date('2026-03-09T10:00:00Z');
      const result = calculateNextOccurrence('monthly', '09:00', now);
      // 09:00 on the 9th already passed → next month
      expect(result).toContain('2026-04');
    });
  });

  // ── Recurring Instantiation ──────────────────────────────────

  describe('instantiateRecurringReminders', () => {
    it('should create next instance when current is done', () => {
      // Create recurring reminder
      const now = new Date('2026-03-09T07:00:00Z');
      const result = createReminder(store, {
        description: 'Take supplements',
        recurring_pattern: 'daily',
        recurring_time: '08:00',
      }, now);

      // Mark current instance as done
      store.markActionDone(result.id);

      // Instantiate should create next
      const created = instantiateRecurringReminders(store, new Date('2026-03-09T09:00:00Z'));
      expect(created).toBe(1);

      const pending = store.getPendingActions(10);
      const reminders = pending.filter((a) => a.type === 'reminder');
      expect(reminders).toHaveLength(1);
      expect(reminders[0].description).toContain('Take supplements');
    });

    it('should not create duplicate if pending instance exists', () => {
      const now = new Date('2026-03-09T07:00:00Z');
      createReminder(store, {
        description: 'Take supplements',
        recurring_pattern: 'daily',
        recurring_time: '08:00',
      }, now);

      // Should not create another (one already pending)
      const created = instantiateRecurringReminders(store, now);
      expect(created).toBe(0);
    });
  });

  // ── Cancellation ─────────────────────────────────────────────

  describe('cancelReminder', () => {
    it('should cancel a reminder by description match', () => {
      createReminder(store, {
        description: 'Call the electrician',
        trigger_time: '2026-03-09T15:00:00',
      });

      const result = cancelReminder(store, 'electrician');

      expect(result.cancelled).toBe(1);
      expect(result.cancelledDescriptions[0]).toBe('Call the electrician');

      // Should no longer be in pending
      const pending = store.getPendingActions(10);
      expect(pending.filter((a) => a.type === 'reminder')).toHaveLength(0);
    });

    it('should cancel multiple matching reminders', () => {
      createReminder(store, {
        description: 'Buy groceries at Spar',
        trigger_time: '2026-03-09T10:00:00',
      });
      createReminder(store, {
        description: 'Buy groceries at Billa',
        trigger_time: '2026-03-10T10:00:00',
      });

      const result = cancelReminder(store, 'groceries');
      expect(result.cancelled).toBe(2);
    });

    it('should return 0 when nothing matches', () => {
      const result = cancelReminder(store, 'quantum physics');
      expect(result.cancelled).toBe(0);
    });

    it('should deactivate routine when cancelling recurring reminder', () => {
      createReminder(store, {
        description: 'Morning standup',
        recurring_pattern: 'weekdays',
        recurring_time: '09:00',
      });

      const result = cancelReminder(store, 'standup');
      expect(result.cancelled).toBe(1);
      expect(result.routinesCancelled).toBe(1);

      // Routine should be inactive
      const routines = store.raw().prepare(
        'SELECT * FROM routines WHERE active = 1',
      ).all();
      expect(routines).toHaveLength(0);
    });
  });

  // ── Listing & Formatting ─────────────────────────────────────

  describe('getActiveReminders', () => {
    it('should list active reminders', () => {
      createReminder(store, {
        description: 'Call electrician',
        trigger_time: '2026-03-09T15:00:00',
        stakes_level: 'medium',
      });
      createReminder(store, {
        description: 'Buy milk',
        trigger_time: '2026-03-09T18:00:00',
      });

      const reminders = getActiveReminders(store);
      expect(reminders).toHaveLength(2);
      expect(reminders[0].description).toBe('Call electrician');
      expect(reminders[0].stakesLevel).toBe('medium');
      expect(reminders[1].description).toBe('Buy milk');
    });

    it('should identify recurring reminders', () => {
      createReminder(store, {
        description: 'Take supplements',
        recurring_pattern: 'daily',
        recurring_time: '08:00',
      });

      const reminders = getActiveReminders(store);
      expect(reminders).toHaveLength(1);
      expect(reminders[0].isRecurring).toBe(true);
      expect(reminders[0].recurringPattern).toContain('daily');
    });

    it('should not include done reminders', () => {
      const result = createReminder(store, {
        description: 'Done thing',
        trigger_time: '2026-03-09T10:00:00',
      });
      store.markActionDone(result.id);

      const reminders = getActiveReminders(store);
      expect(reminders).toHaveLength(0);
    });
  });

  describe('formatRemindersForClaude', () => {
    it('should format empty reminders', () => {
      const result = formatRemindersForClaude([]);
      expect(result).toContain('No active reminders');
    });

    it('should format reminders with details', () => {
      const reminders = getActiveReminders(store);
      createReminder(store, {
        description: 'Call electrician',
        trigger_time: '2026-03-09T15:00:00',
        stakes_level: 'medium',
      });

      const active = getActiveReminders(store);
      const result = formatRemindersForClaude(active);

      expect(result).toContain('Active reminders');
      expect(result).toContain('Call electrician');
      expect(result).toContain('medium');
    });
  });

  // ── Error Handling ───────────────────────────────────────────

  describe('error handling', () => {
    it('should require at least one time specification', () => {
      expect(() => createReminder(store, {
        description: 'No time given',
      })).toThrow('requires trigger_time');
    });
  });

  // ── Realistic Scenarios ──────────────────────────────────────

  describe('realistic scenarios', () => {
    it('Jan says "remind me in 2 hours to prep for the meeting"', () => {
      const now = new Date('2026-03-09T10:00:00Z');
      const result = createReminder(store, {
        description: 'Prep for the meeting',
        relative_minutes: 120,
        stakes_level: 'medium',
      }, now);

      expect(result.triggerTime).toBe('2026-03-09T12:00:00.000Z');

      const reminders = getActiveReminders(store);
      expect(reminders).toHaveLength(1);
      expect(reminders[0].description).toBe('Prep for the meeting');
    });

    it('Jan says "remind me every Monday to review finances"', () => {
      const now = new Date('2026-03-08T10:00:00Z'); // Sunday March 8
      const result = createReminder(store, {
        description: 'Review finances',
        recurring_pattern: 'weekly:monday',
        recurring_time: '09:00',
        stakes_level: 'medium',
      }, now);

      expect(result.isRecurring).toBe(true);

      // After Monday's reminder fires and is marked done,
      // instantiation creates the next one
      store.markActionDone(result.id);
      const created = instantiateRecurringReminders(store, new Date('2026-03-09T10:00:00Z'));
      expect(created).toBe(1);

      const reminders = getActiveReminders(store);
      expect(reminders).toHaveLength(1);
      // Next Monday after March 9 (Mon, 10:00 past 09:00) is March 16
      expect(reminders[0].triggerTime).toContain('2026-03-16');
    });

    it('Jan says "cancel the electrician reminder"', () => {
      createReminder(store, {
        description: 'Call the electrician about wiring',
        trigger_time: '2026-03-09T15:00:00',
        stakes_level: 'medium',
      });
      createReminder(store, {
        description: 'Buy groceries',
        trigger_time: '2026-03-09T18:00:00',
      });

      const result = cancelReminder(store, 'electrician');
      expect(result.cancelled).toBe(1);

      const reminders = getActiveReminders(store);
      expect(reminders).toHaveLength(1);
      expect(reminders[0].description).toBe('Buy groceries');
    });

    it('full lifecycle: create → fire → re-instantiate → cancel', () => {
      const now = new Date('2026-03-09T07:00:00Z');

      // 1. Create daily recurring
      const result = createReminder(store, {
        description: 'Take creatine',
        recurring_pattern: 'daily',
        recurring_time: '08:00',
      }, now);

      expect(getActiveReminders(store)).toHaveLength(1);

      // 2. Reminder fires
      store.markActionDone(result.id);
      expect(getActiveReminders(store)).toHaveLength(0);

      // 3. Heartbeat re-instantiates
      const created = instantiateRecurringReminders(store, new Date('2026-03-09T09:00:00Z'));
      expect(created).toBe(1);
      expect(getActiveReminders(store)).toHaveLength(1);

      // 4. Jan cancels
      const cancelled = cancelReminder(store, 'creatine');
      expect(cancelled.cancelled).toBe(1);
      expect(cancelled.routinesCancelled).toBe(1);
      expect(getActiveReminders(store)).toHaveLength(0);

      // 5. Heartbeat should NOT re-instantiate (routine deactivated)
      const created2 = instantiateRecurringReminders(store, new Date('2026-03-10T07:00:00Z'));
      expect(created2).toBe(0);
    });
  });
});
