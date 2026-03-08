import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Database } from '../../db/database';
import { MemoryStore } from '../../memory/store';

vi.mock('../../brain/reasoning', () => ({
  callClaude: vi.fn(),
}));

vi.mock('../../integrations/news', () => ({
  getNews: vi.fn(),
  scoreRelevance: vi.fn(),
}));

vi.mock('../../push/push-service', () => ({
  sendPushToAll: vi.fn().mockResolvedValue(undefined),
}));

import { checkDueReminders, evaluateOutreach, checkNewsAlerts, runHeartbeat } from '../heartbeat';
import { callClaude } from '../../brain/reasoning';
import { getNews, scoreRelevance } from '../../integrations/news';
import { sendPushToAll } from '../../push/push-service';

let store: MemoryStore;

beforeEach(() => {
  vi.resetAllMocks();
  // Re-apply sendPushToAll mock after reset (needs to return a Promise for .catch() chains)
  vi.mocked(sendPushToAll).mockResolvedValue(undefined as any);
  const db = new Database(':memory:');
  store = new MemoryStore(db);
});

describe('Heartbeat', () => {
  // ── Reminder scan ────────────────────────────────────────────

  describe('checkDueReminders', () => {
    it('should trigger reminders that are past due', () => {
      const past = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
      store.addScheduledAction('reminder', 'Call the electrician', past, 'medium');

      const triggered = checkDueReminders(store);

      expect(triggered).toBe(1);

      // Original reminder should be marked done
      const pending = store.getPendingActions(10);
      const original = pending.find((a) => a.description === 'Call the electrician');
      expect(original).toBeUndefined(); // It's done now

      // A notification should have been created
      const notifications = pending.filter((a) => a.description.includes('Reminder:'));
      expect(notifications).toHaveLength(1);
      expect(notifications[0].description).toContain('Call the electrician');
    });

    it('should not trigger future reminders', () => {
      const future = new Date(Date.now() + 86400000).toISOString(); // tomorrow
      store.addScheduledAction('reminder', 'Future task', future, 'low');

      const triggered = checkDueReminders(store);

      expect(triggered).toBe(0);

      // Future reminder should still be pending
      const pending = store.getPendingActions(10);
      expect(pending.some((a) => a.description === 'Future task')).toBe(true);
    });

    it('should handle multiple due reminders', () => {
      const past1 = new Date(Date.now() - 7200000).toISOString();
      const past2 = new Date(Date.now() - 3600000).toISOString();
      store.addScheduledAction('reminder', 'Task A', past1, 'high');
      store.addScheduledAction('reminder', 'Task B', past2, 'medium');

      const triggered = checkDueReminders(store);

      expect(triggered).toBe(2);
    });

    it('should not trigger notification-type actions (avoid loops)', () => {
      const past = new Date(Date.now() - 3600000).toISOString();
      store.addScheduledAction('notification', 'Already a notification', past, 'low');

      const triggered = checkDueReminders(store);

      expect(triggered).toBe(0);
    });

    it('should return 0 when nothing is due', () => {
      const triggered = checkDueReminders(store);
      expect(triggered).toBe(0);
    });
  });

  // ── Outreach evaluation ──────────────────────────────────────

  describe('evaluateOutreach', () => {
    it('should return null when no context to evaluate', async () => {
      // Empty store — no mood, no commitments, no patterns
      const result = await evaluateOutreach(store);

      expect(result).toBeNull();
      expect(callClaude).not.toHaveBeenCalled();
    });

    it('should return null when Haiku says SILENT', async () => {
      store.addObservation('commitment', 'Jan will go to the gym', 1.0, 'told');

      vi.mocked(callClaude).mockResolvedValue('SILENT');

      const result = await evaluateOutreach(store);

      expect(result).toBeNull();
      expect(callClaude).toHaveBeenCalledOnce();
    });

    it('should return message when Haiku decides to reach out', async () => {
      store.addObservation('commitment', 'Jan said he would call the supplier today', 1.0, 'told');
      store.addObservation('emotional_state', 'Jan is stressed', 0.8, 'inferred');

      vi.mocked(callClaude).mockResolvedValue(
        'Sir, you mentioned calling the supplier today. Would you like me to remind you after lunch?',
      );

      const result = await evaluateOutreach(store);

      expect(result).toContain('supplier');
      expect(callClaude).toHaveBeenCalledOnce();
    });

    it('should store outreach message as notification', async () => {
      store.addObservation('commitment', 'Jan has gym today', 1.0, 'told');

      vi.mocked(callClaude).mockResolvedValue('Sir, gym day today. Shall I set a reminder?');

      await evaluateOutreach(store);

      const pending = store.getPendingActions(10);
      const notification = pending.find((a) => a.type === 'notification' && a.description.includes('gym'));
      expect(notification).toBeDefined();
    });

    it('should use Haiku model for cost efficiency', async () => {
      store.addObservation('pattern', 'Jan skips gym on Wednesdays', 0.8, 'inferred');

      vi.mocked(callClaude).mockResolvedValue('SILENT');

      await evaluateOutreach(store);

      expect(callClaude).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({ model: 'claude-haiku-4-5-20251001' }),
      );
    });

    it('should pass context brief to Haiku', async () => {
      store.addObservation('commitment', 'Call electrician', 1.0, 'told');
      store.addObservation('pattern', 'Jan skips gym on Wednesdays', 0.8, 'inferred');

      vi.mocked(callClaude).mockResolvedValue('SILENT');

      await evaluateOutreach(store);

      const prompt = vi.mocked(callClaude).mock.calls[0][1][0].content as string;
      expect(prompt).toContain('electrician');
      expect(prompt).toContain('SILENT');
    });
  });

  // ── News alerts ─────────────────────────────────────────────

  describe('checkNewsAlerts', () => {
    it('should push alerts for high-relevance news items', async () => {
      vi.mocked(getNews).mockResolvedValue({
        items: [
          { title: 'EU Solar Tariffs Spike 25%', source: 'PV Magazine', link: 'https://pv.com/1', publishedAt: '2026-03-08T10:00:00Z', summary: 'Major solar tariff increase' },
          { title: 'Cat cafe opens', source: 'TMZ', link: 'https://tmz.com/cats', publishedAt: '2026-03-08T10:00:00Z', summary: 'Cats everywhere' },
        ],
        fetchedAt: new Date().toISOString(),
      });

      vi.mocked(scoreRelevance)
        .mockReturnValueOnce(1.0)  // solar = high relevance
        .mockReturnValueOnce(0.0); // cats = irrelevant

      const alerted = await checkNewsAlerts(store);

      expect(alerted).toBe(1);
      expect(sendPushToAll).toHaveBeenCalledWith(store, expect.objectContaining({
        title: expect.stringContaining('PV Magazine'),
        body: 'EU Solar Tariffs Spike 25%',
      }));
    });

    it('should not push alerts for low-relevance news', async () => {
      vi.mocked(getNews).mockResolvedValue({
        items: [
          { title: 'Tech startup raises funds', source: 'Reuters', link: 'https://reuters.com/1', publishedAt: '2026-03-08T10:00:00Z', summary: 'A tech startup' },
        ],
        fetchedAt: new Date().toISOString(),
      });

      vi.mocked(scoreRelevance).mockReturnValue(0.4);

      const alerted = await checkNewsAlerts(store);

      expect(alerted).toBe(0);
      expect(sendPushToAll).not.toHaveBeenCalled();
    });

    it('should handle news fetch failures gracefully', async () => {
      vi.mocked(getNews).mockRejectedValue(new Error('Network error'));

      const alerted = await checkNewsAlerts(store);

      expect(alerted).toBe(0);
    });

    it('should limit alerts to 3 max per heartbeat', async () => {
      const items = Array.from({ length: 10 }, (_, i) => ({
        title: `Solar News ${i + 1}`,
        source: 'PV Magazine',
        link: `https://pv.com/${i}`,
        publishedAt: '2026-03-08T10:00:00Z',
        summary: `Solar update ${i + 1}`,
      }));

      vi.mocked(getNews).mockResolvedValue({
        items,
        fetchedAt: new Date().toISOString(),
      });

      vi.mocked(scoreRelevance).mockReturnValue(1.0);

      const alerted = await checkNewsAlerts(store);

      expect(alerted).toBeLessThanOrEqual(3);
    });

    it('should not re-alert news items already seen in cache', async () => {
      const newsItem = {
        title: 'Solar Record Broken',
        source: 'PV Magazine',
        link: 'https://pv.com/record',
        publishedAt: '2026-03-08T10:00:00Z',
        summary: 'New efficiency record',
      };

      vi.mocked(getNews).mockResolvedValue({
        items: [newsItem],
        fetchedAt: new Date().toISOString(),
      });
      vi.mocked(scoreRelevance).mockReturnValue(1.0);

      // First call should alert
      const first = await checkNewsAlerts(store);
      expect(first).toBe(1);

      // Second call with same item should NOT alert again
      const second = await checkNewsAlerts(store);
      expect(second).toBe(0);
    });
  });

  // ── Full heartbeat ───────────────────────────────────────────

  describe('runHeartbeat', () => {
    it('should combine reminder check and outreach evaluation', async () => {
      // Due reminder
      const past = new Date(Date.now() - 3600000).toISOString();
      store.addScheduledAction('reminder', 'Overdue task', past, 'high');

      // Context for outreach
      store.addObservation('commitment', 'Call supplier', 1.0, 'told');
      vi.mocked(callClaude).mockResolvedValue('Sir, don\'t forget the supplier call.');

      const result = await runHeartbeat(store);

      expect(result.remindersTriggered).toBe(1);
      expect(result.outreachMessage).toContain('supplier');
      expect(result.timestamp).toBeTruthy();
    });

    it('should return silent heartbeat when nothing happens', async () => {
      const result = await runHeartbeat(store);

      expect(result.remindersTriggered).toBe(0);
      expect(result.outreachMessage).toBeNull();
    });
  });
});
