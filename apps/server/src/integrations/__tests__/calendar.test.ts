import { describe, it, expect, beforeEach } from 'vitest';
import { Database } from '../../db/database';
import { MemoryStore } from '../../memory/store';
import {
  getTodayEvents,
  getWeekEvents,
  getUpcomingEvents,
  createEvent,
  deleteEvent,
  formatEventsForClaude,
  formatEventsForDashboard,
  formatEventsForBriefing,
  getEventsSoon,
} from '../calendar';

let store: MemoryStore;

beforeEach(() => {
  const db = new Database(':memory:');
  store = new MemoryStore(db);
});

describe('Calendar Integration', () => {
  // ── Event Creation ────────────────────────────────────────────

  describe('createEvent', () => {
    it('should create an event and return it', () => {
      const event = createEvent(store, 'Team meeting', '2026-03-09T10:00:00');

      expect(event.id).toBeGreaterThan(0);
      expect(event.title).toBe('Team meeting');
      expect(event.startTime).toBe('2026-03-09T10:00:00');
      expect(event.endTime).toBeNull();
      expect(event.eventType).toBe('event');
    });

    it('should create event with all options', () => {
      const event = createEvent(store, 'Client lunch', '2026-03-09T12:00:00', '2026-03-09T13:30:00', {
        description: 'Discuss Q2 proposal',
        location: 'Haubenrestaurant',
        eventType: 'meeting',
      });

      expect(event.description).toBe('Discuss Q2 proposal');
      expect(event.location).toBe('Haubenrestaurant');
      expect(event.endTime).toBe('2026-03-09T13:30:00');
      expect(event.eventType).toBe('meeting');
    });
  });

  // ── Event Retrieval ───────────────────────────────────────────

  describe('getTodayEvents', () => {
    it('should return events for today', () => {
      const today = new Date().toISOString().slice(0, 10);
      store.addCalendarEvent('Morning standup', `${today}T09:00:00`);
      store.addCalendarEvent('Gym', `${today}T17:00:00`);
      store.addCalendarEvent('Tomorrow event', '2099-01-01T10:00:00');

      const events = getTodayEvents(store);

      expect(events).toHaveLength(2);
      expect(events[0].title).toBe('Morning standup');
      expect(events[1].title).toBe('Gym');
    });

    it('should return empty for days with no events', () => {
      store.addCalendarEvent('Future event', '2099-01-01T10:00:00');

      const events = getTodayEvents(store);
      expect(events).toHaveLength(0);
    });
  });

  describe('getWeekEvents', () => {
    it('should return events for the current week', () => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);

      // Add event on Monday of current week
      const mondayStr = monday.toISOString().slice(0, 10);
      store.addCalendarEvent('Monday meeting', `${mondayStr}T10:00:00`);

      // Add event far in the future (should not be included)
      store.addCalendarEvent('Future event', '2099-06-15T10:00:00');

      const events = getWeekEvents(store);
      expect(events.some((e) => e.title === 'Monday meeting')).toBe(true);
      expect(events.some((e) => e.title === 'Future event')).toBe(false);
    });
  });

  describe('getUpcomingEvents', () => {
    it('should return upcoming events sorted by start time', () => {
      const future1 = new Date(Date.now() + 3600000).toISOString();
      const future2 = new Date(Date.now() + 7200000).toISOString();
      const past = new Date(Date.now() - 3600000).toISOString();

      store.addCalendarEvent('Soon', future1);
      store.addCalendarEvent('Later', future2);
      store.addCalendarEvent('Past', past);

      const events = getUpcomingEvents(store, 5);

      expect(events).toHaveLength(2);
      expect(events[0].title).toBe('Soon');
      expect(events[1].title).toBe('Later');
    });

    it('should respect limit', () => {
      for (let i = 0; i < 5; i++) {
        const future = new Date(Date.now() + (i + 1) * 3600000).toISOString();
        store.addCalendarEvent(`Event ${i}`, future);
      }

      const events = getUpcomingEvents(store, 3);
      expect(events).toHaveLength(3);
    });
  });

  // ── Event Deletion ────────────────────────────────────────────

  describe('deleteEvent', () => {
    it('should remove an event', () => {
      const today = new Date().toISOString().slice(0, 10);
      const event = createEvent(store, 'Delete me', `${today}T10:00:00`);

      deleteEvent(store, event.id);

      const events = getTodayEvents(store);
      expect(events.find((e) => e.title === 'Delete me')).toBeUndefined();
    });
  });

  // ── Formatting ────────────────────────────────────────────────

  describe('formatEventsForClaude', () => {
    it('should format events with times', () => {
      const events = [
        { id: 1, title: 'Standup', description: null, startTime: '2026-03-09T09:00:00', endTime: '2026-03-09T09:30:00', location: null, eventType: 'meeting' },
        { id: 2, title: 'Lunch', description: 'With client', startTime: '2026-03-09T12:00:00', endTime: null, location: 'Downtown', eventType: 'event' },
      ];

      const result = formatEventsForClaude(events, 'Today');

      expect(result).toContain('Today:');
      expect(result).toContain('Standup');
      expect(result).toContain('Lunch');
      expect(result).toContain('Downtown');
      expect(result).toContain('With client');
    });

    it('should show empty message when no events', () => {
      const result = formatEventsForClaude([], 'Today');
      expect(result).toContain('No events');
    });
  });

  describe('formatEventsForDashboard', () => {
    it('should return dashboard-friendly format', () => {
      const events = [
        { id: 1, title: 'Meeting', description: null, startTime: '2026-03-09T10:00:00', endTime: null, location: null, eventType: 'meeting' },
      ];

      const result = formatEventsForDashboard(events);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].title).toBe('Meeting');
      expect(result[0].type).toBe('meeting');
    });
  });

  describe('formatEventsForBriefing', () => {
    it('should return human-readable event strings', () => {
      const events = [
        { id: 1, title: 'Standup', description: null, startTime: '2026-03-09T09:00:00', endTime: null, location: 'Office', eventType: 'meeting' },
      ];

      const result = formatEventsForBriefing(events);

      expect(result).toHaveLength(1);
      expect(result[0]).toContain('Standup');
      expect(result[0]).toContain('Office');
    });
  });

  // ── Upcoming Events (Soon) ────────────────────────────────────

  describe('getEventsSoon', () => {
    it('should return events within the time window', () => {
      const in15min = new Date(Date.now() + 15 * 60000).toISOString();
      const in45min = new Date(Date.now() + 45 * 60000).toISOString();
      const today = new Date().toISOString().slice(0, 10);

      store.addCalendarEvent('Soon', in15min);
      store.addCalendarEvent('Later', in45min);

      const soon = getEventsSoon(store, 30);

      expect(soon).toHaveLength(1);
      expect(soon[0].title).toBe('Soon');
    });

    it('should not return past events', () => {
      const past = new Date(Date.now() - 15 * 60000).toISOString();
      store.addCalendarEvent('Past', past);

      const soon = getEventsSoon(store, 30);
      expect(soon).toHaveLength(0);
    });
  });

  // ── Realistic Scenarios ────────────────────────────────────────

  describe('realistic scenarios', () => {
    it('full workday schedule', () => {
      const today = new Date().toISOString().slice(0, 10);

      createEvent(store, 'Morning standup', `${today}T09:00:00`, `${today}T09:15:00`, {
        eventType: 'meeting',
      });
      createEvent(store, 'Client call', `${today}T10:30:00`, `${today}T11:00:00`, {
        description: 'Discuss solar installation timeline',
        location: 'Phone',
        eventType: 'meeting',
      });
      createEvent(store, 'Gym', `${today}T17:00:00`, `${today}T18:30:00`, {
        location: 'McFit Graz',
        eventType: 'personal',
      });

      const events = getTodayEvents(store);
      expect(events).toHaveLength(3);
      expect(events[0].title).toBe('Morning standup');
      expect(events[2].title).toBe('Gym');

      const claude = formatEventsForClaude(events, 'Today');
      expect(claude).toContain('standup');
      expect(claude).toContain('solar');
      expect(claude).toContain('McFit');

      const dashboard = formatEventsForDashboard(events);
      expect(dashboard).toHaveLength(3);
      expect(dashboard[1].type).toBe('meeting');
    });
  });
});
