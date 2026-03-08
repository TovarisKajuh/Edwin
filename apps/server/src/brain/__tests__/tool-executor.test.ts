import { describe, it, expect, beforeEach } from 'vitest';
import { executeTools } from '../tool-executor';
import { MemoryStore } from '../../memory/store';
import { Database } from '../../db/database';

let store: MemoryStore;

beforeEach(() => {
  const db = new Database(':memory:');
  store = new MemoryStore(db);
});

describe('Tool Executor', () => {
  // ── Remember Tool ──────────────────────────────────────────────

  describe('remember', () => {
    it('should store a fact with told source when confidence >= 0.9', () => {
      const results = executeTools(store, [{
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

    it('should store with observed source when confidence 0.6-0.89', () => {
      executeTools(store, [{
        id: 'tool_1',
        name: 'remember',
        input: { category: 'preference', content: 'Jan prefers morning workouts', confidence: 0.7 },
      }]);

      const obs = store.getObservationsByCategory('preference');
      expect(obs[0].source).toBe('observed');
    });

    it('should store with inferred source when confidence < 0.6', () => {
      executeTools(store, [{
        id: 'tool_1',
        name: 'remember',
        input: { category: 'emotional_state', content: 'Jan seems stressed', confidence: 0.5 },
      }]);

      const obs = store.getObservationsByCategory('emotional_state');
      expect(obs[0].source).toBe('inferred');
    });

    it('should store commitments', () => {
      executeTools(store, [{
        id: 'tool_1',
        name: 'remember',
        input: { category: 'commitment', content: 'Jan will go to the gym tomorrow', confidence: 1.0 },
      }]);

      const obs = store.getObservationsByCategory('commitment');
      expect(obs).toHaveLength(1);
      expect(obs[0].content).toContain('gym');
    });

    it('should reject invalid categories', () => {
      const results = executeTools(store, [{
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
    it('should find stored observations by topic', () => {
      store.addObservation('fact', 'Jan goes to the gym 4 times a week', 0.8, 'observed');
      store.addObservation('fact', 'Jan likes Italian food', 0.9, 'told');

      const results = executeTools(store, [{
        id: 'tool_1',
        name: 'recall',
        input: { query: 'gym' },
      }]);

      expect(results[0].content).toContain('gym');
      expect(results[0].content).not.toContain('Italian');
    });

    it('should return "no memories" when nothing matches', () => {
      const results = executeTools(store, [{
        id: 'tool_1',
        name: 'recall',
        input: { query: 'quantum physics' },
      }]);

      expect(results[0].content).toContain('No memories found');
    });
  });

  // ── Schedule Reminder Tool ─────────────────────────────────────

  describe('schedule_reminder', () => {
    it('should create a scheduled action', () => {
      const results = executeTools(store, [{
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

    it('should default stakes to low', () => {
      executeTools(store, [{
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

    it('should reject invalid trigger times', () => {
      const results = executeTools(store, [{
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
    it('should list pending actions', () => {
      store.addScheduledAction('reminder', 'Call electrician', '2026-03-09T14:00:00', 'medium');
      store.addScheduledAction('reminder', 'Buy groceries', '2026-03-09T10:00:00', 'low');

      const results = executeTools(store, [{
        id: 'tool_1',
        name: 'list_pending',
        input: {},
      }]);

      expect(results[0].content).toContain('Call electrician');
      expect(results[0].content).toContain('Buy groceries');
    });

    it('should return empty message when no pending actions', () => {
      const results = executeTools(store, [{
        id: 'tool_1',
        name: 'list_pending',
        input: {},
      }]);

      expect(results[0].content).toContain('No pending');
    });

    it('should not list done actions', () => {
      const id = store.addScheduledAction('reminder', 'Done task', '2026-03-09T10:00:00', 'low');
      store.markActionDone(id);

      const results = executeTools(store, [{
        id: 'tool_1',
        name: 'list_pending',
        input: {},
      }]);

      expect(results[0].content).toContain('No pending');
    });
  });

  // ── Multiple Tools ─────────────────────────────────────────────

  describe('multiple tools', () => {
    it('should execute multiple tool calls in one batch', () => {
      const results = executeTools(store, [
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
    it('should return error for unknown tool name', () => {
      const results = executeTools(store, [{
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
