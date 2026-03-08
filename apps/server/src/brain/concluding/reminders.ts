/**
 * Enhanced Reminder System — Session 31.
 *
 * Supports:
 *   - Absolute time: "Remind me at 3pm" → ISO datetime
 *   - Relative time: "in 2 hours", "in 30 minutes" → calculated from now
 *   - Event-based: "before the meeting" → linked to calendar event
 *   - Recurring: "every Monday", "every day at 9am" → routine + auto-instantiation
 *   - Cancellation: "cancel the electrician reminder" → fuzzy match + cancel
 *   - Listing: show active reminders with recurring info
 */

import { MemoryStore } from '../../memory/store.js';

// ── Types ────────────────────────────────────────────────────────

export interface ReminderInput {
  description: string;
  trigger_time?: string;          // ISO 8601 absolute time
  relative_minutes?: number;      // relative: in N minutes from now
  event_id?: number;              // linked to calendar event
  event_offset_minutes?: number;  // minutes before event (default 15)
  recurring_pattern?: string;     // 'daily', 'weekly:monday', 'weekly:friday', etc.
  recurring_time?: string;        // HH:MM for recurring reminders
  stakes_level?: string;
}

export interface ReminderRecord {
  id: number;
  description: string;
  triggerTime: string;
  stakesLevel: string;
  isRecurring: boolean;
  recurringPattern: string | null;
  linkedEventId: number | null;
}

export interface RoutineRecord {
  id: number;
  name: string;
  schedule: string;
  details: string | null;
  active: boolean;
}

// ── Reminder Creation ────────────────────────────────────────────

/**
 * Create a reminder from various input types.
 * Returns the scheduled_action ID.
 */
export function createReminder(
  store: MemoryStore,
  input: ReminderInput,
  now: Date = new Date(),
): { id: number; triggerTime: string; isRecurring: boolean } {
  const stakesLevel = input.stakes_level || 'low';

  // Recurring reminder → create routine + first instance
  if (input.recurring_pattern) {
    return createRecurringReminder(store, input, now);
  }

  // Event-based → calculate time from event
  if (input.event_id !== undefined) {
    return createEventBasedReminder(store, input, stakesLevel);
  }

  // Calculate trigger time
  let triggerTime: string;

  if (input.relative_minutes !== undefined) {
    // Relative: "in 30 minutes"
    const trigger = new Date(now.getTime() + input.relative_minutes * 60000);
    triggerTime = trigger.toISOString();
  } else if (input.trigger_time) {
    // Absolute: ISO datetime
    const parsed = new Date(input.trigger_time);
    if (isNaN(parsed.getTime())) {
      throw new Error(`Invalid trigger_time: ${input.trigger_time}`);
    }
    triggerTime = input.trigger_time;
  } else {
    throw new Error('Reminder requires trigger_time, relative_minutes, event_id, or recurring_pattern');
  }

  const id = store.addScheduledAction('reminder', input.description, triggerTime, stakesLevel);
  return { id, triggerTime, isRecurring: false };
}

/**
 * Create a recurring reminder (stores in routines table + creates next instance).
 */
function createRecurringReminder(
  store: MemoryStore,
  input: ReminderInput,
  now: Date,
): { id: number; triggerTime: string; isRecurring: boolean } {
  const pattern = input.recurring_pattern!;
  const time = input.recurring_time || '09:00';
  const stakesLevel = input.stakes_level || 'low';

  // Validate pattern
  const validPatterns = ['daily', 'weekly:monday', 'weekly:tuesday', 'weekly:wednesday',
    'weekly:thursday', 'weekly:friday', 'weekly:saturday', 'weekly:sunday',
    'weekdays', 'monthly'];
  if (!validPatterns.includes(pattern)) {
    throw new Error(`Invalid recurring_pattern: ${pattern}. Valid: ${validPatterns.join(', ')}`);
  }

  // Store routine
  const schedule = `${pattern}@${time}`;
  const routineId = addRoutine(store, input.description, 'reminder', schedule, stakesLevel);

  // Calculate next occurrence
  const nextTrigger = calculateNextOccurrence(pattern, time, now);
  const id = store.addScheduledAction(
    'reminder',
    `[routine:${routineId}] ${input.description}`,
    nextTrigger,
    stakesLevel,
  );

  return { id, triggerTime: nextTrigger, isRecurring: true };
}

