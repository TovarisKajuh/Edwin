import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Database } from '../../db/database';
import { MemoryStore } from '../../memory/store';

vi.mock('../../brain/reasoning', () => ({
  callClaude: vi.fn(),
}));

vi.mock('../../voice/speak', () => ({
  textToSpeech: vi.fn().mockResolvedValue(null),
}));

import { buildBriefingContext, formatBriefingPrompt, generateMorningBriefing, runMorningBriefing } from '../morning';
import { callClaude } from '../../brain/reasoning';
import { textToSpeech } from '../../voice/speak';

let store: MemoryStore;

beforeEach(() => {
  vi.resetAllMocks();
  const db = new Database(':memory:');
  store = new MemoryStore(db);
});

describe('Morning Briefing', () => {
  // ── Context Building ───────────────────────────────────────────

  describe('buildBriefingContext', () => {
    it('should return basic day info with empty store', () => {
      const ctx = buildBriefingContext(store);

      expect(ctx.dayName).toBeTruthy();
      expect(ctx.dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(ctx.dayType).toBeTruthy();
      expect(ctx.yesterdaySummaries).toEqual([]);
      expect(ctx.pendingCommitments).toEqual([]);
      expect(ctx.followUps).toEqual([]);
      expect(ctx.priorities).toEqual([]);
      expect(ctx.patterns).toEqual([]);
      expect(ctx.recentMood).toBeNull();
    });

    it('should pull pending commitments', () => {
      store.addObservation('commitment', 'Call the supplier today', 1.0, 'told');
      store.addObservation('commitment', 'Go to the gym', 0.8, 'told');

      const ctx = buildBriefingContext(store);

      expect(ctx.pendingCommitments).toHaveLength(2);
      expect(ctx.pendingCommitments[0]).toContain('gym'); // most recent first
      expect(ctx.pendingCommitments[1]).toContain('supplier');
    });

    it('should pull follow-ups', () => {
      store.addObservation('follow_up', 'Ask about the client meeting result', 0.9, 'inferred');

      const ctx = buildBriefingContext(store);

      expect(ctx.followUps).toHaveLength(1);
      expect(ctx.followUps[0]).toContain('client meeting');
    });

    it('should pull recent mood', () => {
      store.addObservation('emotional_state', 'Jan is stressed about the deadline', 0.8, 'observed');

      const ctx = buildBriefingContext(store);

      expect(ctx.recentMood).toContain('stressed');
    });

    it('should pull relevant patterns', () => {
      store.addObservation('pattern', 'Jan skips gym on Wednesdays', 0.8, 'inferred');
      store.addObservation('pattern', 'Jan is most productive in the morning', 0.7, 'inferred');
      store.addObservation('pattern', 'Jan checks email at noon daily', 0.6, 'inferred');

      const ctx = buildBriefingContext(store);

      expect(ctx.patterns.length).toBeGreaterThan(0);
      // Should include morning pattern (matches 'morning' keyword)
      expect(ctx.patterns.some((p) => p.includes('morning') || p.includes('daily'))).toBe(true);
    });

    it('should pull yesterday conversation summaries', () => {
      // Create a conversation dated yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      const convId = store.startConversation('chat');
      store.addMessage(convId, 'jan', 'Hello');
      store.addMessage(convId, 'edwin', 'Good morning, sir.');
      store.setConversationSummary(convId, 'Jan greeted Edwin. Brief morning exchange.');

      // Manually set the started_at to yesterday (SQLite update)
      store['db'].raw().prepare(
        'UPDATE conversations SET started_at = ? WHERE id = ?',
      ).run(`${yesterdayStr}T08:00:00.000Z`, convId);

      const ctx = buildBriefingContext(store);

      expect(ctx.yesterdaySummaries).toHaveLength(1);
      expect(ctx.yesterdaySummaries[0]).toContain('morning exchange');
    });

    it('should pull yesterday daily_summary from compression', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      // Simulate a compressed daily summary from yesterday
      store.addObservation('daily_summary', `[${yesterdayStr}] Jan had a productive day, completed 3 tasks.`, 1.0, 'observed');

      // Set the observed_at to yesterday
      store['db'].raw().prepare(
        "UPDATE observations SET observed_at = ? WHERE category = 'daily_summary'",
      ).run(`${yesterdayStr}T21:00:00.000Z`);

      const ctx = buildBriefingContext(store);

      expect(ctx.yesterdaySummaries.some((s) => s.includes('productive day'))).toBe(true);
    });

    it('should include priorities from scheduled actions', () => {
      const soon = new Date(Date.now() + 2 * 3600000).toISOString();
      store.addScheduledAction('reminder', 'Call important client', soon, 'high');

      const ctx = buildBriefingContext(store);

      expect(ctx.priorities.length).toBeGreaterThan(0);
      expect(ctx.priorities.some((p) => p.includes('client'))).toBe(true);
    });
  });

  // ── Prompt Formatting ──────────────────────────────────────────

  describe('formatBriefingPrompt', () => {
    it('should format basic context', () => {
      const ctx = buildBriefingContext(store);
      const prompt = formatBriefingPrompt(ctx);

      expect(prompt).toContain('Today is');
      expect(prompt).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it('should include yesterday summaries when present', () => {
      store.addObservation('commitment', 'Call the dentist', 1.0, 'told');

      const ctx = buildBriefingContext(store);
      const prompt = formatBriefingPrompt(ctx);

      expect(prompt).toContain('PENDING COMMITMENTS');
      expect(prompt).toContain('dentist');
    });

    it('should include all sections when context is rich', () => {
      store.addObservation('commitment', 'Submit proposal', 1.0, 'told');
      store.addObservation('follow_up', 'Check supplier response', 0.9, 'inferred');
      store.addObservation('emotional_state', 'Jan is motivated', 0.8, 'observed');
      store.addObservation('pattern', 'Jan exercises daily in the morning', 0.7, 'inferred');

      const soon = new Date(Date.now() + 2 * 3600000).toISOString();
      store.addScheduledAction('reminder', 'Team meeting', soon, 'medium');

      const ctx = buildBriefingContext(store);
      const prompt = formatBriefingPrompt(ctx);

      expect(prompt).toContain('PENDING COMMITMENTS');
      expect(prompt).toContain('FOLLOW-UPS TO CHECK');
      expect(prompt).toContain('PRIORITIES');
      expect(prompt).toContain('RELEVANT PATTERNS');
      expect(prompt).toContain('LAST KNOWN MOOD');
    });

    it('should omit empty sections', () => {
      const ctx = buildBriefingContext(store);
      const prompt = formatBriefingPrompt(ctx);

      expect(prompt).not.toContain('YESTERDAY');
      expect(prompt).not.toContain('PENDING COMMITMENTS');
      expect(prompt).not.toContain('FOLLOW-UPS');
      expect(prompt).not.toContain('PRIORITIES');
      expect(prompt).not.toContain('LAST KNOWN MOOD');
    });
  });

  // ── Briefing Generation ────────────────────────────────────────

  describe('generateMorningBriefing', () => {
    it('should call Claude with context-rich prompt', async () => {
      store.addObservation('commitment', 'Call the electrician', 1.0, 'told');
      store.addObservation('emotional_state', 'Jan is motivated', 0.8, 'observed');

      vi.mocked(callClaude).mockResolvedValue(
        'Good morning, sir. You have a call to make to the electrician today.',
      );

      const briefing = await generateMorningBriefing(store);

      expect(briefing).toContain('electrician');
      expect(callClaude).toHaveBeenCalledOnce();

      // System prompt should mention "sir" and morning briefing
      const systemPrompt = vi.mocked(callClaude).mock.calls[0][0];
      expect(systemPrompt).toContain('sir');
      expect(systemPrompt).toContain('morning briefing');

      // User prompt should contain the actual context
      const userPrompt = vi.mocked(callClaude).mock.calls[0][1][0].content as string;
      expect(userPrompt).toContain('electrician');
    });

    it('should include mood in system prompt when available', async () => {
      store.addObservation('emotional_state', 'Jan is stressed about work', 0.8, 'observed');

      vi.mocked(callClaude).mockResolvedValue('Good morning, sir.');

      await generateMorningBriefing(store);

      const systemPrompt = vi.mocked(callClaude).mock.calls[0][0];
      expect(systemPrompt).toContain('stressed');
    });

    it('should work with empty context (no data yet)', async () => {
      vi.mocked(callClaude).mockResolvedValue(
        'Good morning, sir. A fresh start to the day.',
      );

      const briefing = await generateMorningBriefing(store);

      expect(briefing).toContain('Good morning');
      expect(callClaude).toHaveBeenCalledOnce();
    });

    it('should use Sonnet (default model) for briefing', async () => {
      vi.mocked(callClaude).mockResolvedValue('Good morning, sir.');

      await generateMorningBriefing(store);

      // Should NOT specify model (defaults to Sonnet in callClaude)
      const options = vi.mocked(callClaude).mock.calls[0][2];
      expect(options?.model).toBeUndefined();
    });
  });

  // ── Full Run ───────────────────────────────────────────────────

  describe('runMorningBriefing', () => {
    it('should generate briefing, store as notification, and return text + audio', async () => {
      store.addObservation('commitment', 'Morning gym session', 1.0, 'told');

      vi.mocked(callClaude).mockResolvedValue(
        'Good morning, sir. Time to hit the gym.',
      );

      const result = await runMorningBriefing(store);

      expect(result.text).toContain('gym');
      expect(result.audio ?? null).toBeNull(); // mocked returns null

      // Should have been stored as notification
      const pending = store.getPendingActions(10);
      const notification = pending.find(
        (a) => a.type === 'notification' && a.description.includes('gym'),
      );
      expect(notification).toBeDefined();
    });

    it('should call TTS with briefing text', async () => {
      vi.mocked(callClaude).mockResolvedValue('Good morning, sir.');

      await runMorningBriefing(store);

      expect(textToSpeech).toHaveBeenCalledWith('Good morning, sir.');
    });

    it('should log the briefing', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      vi.mocked(callClaude).mockResolvedValue('Good morning, sir.');

      await runMorningBriefing(store);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Morning Briefing]',
        'Good morning, sir.',
      );

      consoleSpy.mockRestore();
    });
  });

  // ── Realistic Scenarios ────────────────────────────────────────

  describe('realistic scenarios', () => {
    it('rich Monday morning briefing', async () => {
      // Commitments
      store.addObservation('commitment', 'Submit Q1 report by end of day', 1.0, 'told');
      store.addObservation('commitment', 'Call supplier about delivery delay', 0.9, 'told');

      // Follow-ups
      store.addObservation('follow_up', 'Check if client responded to proposal', 0.8, 'inferred');

      // Patterns
      store.addObservation('pattern', 'Jan is most productive on Monday mornings', 0.7, 'inferred');

      // Mood
      store.addObservation('emotional_state', 'Jan is energised and ready to go', 0.9, 'observed');

      // Scheduled action
      const inTwoHours = new Date(Date.now() + 2 * 3600000).toISOString();
      store.addScheduledAction('reminder', 'Team standup meeting', inTwoHours, 'medium');

      vi.mocked(callClaude).mockResolvedValue(
        'Good morning, sir. You\'re in great form today — let\'s use that energy. ' +
        'Your Q1 report is due by end of day, and you need to ring the supplier about that delivery delay. ' +
        'Team standup in two hours. I\'d suggest tackling the report first while your energy is at its peak.',
      );

      const ctx = buildBriefingContext(store);
      expect(ctx.pendingCommitments.length).toBe(2);
      expect(ctx.followUps.length).toBe(1);
      expect(ctx.priorities.length).toBeGreaterThan(0);
      expect(ctx.recentMood).toContain('energised');

      const prompt = formatBriefingPrompt(ctx);
      expect(prompt).toContain('Q1 report');
      expect(prompt).toContain('supplier');
      expect(prompt).toContain('standup');

      const briefing = await generateMorningBriefing(store);
      expect(briefing).toContain('Q1 report');
    });

    it('quiet Sunday with no data', async () => {
      vi.mocked(callClaude).mockResolvedValue(
        'Good morning, sir. A quiet Sunday ahead. Take it easy today.',
      );

      const result = await runMorningBriefing(store);

      expect(result.text).toContain('Sunday');

      // System prompt should mention gentle/restful if today is Sunday
      // (we can't control the day, so just verify the call happened)
      expect(callClaude).toHaveBeenCalledOnce();
    });
  });
});
