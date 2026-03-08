import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeTools } from '../tool-executor';
import { MemoryStore } from '../../memory/store';
import { Database } from '../../db/database';

vi.mock('../../integrations/weather', () => ({
  getWeather: vi.fn(),
  formatWeatherForClaude: vi.fn(),
}));

vi.mock('../../integrations/calendar', () => ({
  getTodayEvents: vi.fn().mockReturnValue([]),
  getWeekEvents: vi.fn().mockReturnValue([]),
  getUpcomingEvents: vi.fn().mockReturnValue([]),
  createEvent: vi.fn(),
  formatEventsForClaude: vi.fn(),
}));

import { getWeather, formatWeatherForClaude } from '../../integrations/weather';
import { getTodayEvents, getWeekEvents, getUpcomingEvents, createEvent, formatEventsForClaude as formatCalendarForClaude } from '../../integrations/calendar';

let store: MemoryStore;

beforeEach(() => {
  vi.resetAllMocks();
  const db = new Database(':memory:');
  store = new MemoryStore(db);
});

describe('Tool Executor', () => {
  // ── Remember Tool ──────────────────────────────────────────────

  describe('remember', () => {
    it('should store a fact with told source when confidence >= 0.9', async () => {
      const results = await executeTools(store, [{
        id: 'tool_1',
        name: 'remember',
        input: {
          category: 'fact',
          content: 'Jan weighs 81kg',
          confidence: 1.0,
        },
      }]);

      expect(results).toHaveLength(1);
      expect(results[0].content).toContain('Remembered');
      expect(results[0].is_error).toBeUndefined();

      // Verify it's in the store
      const obs = store.getObservationsByCategory('fact');
      expect(obs).toHaveLength(1);
      expect(obs[0].content).toBe('Jan weighs 81kg');
      expect(obs[0].source).toBe('told');
    });

    it('should store with observed source when confidence 0.6-0.89', async () => {
      await executeTools(store, [{
        id: 'tool_1',
        name: 'remember',
        input: { category: 'preference', content: 'Jan prefers morning workouts', confidence: 0.7 },
      }]);

      const obs = store.getObservationsByCategory('preference');
      expect(obs[0].source).toBe('observed');
    });

    it('should store with inferred source when confidence < 0.6', async () => {
      await executeTools(store, [{
        id: 'tool_1',
        name: 'remember',
        input: { category: 'emotional_state', content: 'Jan seems stressed', confidence: 0.5 },
      }]);

      const obs = store.getObservationsByCategory('emotional_state');
      expect(obs[0].source).toBe('inferred');
    });

    it('should store commitments', async () => {
      await executeTools(store, [{
        id: 'tool_1',
        name: 'remember',
        input: { category: 'commitment', content: 'Jan will go to the gym tomorrow', confidence: 1.0 },
      }]);

      const obs = store.getObservationsByCategory('commitment');
      expect(obs).toHaveLength(1);
      expect(obs[0].content).toContain('gym');
    });

    it('should reject invalid categories', async () => {
      const results = await executeTools(store, [{
        id: 'tool_1',
        name: 'remember',
        input: { category: 'invalid', content: 'test', confidence: 0.5 },
      }]);

      expect(results[0].is_error).toBe(true);
      expect(results[0].content).toContain('Invalid category');
    });
  });

  // ── Recall Tool ────────────────────────────────────────────────

  describe('recall', () => {
    it('should find stored observations by topic', async () => {
      store.addObservation('fact', 'Jan goes to the gym 4 times a week', 0.8, 'observed');
      store.addObservation('fact', 'Jan likes Italian food', 0.9, 'told');

      const results = await executeTools(store, [{
        id: 'tool_1',
        name: 'recall',
        input: { query: 'gym' },
      }]);

      expect(results[0].content).toContain('gym');
      expect(results[0].content).not.toContain('Italian');
    });

    it('should return "no memories" when nothing matches', async () => {
      const results = await executeTools(store, [{
        id: 'tool_1',
        name: 'recall',
        input: { query: 'quantum physics' },
      }]);

      expect(results[0].content).toContain('No memories found');
    });
  });

  // ── Schedule Reminder Tool ─────────────────────────────────────

  describe('schedule_reminder', () => {
    it('should create a scheduled action', async () => {
      const results = await executeTools(store, [{
        id: 'tool_1',
        name: 'schedule_reminder',
        input: {
          description: 'Call the electrician',
          trigger_time: '2026-03-09T14:00:00',
          stakes_level: 'medium',
        },
      }]);

      expect(results[0].content).toContain('Reminder scheduled');
      expect(results[0].content).toContain('Call the electrician');

      // Verify in store
      const pending = store.getPendingActions(10);
      expect(pending).toHaveLength(1);
      expect(pending[0].description).toBe('Call the electrician');
      expect(pending[0].stakes_level).toBe('medium');
    });

    it('should default stakes to low', async () => {
      await executeTools(store, [{
        id: 'tool_1',
        name: 'schedule_reminder',
        input: {
          description: 'Buy milk',
          trigger_time: '2026-03-09T10:00:00',
        },
      }]);

      const pending = store.getPendingActions(10);
      expect(pending[0].stakes_level).toBe('low');
    });

    it('should reject invalid trigger times', async () => {
      const results = await executeTools(store, [{
        id: 'tool_1',
        name: 'schedule_reminder',
        input: {
          description: 'Something',
          trigger_time: 'not-a-date',
        },
      }]);

      expect(results[0].is_error).toBe(true);
      expect(results[0].content).toContain('Invalid trigger_time');
    });
  });

  // ── List Pending Tool ──────────────────────────────────────────

  describe('list_pending', () => {
    it('should list pending actions', async () => {
      store.addScheduledAction('reminder', 'Call electrician', '2026-03-09T14:00:00', 'medium');
      store.addScheduledAction('reminder', 'Buy groceries', '2026-03-09T10:00:00', 'low');

      const results = await executeTools(store, [{
        id: 'tool_1',
        name: 'list_pending',
        input: {},
      }]);

      expect(results[0].content).toContain('Call electrician');
      expect(results[0].content).toContain('Buy groceries');
    });

    it('should return empty message when no pending actions', async () => {
      const results = await executeTools(store, [{
        id: 'tool_1',
        name: 'list_pending',
        input: {},
      }]);

      expect(results[0].content).toContain('No pending');
    });

    it('should not list done actions', async () => {
      const id = store.addScheduledAction('reminder', 'Done task', '2026-03-09T10:00:00', 'low');
      store.markActionDone(id);

      const results = await executeTools(store, [{
        id: 'tool_1',
        name: 'list_pending',
        input: {},
      }]);

      expect(results[0].content).toContain('No pending');
    });
  });

  // ── Weather Tool ──────────────────────────────────────────────

  describe('get_current_weather', () => {
    it('should return formatted weather report', async () => {
      const mockReport = {
        current: { temperature: 12, apparentTemperature: 9, weatherCode: 2, windSpeed: 15, humidity: 65, description: 'Partly cloudy' },
        forecast: [],
        location: 'Graz, Austria',
        fetchedAt: new Date().toISOString(),
      };
      vi.mocked(getWeather).mockResolvedValue(mockReport);
      vi.mocked(formatWeatherForClaude).mockReturnValue('Graz, Austria — Partly cloudy, 12°C');

      const results = await executeTools(store, [{
        id: 'tool_1',
        name: 'get_current_weather',
        input: {},
      }]);

      expect(results[0].content).toBe('Graz, Austria — Partly cloudy, 12°C');
      expect(results[0].is_error).toBeUndefined();
      expect(getWeather).toHaveBeenCalledOnce();
      expect(formatWeatherForClaude).toHaveBeenCalledWith(mockReport);
    });

    it('should handle weather API errors gracefully', async () => {
      vi.mocked(getWeather).mockRejectedValue(new Error('Weather API error: 503'));

      const results = await executeTools(store, [{
        id: 'tool_1',
        name: 'get_current_weather',
        input: {},
      }]);

      expect(results[0].is_error).toBe(true);
      expect(results[0].content).toContain('Weather API error');
    });
  });

  // ── Schedule Tool ──────────────────────────────────────────────

  describe('get_schedule', () => {
    it('should return today schedule', async () => {
      vi.mocked(getTodayEvents).mockReturnValue([
        { id: 1, title: 'Standup', description: null, startTime: '2026-03-09T09:00:00', endTime: null, location: null, eventType: 'meeting' },
      ]);
      vi.mocked(formatCalendarForClaude).mockReturnValue('Today: Standup at 09:00');

      const results = await executeTools(store, [{
        id: 'tool_1',
        name: 'get_schedule',
        input: { range: 'today' },
      }]);

      expect(results[0].content).toBe('Today: Standup at 09:00');
      expect(getTodayEvents).toHaveBeenCalledWith(store);
    });

    it('should return week schedule', async () => {
      vi.mocked(getWeekEvents).mockReturnValue([]);
      vi.mocked(formatCalendarForClaude).mockReturnValue('This week: No events.');

      const results = await executeTools(store, [{
        id: 'tool_1',
        name: 'get_schedule',
        input: { range: 'week' },
      }]);

      expect(results[0].content).toContain('No events');
      expect(getWeekEvents).toHaveBeenCalledWith(store);
    });

    it('should return upcoming events', async () => {
      vi.mocked(getUpcomingEvents).mockReturnValue([]);
      vi.mocked(formatCalendarForClaude).mockReturnValue('Upcoming: No events.');

      const results = await executeTools(store, [{
        id: 'tool_1',
        name: 'get_schedule',
        input: { range: 'upcoming' },
      }]);

      expect(results[0].content).toContain('No events');
      expect(getUpcomingEvents).toHaveBeenCalledWith(store, 10);
    });
  });

  // ── Create Event Tool ─────────────────────────────────────────

  describe('create_event', () => {
    it('should create an event', async () => {
      vi.mocked(createEvent).mockReturnValue({
        id: 42,
        title: 'Client lunch',
        description: null,
        startTime: '2026-03-09T12:00:00',
        endTime: null,
        location: null,
        eventType: 'event',
      });

      const results = await executeTools(store, [{
        id: 'tool_1',
        name: 'create_event',
        input: {
          title: 'Client lunch',
          start_time: '2026-03-09T12:00:00',
        },
      }]);

      expect(results[0].content).toContain('Event created');
      expect(results[0].content).toContain('Client lunch');
      expect(createEvent).toHaveBeenCalled();
    });

    it('should reject invalid start times', async () => {
      const results = await executeTools(store, [{
        id: 'tool_1',
        name: 'create_event',
        input: {
          title: 'Bad event',
          start_time: 'not-a-date',
        },
      }]);

      expect(results[0].is_error).toBe(true);
      expect(results[0].content).toContain('Invalid start_time');
    });
  });

  // ── Multiple Tools ─────────────────────────────────────────────

  describe('multiple tools', () => {
    it('should execute multiple tool calls in one batch', async () => {
      const results = await executeTools(store, [
        {
          id: 'tool_1',
          name: 'remember',
          input: { category: 'fact', content: 'Jan has a meeting Friday', confidence: 1.0 },
        },
        {
          id: 'tool_2',
          name: 'schedule_reminder',
          input: { description: 'Meeting prep', trigger_time: '2026-03-13T09:00:00' },
        },
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].content).toContain('Remembered');
      expect(results[1].content).toContain('Reminder scheduled');
    });
  });

  // ── Unknown Tool ───────────────────────────────────────────────

  describe('unknown tool', () => {
    it('should return error for unknown tool name', async () => {
      const results = await executeTools(store, [{
        id: 'tool_1',
        name: 'nonexistent_tool',
        input: {},
      }]);

      expect(results[0].is_error).toBe(true);
      expect(results[0].content).toContain('Unknown tool');
    });
  });

  // ── Store Methods ──────────────────────────────────────────────

  describe('store scheduled actions', () => {
    it('should find due actions', () => {
      store.addScheduledAction('reminder', 'Past reminder', '2026-03-08T10:00:00', 'low');
      store.addScheduledAction('reminder', 'Future reminder', '2026-12-31T10:00:00', 'low');

      const due = store.getDueActions('2026-03-08T12:00:00');
      expect(due).toHaveLength(1);
      expect(due[0].description).toBe('Past reminder');
    });
  });
});