/**
 * Create a reminder linked to a calendar event.
 */
function createEventBasedReminder(
  store: MemoryStore,
  input: ReminderInput,
  stakesLevel: string,
): { id: number; triggerTime: string; isRecurring: boolean } {
  const eventId = input.event_id!;
  const offsetMinutes = input.event_offset_minutes ?? 15;

  // Look up the event
  const event = store.getCalendarEventById(eventId);
  if (!event) {
    throw new Error(`Calendar event not found: ${eventId}`);
  }

  // Calculate trigger time (offset minutes before event)
  const eventTime = new Date(event.start_time);
  const triggerTime = new Date(eventTime.getTime() - offsetMinutes * 60000).toISOString();

  const description = `[event:${eventId}] ${input.description}`;
  const id = store.addScheduledAction('reminder', description, triggerTime, stakesLevel);

  return { id, triggerTime, isRecurring: false };
}

// ── Recurring Management ─────────────────────────────────────────

/**
 * Calculate the next occurrence of a recurring pattern from now.
 */
export function calculateNextOccurrence(
  pattern: string,
  time: string, // HH:MM
  now: Date,
): string {
  const [hours, minutes] = time.split(':').map(Number);

  if (pattern === 'daily' || pattern === 'weekdays') {
    // Today if time hasn't passed, otherwise tomorrow
    const candidate = new Date(now);
    candidate.setHours(hours, minutes, 0, 0);

    if (candidate.getTime() <= now.getTime()) {
      candidate.setDate(candidate.getDate() + 1);
    }

    // For weekdays, skip to Monday if on weekend
    if (pattern === 'weekdays') {
      while (candidate.getDay() === 0 || candidate.getDay() === 6) {
        candidate.setDate(candidate.getDate() + 1);
      }
    }

    return candidate.toISOString();
  }

  if (pattern.startsWith('weekly:')) {
    const dayName = pattern.split(':')[1];
    const targetDay = dayNameToNumber(dayName);

    const candidate = new Date(now);
    candidate.setHours(hours, minutes, 0, 0);

    // Find the next occurrence of the target day
    let daysAhead = targetDay - candidate.getDay();
    if (daysAhead < 0) daysAhead += 7;
    if (daysAhead === 0 && candidate.getTime() <= now.getTime()) {
      daysAhead = 7;
    }
    candidate.setDate(candidate.getDate() + daysAhead);

    return candidate.toISOString();
  }

  if (pattern === 'monthly') {
    const candidate = new Date(now);
    candidate.setHours(hours, minutes, 0, 0);

    // Same day of month, next month if already passed
    if (candidate.getTime() <= now.getTime()) {
      candidate.setMonth(candidate.getMonth() + 1);
    }

    return candidate.toISOString();
  }

  throw new Error(`Cannot calculate next occurrence for pattern: ${pattern}`);
}

/**
 * Instantiate upcoming recurring reminders from routines.
 * Called by heartbeat. Creates the next instance if no pending instance exists.
 */
export function instantiateRecurringReminders(store: MemoryStore, now: Date = new Date()): number {
  const routines = getActiveRoutines(store);
  let created = 0;

  for (const routine of routines) {
    if (routine.type !== 'reminder') continue;

    // Check if there's already a pending instance for this routine
    const pending = store.getPendingActions(100);
    const hasPending = pending.some(
      (a) => a.type === 'reminder' && a.description.includes(`[routine:${routine.id}]`),
    );

    if (hasPending) continue;

    // Parse schedule: "pattern@HH:MM"
    const [pattern, time] = routine.schedule.split('@');
    const nextTrigger = calculateNextOccurrence(pattern, time || '09:00', now);

    // Clean description from routine name
    const stakesLevel = routine.details || 'low';
    store.addScheduledAction(
      'reminder',
      `[routine:${routine.id}] ${routine.name}`,
      nextTrigger,
      stakesLevel,
    );
    created++;
  }

  return created;
}

// ── Cancellation ─────────────────────────────────────────────────

/**
 * Cancel a reminder by fuzzy description match.
 * Returns the number of reminders cancelled.
 */
