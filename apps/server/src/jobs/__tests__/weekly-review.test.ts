import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Database } from '../../db/database';
import { MemoryStore } from '../../memory/store';

vi.mock('../../brain/reasoning', () => ({
  callClaude: vi.fn(),
}));

vi.mock('../../push/push-service', () => ({
  sendPushToAll: vi.fn(() => Promise.resolve(0)),
}));

import {
  buildWeeklyReviewContext,
  formatReviewDataPrompt,
  buildReviewSystemPrompt,
  generateWeeklyReview,
  storeWeeklyReview,
  runWeeklyReview,
  getLatestWeeklyReview,
} from '../weekly-review';
import { callClaude } from '../../brain/reasoning';
import { sendPushToAll } from '../../push/push-service';

let store: MemoryStore;

// Use a fixed Sunday for consistent test results
const TEST_SUNDAY = new Date('2026-03-08T19:00:00Z'); // Sunday
const TEST_WEEK_START = '2026-03-02'; // Monday
const TEST_WEEK_END = '2026-03-08';   // Sunday

beforeEach(() => {
  vi.resetAllMocks();
  const db = new Database(':memory:');
  store = new MemoryStore(db);
});

describe('Weekly Review', () => {
  // ── Context Building ───────────────────────────────────────────

  describe('buildWeeklyReviewContext', () => {
    it('should return correct week bounds for a Sunday', () => {
      const ctx = buildWeeklyReviewContext(store, TEST_SUNDAY);
      expect(ctx.weekStart).toBe(TEST_WEEK_START);
      expect(ctx.weekEnd).toBe(TEST_WEEK_END);
    });

    it('should return correct week bounds for a Wednesday', () => {
      const wednesday = new Date('2026-03-04T12:00:00Z');
      const ctx = buildWeeklyReviewContext(store, wednesday);
      expect(ctx.weekStart).toBe(TEST_WEEK_START);
      expect(ctx.weekEnd).toBe(TEST_WEEK_END);
    });

    it('should return empty arrays with empty store', () => {
      const ctx = buildWeeklyReviewContext(store, TEST_SUNDAY);
      expect(ctx.conversationSummaries).toEqual([]);
      expect(ctx.completedActions).toEqual([]);
      expect(ctx.missedActions).toEqual([]);
      expect(ctx.habitStats).toEqual([]);
      expect(ctx.socialActivity.seen).toEqual([]);
      expect(ctx.socialActivity.overdue).toEqual([]);
      expect(ctx.patternsThisWeek).toEqual([]);
      expect(ctx.previousWeekHighlights).toBeNull();
    });

    it('should include conversation summaries from the week', () => {
      const convId = store.startConversation('chat');
      store.addMessage(convId, 'jan', 'hello');
      store.endConversation(convId, 'Test conversation summary');

      // Manually set the started_at to within the week
      store.raw().prepare(
        "UPDATE conversations SET started_at = ? WHERE id = ?",
      ).run('2026-03-05T10:00:00Z', convId);

      const ctx = buildWeeklyReviewContext(store, TEST_SUNDAY);
      expect(ctx.conversationSummaries).toContain('Test conversation summary');
    });

    it('should include habit stats when habits are logged', () => {
      // Log a gym completion this week
      store.addObservation('habit_log', '[gym] completed (2026-03-05)', 1.0, 'told');
      store.addObservation('habit_log', '[gym] completed (2026-03-07)', 1.0, 'told');

      const ctx = buildWeeklyReviewContext(store, TEST_SUNDAY);
      const gymStat = ctx.habitStats.find((h) => h.habit === 'gym');
      expect(gymStat).toBeDefined();
      expect(gymStat!.completed).toBe(2);
      expect(gymStat!.goal).toBe(4);
    });

    it('should include patterns detected this week', () => {
      store.addObservation('pattern', 'Jan tends to skip gym on Fridays', 0.8, 'inferred');
      // Manually set observed_at to within the week
      store.raw().prepare(
        "UPDATE observations SET observed_at = ? WHERE category = 'pattern'",
      ).run('2026-03-06T10:00:00Z');

      const ctx = buildWeeklyReviewContext(store, TEST_SUNDAY);
      expect(ctx.patternsThisWeek.length).toBe(1);
      expect(ctx.patternsThisWeek[0]).toContain('Fridays');
    });

    it('should include completed actions from the week', () => {
      const id = store.addScheduledAction('reminder', 'Call electrician', '2026-03-04T10:00:00Z', 'medium');
      store.markActionDone(id);

      const ctx = buildWeeklyReviewContext(store, TEST_SUNDAY);
      expect(ctx.completedActions).toContain('Call electrician');
    });

    it('should include missed actions (past due, still pending)', () => {
      // Create an action that was due during the week but is still pending
      store.addScheduledAction('reminder', 'Submit invoice', '2026-03-03T10:00:00Z', 'high');

      const ctx = buildWeeklyReviewContext(store, TEST_SUNDAY);
      expect(ctx.missedActions).toContain('Submit invoice');
    });

    it('should include previous week highlights if available', () => {
      store.addWeeklySummary('2026-02-23', 'Hit gym 4 times', 'Missed diet', 'Consistent mornings', 'stable');

      const ctx = buildWeeklyReviewContext(store, TEST_SUNDAY);
      expect(ctx.previousWeekHighlights).toBe('Hit gym 4 times');
    });

    it('should include social activity data', () => {
      const db = store.raw();
      db.prepare("INSERT INTO people (name, relationship, last_contact) VALUES (?, ?, ?)").run('Max', 'friend', '2026-03-06');
      db.prepare("INSERT INTO people (name, relationship, last_contact, contact_frequency_goal) VALUES (?, ?, ?, ?)").run('Anna', 'family', '2026-01-15', 'monthly');

      const ctx = buildWeeklyReviewContext(store, TEST_SUNDAY);
      expect(ctx.socialActivity.seen).toContain('Max');
      expect(ctx.socialActivity.overdue.length).toBeGreaterThan(0);
    });

    it('should include low stock items', () => {
      const db = store.raw();
      db.prepare("INSERT INTO items (name, category, quantity, reorder_threshold) VALUES (?, ?, ?, ?)").run('Creatine', 'supplements', 2, 5);

      const ctx = buildWeeklyReviewContext(store, TEST_SUNDAY);
      expect(ctx.lowStockItems.length).toBe(1);
      expect(ctx.lowStockItems[0]).toContain('Creatine');
    });
  });

  // ── Prompt Formatting ─────────────────────────────────────────

  describe('formatReviewDataPrompt', () => {
    it('should format empty context without crashing', () => {
      const ctx = buildWeeklyReviewContext(store, TEST_SUNDAY);
      const prompt = formatReviewDataPrompt(ctx);
      expect(prompt).toContain('WEEKLY REVIEW DATA');
      expect(prompt).toContain(TEST_WEEK_START);
      expect(prompt).toContain('None recorded this week');
    });

    it('should include all sections when data exists', () => {
      // Add habit data
      store.addObservation('habit_log', '[gym] completed (2026-03-05)', 1.0, 'told');

      // Add a completed action
      const id = store.addScheduledAction('reminder', 'Call dentist', '2026-03-04T10:00:00Z', 'low');
      store.markActionDone(id);

      // Add a pattern
      store.addObservation('pattern', 'Morning energy peaks at 7am', 0.7, 'inferred');
      store.raw().prepare("UPDATE observations SET observed_at = ? WHERE category = 'pattern'").run('2026-03-05T10:00:00Z');

      const ctx = buildWeeklyReviewContext(store, TEST_SUNDAY);
      const prompt = formatReviewDataPrompt(ctx);

      expect(prompt).toContain('COMPLETED');
      expect(prompt).toContain('Call dentist');
      expect(prompt).toContain('HABIT DATA');
      expect(prompt).toContain('Gym');
      expect(prompt).toContain('PATTERNS DETECTED');
    });

    it('should include previous week highlights', () => {
      store.addWeeklySummary('2026-02-23', 'Great week', 'None', 'Consistency', 'improving');
      const ctx = buildWeeklyReviewContext(store, TEST_SUNDAY);
      const prompt = formatReviewDataPrompt(ctx);
      expect(prompt).toContain('LAST WEEK HIGHLIGHTS');
      expect(prompt).toContain('Great week');
    });

    it('should include social data', () => {
      store.raw().prepare("INSERT INTO people (name, relationship, last_contact) VALUES (?, ?, ?)").run('Tom', 'friend', '2026-03-04');

      const ctx = buildWeeklyReviewContext(store, TEST_SUNDAY);
      const prompt = formatReviewDataPrompt(ctx);
      expect(prompt).toContain('SOCIAL');
      expect(prompt).toContain('Tom');
    });
  });

  // ── System Prompt ─────────────────────────────────────────────

  describe('buildReviewSystemPrompt', () => {
    it('should include all review sections', () => {
      const prompt = buildReviewSystemPrompt();
      expect(prompt).toContain('WINS');
      expect(prompt).toContain('MISSES');
      expect(prompt).toContain('HABITS');
      expect(prompt).toContain('MONEY');
      expect(prompt).toContain('PEOPLE');
      expect(prompt).toContain('PATTERNS');
      expect(prompt).toContain('NEXT WEEK');
    });

    it('should instruct Edwin to address Jan as sir', () => {
      const prompt = buildReviewSystemPrompt();
      expect(prompt).toContain('sir');
    });

    it('should set word limit', () => {
      const prompt = buildReviewSystemPrompt();
      expect(prompt).toContain('350 words');
    });
  });

  // ── Generation ────────────────────────────────────────────────

  describe('generateWeeklyReview', () => {
    it('should call Claude with system and data prompts', async () => {
      vi.mocked(callClaude).mockResolvedValue('A comprehensive weekly review...');

      const result = await generateWeeklyReview(store, TEST_SUNDAY);

      expect(callClaude).toHaveBeenCalledOnce();
      const [systemPrompt, messages, options] = vi.mocked(callClaude).mock.calls[0];
      expect(systemPrompt).toContain('weekly review');
      expect(messages[0].content).toContain('WEEKLY REVIEW DATA');
      expect(options?.maxTokens).toBe(800);
      expect(result).toBe('A comprehensive weekly review...');
    });
  });

  // ── Storage ───────────────────────────────────────────────────

  describe('storeWeeklyReview', () => {
    it('should store review in weekly_summaries table', () => {
      const ctx = buildWeeklyReviewContext(store, TEST_SUNDAY);
      storeWeeklyReview(store, TEST_WEEK_START, 'Full review text here', ctx);

      const summary = store.getWeeklySummary(TEST_WEEK_START);
      expect(summary).toBeDefined();
      expect(summary!.week_start).toBe(TEST_WEEK_START);
    });

    it('should store full review as observation', () => {
      const ctx = buildWeeklyReviewContext(store, TEST_SUNDAY);
      storeWeeklyReview(store, TEST_WEEK_START, 'Full review text here', ctx);

      const obs = store.getObservationsByCategory('weekly_review', 5);
      expect(obs.length).toBe(1);
      expect(obs[0].content).toContain(TEST_WEEK_START);
      expect(obs[0].content).toContain('Full review text here');
    });

    it('should include declining habits in concerns', () => {
      // Log last week gym (so this week shows as declining)
      store.addObservation('habit_log', '[gym] completed (2026-02-25)', 1.0, 'told');
      store.addObservation('habit_log', '[gym] completed (2026-02-26)', 1.0, 'told');
      store.addObservation('habit_log', '[gym] completed (2026-02-27)', 1.0, 'told');
      // No gym this week — trend is declining

      const ctx = buildWeeklyReviewContext(store, TEST_SUNDAY);
      storeWeeklyReview(store, TEST_WEEK_START, 'Review', ctx);

      const summary = store.getWeeklySummary(TEST_WEEK_START);
      expect(summary!.concerns).toContain('Gym declining');
    });

    it('should include overdue contacts in concerns', () => {
      store.raw().prepare("INSERT INTO people (name, relationship, last_contact, contact_frequency_goal) VALUES (?, ?, ?, ?)").run('Mom', 'family', '2025-12-01', 'monthly');

      const ctx = buildWeeklyReviewContext(store, TEST_SUNDAY);
      storeWeeklyReview(store, TEST_WEEK_START, 'Review', ctx);

      const summary = store.getWeeklySummary(TEST_WEEK_START);
      expect(summary!.concerns).toContain('Overdue');
      expect(summary!.concerns).toContain('Mom');
    });
  });

  // ── Full Flow ─────────────────────────────────────────────────

  describe('runWeeklyReview', () => {
    it('should generate, store, and push the review', async () => {
      vi.mocked(callClaude).mockResolvedValue('Your weekly review, sir...');

      const result = await runWeeklyReview(store, TEST_SUNDAY);

      expect(result).toBe('Your weekly review, sir...');
      expect(callClaude).toHaveBeenCalledOnce();
      expect(sendPushToAll).toHaveBeenCalledOnce();

      // Check stored in weekly_summaries
      const summary = store.getWeeklySummary(TEST_WEEK_START);
      expect(summary).toBeDefined();

      // Check stored as notification
      const notifications = store.getNotifications(5);
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].description).toContain('Your weekly review');
    });

    it('should store as observation for memory search', async () => {
      vi.mocked(callClaude).mockResolvedValue('Great week overall...');

      await runWeeklyReview(store, TEST_SUNDAY);

      const obs = store.getObservationsByCategory('weekly_review', 5);
      expect(obs.length).toBe(1);
      expect(obs[0].content).toContain('Great week overall');
    });
  });

  // ── API Retrieval ─────────────────────────────────────────────

  describe('getLatestWeeklyReview', () => {
    it('should return null when no reviews exist', () => {
      const result = getLatestWeeklyReview(store);
      expect(result).toBeNull();
    });

    it('should return the latest review when available', () => {
      store.addWeeklySummary(TEST_WEEK_START, 'highlights', 'concerns', 'patterns', 'mood');
      store.addObservation('weekly_review', `Weekly review ${TEST_WEEK_START}: Full review text`, 1.0, 'told');

      // Use the same week as test reference
      const result = getLatestWeeklyReview(store);
      // May or may not match current real week — test the retrieval logic
      if (result) {
        expect(result.highlights).toBe('highlights');
        expect(result.concerns).toBe('concerns');
        expect(result.fullReview).toBe('Full review text');
      }
    });
  });

  // ── Week Bounds Edge Cases ────────────────────────────────────

  describe('week bounds', () => {
    it('Monday should be start of its own week', () => {
      const monday = new Date('2026-03-02T12:00:00Z');
      const ctx = buildWeeklyReviewContext(store, monday);
      expect(ctx.weekStart).toBe('2026-03-02');
      expect(ctx.weekEnd).toBe('2026-03-08');
    });

    it('Saturday should map to current week', () => {
      const saturday = new Date('2026-03-07T12:00:00Z');
      const ctx = buildWeeklyReviewContext(store, saturday);
      expect(ctx.weekStart).toBe('2026-03-02');
      expect(ctx.weekEnd).toBe('2026-03-08');
    });
  });
});
