/**
 * Calendar Integration — Session 27.
 *
 * Edwin knows Jan's schedule. He can create events, check upcoming
 * meetings, and reference the schedule in conversation.
 *
 * Internal calendar is always available. Google Calendar is optional
 * (activates when GOOGLE_CALENDAR_* env vars are set).
 */

import { MemoryStore, type CalendarEventRow } from '../memory/store.js';

// ── Types ────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: number;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string | null;
  location: string | null;
  eventType: string;
}

// ── Helpers ──────────────────────────────────────────────────────

function rowToEvent(row: CalendarEventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startTime: row.start_time,
    endTime: row.end_time,
    location: row.location,
    eventType: row.event_type,
  };
}

// ── Calendar Service ─────────────────────────────────────────────

/**
 * Get today's events.
 */
export function getTodayEvents(store: MemoryStore): CalendarEvent[] {
  const today = new Date().toISOString().slice(0, 10);
  return store.getEventsForDate(today).map(rowToEvent);
}

/**
 * Get this week's events (Monday through Sunday).
 */
export function getWeekEvents(store: MemoryStore): CalendarEvent[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  // Monday = start of week (European convention)
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const startDate = monday.toISOString().slice(0, 10);
  const endDate = sunday.toISOString().slice(0, 10);

  return store.getEventsInRange(startDate, endDate).map(rowToEvent);
}

/**
 * Get upcoming events.
 */
export function getUpcomingEvents(store: MemoryStore, limit: number = 10): CalendarEvent[] {
  return store.getUpcomingEvents(limit).map(rowToEvent);
}

/**
 * Create a new calendar event.
 */
export function createEvent(
  store: MemoryStore,
  title: string,
  startTime: string,
  endTime?: string,
  options?: { description?: string; location?: string; eventType?: string },
): CalendarEvent {
  const id = store.addCalendarEvent(title, startTime, endTime, options);
  return {
    id,
    title,
    description: options?.description ?? null,
    startTime,
    endTime: endTime ?? null,
    location: options?.location ?? null,
    eventType: options?.eventType ?? 'event',
  };
}

/**
 * Delete a calendar event.
 */
export function deleteEvent(store: MemoryStore, id: number): void {
  store.deleteCalendarEvent(id);
}

// ── Formatting ───────────────────────────────────────────────────

/**
 * Format events for Claude's tool response.
 */
export function formatEventsForClaude(events: CalendarEvent[], label: string = 'Schedule'): string {
  if (events.length === 0) {
    return `${label}: No events scheduled.`;
  }

  const lines = [`${label}:`];
  for (const event of events) {
    const start = formatTime(event.startTime);
    const end = event.endTime ? ` – ${formatTime(event.endTime)}` : '';
    const loc = event.location ? ` (${event.location})` : '';
    const desc = event.description ? ` — ${event.description}` : '';
    lines.push(`  ${start}${end}: ${event.title}${loc}${desc}`);
  }

  return lines.join('\n');
}

/**
 * Format events for the dashboard API.
 */
export function formatEventsForDashboard(events: CalendarEvent[]) {
  return events.map((e) => ({
    id: e.id,
    title: e.title,
    time: formatTime(e.startTime),
    type: e.eventType,
  }));
}

/**
 * Format events for the morning briefing context.
 */
export function formatEventsForBriefing(events: CalendarEvent[]): string[] {
  return events.map((e) => {
    const time = formatTime(e.startTime);
    const loc = e.location ? ` at ${e.location}` : '';
    return `${time}: ${e.title}${loc}`;
  });
}

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Vienna',
    });
  } catch {
    return isoString;
  }
}

/**
 * Get events happening soon (within the next N minutes).
 * Used by heartbeat for pre-meeting notifications.
 */
export function getEventsSoon(store: MemoryStore, withinMinutes: number = 30): CalendarEvent[] {
  const now = new Date();
  const soon = new Date(now.getTime() + withinMinutes * 60 * 1000);

  const todayStr = now.toISOString().slice(0, 10);
  const todayEvents = store.getEventsForDate(todayStr).map(rowToEvent);

  return todayEvents.filter((e) => {
    const eventTime = new Date(e.startTime);
    return eventTime > now && eventTime <= soon;
  });
}