export function cancelReminder(store: MemoryStore, searchTerm: string): {
  cancelled: number;
  cancelledDescriptions: string[];
  routinesCancelled: number;
} {
  const pending = store.getPendingActions(100);
  const reminders = pending.filter((a) => a.type === 'reminder');

  const termLower = searchTerm.toLowerCase();
  const matching = reminders.filter((r) =>
    r.description.toLowerCase().includes(termLower),
  );

  const cancelledDescriptions: string[] = [];
  let routinesCancelled = 0;

  for (const reminder of matching) {
    // Mark as cancelled
    cancelAction(store, reminder.id);
    cancelledDescriptions.push(cleanDescription(reminder.description));

    // If it's a recurring reminder, deactivate the routine
    const routineMatch = reminder.description.match(/\[routine:(\d+)\]/);
    if (routineMatch) {
      const routineId = parseInt(routineMatch[1], 10);
      deactivateRoutine(store, routineId);
      routinesCancelled++;
    }
  }

  return {
    cancelled: matching.length,
    cancelledDescriptions,
    routinesCancelled,
  };
}

// ── Listing ──────────────────────────────────────────────────────

/**
 * Get all active reminders (pending scheduled_actions of type 'reminder').
 */
export function getActiveReminders(store: MemoryStore): ReminderRecord[] {
  const pending = store.getPendingActions(100);
  return pending
    .filter((a) => a.type === 'reminder')
    .map((a) => {
      const routineMatch = a.description.match(/\[routine:(\d+)\]/);
      const eventMatch = a.description.match(/\[event:(\d+)\]/);

      return {
        id: a.id,
        description: cleanDescription(a.description),
        triggerTime: a.trigger_time,
        stakesLevel: a.stakes_level,
        isRecurring: routineMatch !== null,
        recurringPattern: routineMatch ? getRoutinePattern(store, parseInt(routineMatch[1], 10)) : null,
        linkedEventId: eventMatch ? parseInt(eventMatch[1], 10) : null,
      };
    });
}

/**
 * Format active reminders for Claude's response.
 */
export function formatRemindersForClaude(reminders: ReminderRecord[]): string {
  if (reminders.length === 0) {
    return 'No active reminders.';
  }

  const lines = ['Active reminders:'];
  for (const r of reminders) {
    const time = new Date(r.triggerTime).toLocaleString('en-GB', { timeZone: 'Europe/Vienna' });
    const recurring = r.isRecurring ? ` (recurring: ${r.recurringPattern})` : '';
    const event = r.linkedEventId ? ' (linked to event)' : '';
    lines.push(`- [${r.stakesLevel}] ${r.description} — ${time}${recurring}${event}`);
  }

  return lines.join('\n');
}

// ── Helper Functions ─────────────────────────────────────────────

function dayNameToNumber(name: string): number {
  const days: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };
  return days[name.toLowerCase()] ?? 1;
}

function cleanDescription(description: string): string {
  return description.replace(/^\[(?:routine|event):\d+\]\s*/, '');
}

// ── Store Helpers (routines table) ───────────────────────────────

function addRoutine(
  store: MemoryStore,
  name: string,
  type: string,
  schedule: string,
  details: string | null = null,
): number {
  const db = store.raw();
  const result = db.prepare(`
    INSERT INTO routines (name, type, schedule, details) VALUES (?, ?, ?, ?)
  `).run(name, type, schedule, details);
  return Number(result.lastInsertRowid);
}

function getActiveRoutines(store: MemoryStore): {
  id: number; name: string; type: string; schedule: string; details: string | null;
}[] {
  const db = store.raw();
  return db.prepare(`
    SELECT id, name, type, schedule, details FROM routines WHERE active = 1
  `).all() as { id: number; name: string; type: string; schedule: string; details: string | null }[];
}

function deactivateRoutine(store: MemoryStore, routineId: number): void {
  const db = store.raw();
  db.prepare(`
    UPDATE routines SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(routineId);
}

function getRoutinePattern(store: MemoryStore, routineId: number): string | null {
  const db = store.raw();
  const row = db.prepare(`SELECT schedule FROM routines WHERE id = ?`).get(routineId) as {
    schedule: string;
  } | undefined;
  if (!row) return null;
  // Parse "daily@09:00" → "daily at 09:00"
  const [pattern, time] = row.schedule.split('@');
  return `${pattern} at ${time || '09:00'}`;
}

function cancelAction(store: MemoryStore, actionId: number): void {
  const db = store.raw();
  db.prepare(`
    UPDATE scheduled_actions SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(actionId);
}
