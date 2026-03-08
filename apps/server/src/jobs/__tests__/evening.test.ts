import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Database } from '../../db/database';
import { MemoryStore } from '../../memory/store';

vi.mock('../../brain/reasoning', () => ({
  callClaude: vi.fn(),
}));

vi.mock('../../push/push-service', () => ({
  sendPushToAll: vi.fn(() => Promise.resolve(0)),
}));

import { buildEveningContext, formatEveningPrompt, generateEveningMessage, runEveningWindDown } from '../evening';
import { callClaude } from '../../brain/reasoning';

let store: MemoryStore;

beforeEach(() => {
  vi.resetAllMocks();
  const db = new Database(':memory:');
  store = new MemoryStore(db);
});

describe('Evening Wind-down', () => {
  // ── Context Building ───────────────────────────────────────────

  describe('buildEveningContext', () => {
    it('should return basic day info with empty store', () => {
      const ctx = buildEveningContext(store);

      expect(ctx.dayName).toBeTruthy();
      expect(ctx.dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(ctx.todaySummaries).toEqual([]);
      expect(ctx.completedToday).toEqual([]);
      expect(ctx.pendingCommitments).toEqual([]);
      expect(ctx.tomorrowActions).toEqual([]);
      expect(ctx.recentMood).toBeNull();
      expect(ctx.patterns).toEqual([]);
    });

    it('should pull today conversation summaries', () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const convId = store.startConversation('chat');
      store.addMessage(convId, 'jan', 'I finished the proposal');
      store.addMessage(convId, 'edwin', 'Excellent work, sir.');
      store.setConversationSummary(convId, 'Jan finished the client proposal. Brief productive exchange.');

      const ctx = buildEveningContext(store);
      expect(ctx.todaySummaries.some((s) => s.includes('proposal'))).toBe(true);
    });

    it('should pull pending commitments', () => {
      store.addObservation('commitment', 'Call the supplier by Friday', 1.0, 'told');

      const ctx = buildEveningContext(store);
      expect(ctx.pendingCommitments).toHaveLength(1);
      expect(ctx.pendingCommitments[0]).toContain('supplier');
    });

    it('should pull recent mood', () => {
      store.addObservation('emotional_state', 'Jan is tired but satisfied', 0.8, 'observed');

      const ctx = buildEveningContext(store);
      expect(ctx.recentMood).toContain('tired');
    });

    it('should pull evening-relevant patterns', () => {
      store.addObservation('pattern', 'Jan tends to skip evening routine', 0.7, 'inferred');
      store.addObservation('pattern', 'Jan is most productive on Mondays', 0.6, 'inferred');

      const ctx = buildEveningContext(store);
      expect(ctx.patterns.some((p) => p.includes('evening'))).toBe(true);
      // Monday pattern is NOT evening-relevant
      expect(ctx.patterns.some((p) => p.includes('Monday'))).toBe(false);
    });

    it('should pull tomorrow scheduled actions', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().slice(0, 10);

      store.addScheduledAction('reminder', 'Team meeting at 10', `${tomorrowStr}T10:00:00.000Z`, 'medium');

      const ctx = buildEveningContext(store);
      expect(ctx.tomorrowActions.some((a) => a.includes('meeting'))).toBe(true);
    });
  });

  // ── Prompt Formatting ──────────────────────────────────────────

  describe('formatEveningPrompt', () => {
    it('should format basic context', () => {
      const ctx = buildEveningContext(store);
      const prompt = formatEveningPrompt(ctx);

      expect(prompt).toContain('winding down');
    });

    it('should include all sections when data is rich', () => {
      store.addObservation('commitment', 'Finish report', 1.0, 'told');
      store.addObservation('emotional_state', 'Jan is content', 0.8, 'observed');

      const ctx = buildEveningContext(store);
      const prompt = formatEveningPrompt(ctx);

      expect(prompt).toContain('STILL PENDING');
      expect(prompt).toContain('RECENT MOOD');
    });

    it('should omit empty sections', () => {
      const ctx = buildEveningContext(store);
      const prompt = formatEveningPrompt(ctx);

      expect(prompt).not.toContain('COMPLETED');
      expect(prompt).not.toContain('STILL PENDING');
      expect(prompt).not.toContain('TOMORROW');
    });
  });

  // ── Message Generation ─────────────────────────────────────────

  describe('generateEveningMessage', () => {
    it('should call Claude with evening context', async () => {
      store.addObservation('commitment', 'Call the dentist', 1.0, 'told');

      vi.mocked(callClaude).mockResolvedValue(
        'Good evening, sir. A solid day behind you.',
      );

      const message = await generateEveningMessage(store);

      expect(message).toContain('Good evening');
      expect(callClaude).toHaveBeenCalledOnce();

      // System prompt should enforce gentle tone
      const systemPrompt = vi.mocked(callClaude).mock.calls[0][0];
      expect(systemPrompt).toContain('gentle');
      expect(systemPrompt).toContain('NEVER push productivity');
    });

    it('should work with empty context', async () => {
      vi.mocked(callClaude).mockResolvedValue(
        'Good evening, sir. Time to rest.',
      );

      const message = await generateEveningMessage(store);
      expect(message).toBeTruthy();
    });

    it('should use Sonnet (default model)', async () => {
      vi.mocked(callClaude).mockResolvedValue('Good evening, sir.');

      await generateEveningMessage(store);

      const options = vi.mocked(callClaude).mock.calls[0][2];
      expect(options?.model).toBeUndefined(); // defaults to Sonnet
    });
  });

  // ── Full Run ───────────────────────────────────────────────────

  describe('runEveningWindDown', () => {
    it('should generate message and store as notification', async () => {
      vi.mocked(callClaude).mockResolvedValue(
        'Good evening, sir. Rest well tonight.',
      );

      const text = await runEveningWindDown(store);

      expect(text).toContain('Rest well');

      // Should be stored as notification
      const notifications = store.getNotifications(10);
      const found = notifications.find((n) => n.description.includes('Rest well'));
      expect(found).toBeDefined();
    });

    it('should log the message', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      vi.mocked(callClaude).mockResolvedValue('Good evening, sir.');

      await runEveningWindDown(store);

      expect(consoleSpy).toHaveBeenCalledWith('[Evening Wind-down]', 'Good evening, sir.');

      consoleSpy.mockRestore();
    });
  });

  // ── Realistic Scenarios ────────────────────────────────────────

  describe('realistic scenarios', () => {
    it('productive weekday evening', () => {
      // Today's conversation
      const convId = store.startConversation('chat');
      store.addMessage(convId, 'jan', 'Finished the proposal and sent it off');
      store.addMessage(convId, 'edwin', 'Excellent work, sir.');
      store.setConversationSummary(convId, 'Jan completed and submitted the client proposal.');

      // Mood
      store.addObservation('emotional_state', 'Jan is satisfied with today', 0.8, 'observed');

      // Tomorrow action
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      store.addScheduledAction('reminder', 'Follow up with client', `${tomorrow.toISOString().slice(0, 10)}T10:00:00.000Z`, 'medium');

      const ctx = buildEveningContext(store);
      expect(ctx.todaySummaries.length).toBeGreaterThan(0);
      expect(ctx.tomorrowActions.length).toBe(1);
      expect(ctx.recentMood).toContain('satisfied');
    });
  });
});
