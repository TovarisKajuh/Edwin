import { describe, it, expect, vi } from 'vitest';
import { interpretContext, formatContextInterpretation } from '../context-interpreter';
import { MemoryStore } from '../../../memory/store';

// Mock store that returns configurable recent messages
function mockStore(janMessages: string[] = []): MemoryStore {
  const store = {
    getRecentMessages: vi.fn().mockReturnValue(
      janMessages.map((content, i) => ({
        id: i + 1,
        conversation_id: 1,
        role: 'jan',
        content,
        timestamp: new Date().toISOString(),
      })),
    ),
  } as unknown as MemoryStore;
  return store;
}

// Helper: build conversation history
function history(messages: [string, string][]): { role: string; content: string }[] {
  return messages.map(([role, content]) => ({ role, content }));
}

describe('Context Interpreter', () => {
  // ── Deflection Detection ────────────────────────────────────────

  describe('deflection', () => {
    it('should detect "fine" after a question as deflection', () => {
      const result = interpretContext(
        'fine',
        history([['edwin', 'How was your meeting today?']]),
        mockStore(),
      );
      expect(result.signal).toBe('deflecting');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect "ok" after a question as deflection', () => {
      const result = interpretContext(
        'ok',
        history([['edwin', 'Did you manage to call the supplier?']]),
        mockStore(),
      );
      expect(result.signal).toBe('deflecting');
    });

    it('should detect "whatever" as deflection', () => {
      const result = interpretContext(
        'whatever',
        history([['edwin', 'What do you think about the proposal?']]),
        mockStore(),
      );
      expect(result.signal).toBe('deflecting');
    });

    it('should NOT flag "fine" when Edwin did not ask a question', () => {
      const result = interpretContext(
        'fine',
        history([['edwin', 'Good morning, sir.']]),
        mockStore(),
      );
      expect(result.signal).not.toBe('deflecting');
    });

    it('should NOT flag "fine" with no conversation history', () => {
      const result = interpretContext('fine', [], mockStore());
      expect(result.signal).not.toBe('deflecting');
    });
  });

  // ── Venting Detection ──────────────────────────────────────────

  describe('venting', () => {
    it('should detect long emotional message as venting', () => {
      const vent = 'I swear this client is the worst person I have ever dealt with in my entire career and every time I send an email they come back with something completely unreasonable and I just cannot believe they keep doing this';
      const result = interpretContext(vent, [], mockStore());
      expect(result.signal).toBe('venting');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should NOT flag short emotional message as venting', () => {
      const result = interpretContext('I can\'t believe this', [], mockStore());
      expect(result.signal).not.toBe('venting');
    });

    it('should NOT flag long message without emotional words as venting', () => {
      const longMsg = 'Today I went to the office and had a meeting with the supplier then I drove to the warehouse and checked the inventory and after that I came home and made dinner and now I am relaxing on the couch';
      const result = interpretContext(longMsg, [], mockStore());
      expect(result.signal).not.toBe('venting');
    });
  });

  // ── Engagement Detection ───────────────────────────────────────

  describe('engagement', () => {
    // Baseline of ~10 words per message
    const baselineMessages = [
      'I went to the gym this morning',
      'The meeting was fine nothing special',
      'I need to call the supplier tomorrow',
      'Had lunch at the new Italian place',
    ];

    it('should detect disengagement when replies are much shorter than baseline', () => {
      const result = interpretContext(
        'yeah',
        history([['edwin', 'Good morning, sir.']]),
        mockStore(baselineMessages),
      );
      expect(result.signal).toBe('disengaged');
    });

    it('should detect high engagement when replies are much longer than baseline', () => {
      const longReply = 'So I have been thinking about this all day and I really believe we should pivot the entire approach because the current strategy is not working and here is what I propose instead we focus on the direct sales channel and cut out the middleman entirely which would give us better margins and more control';
      const result = interpretContext(longReply, [], mockStore(baselineMessages));
      expect(result.signal).toBe('engaged');
    });

    it('should return normal when no baseline data exists', () => {
      const result = interpretContext(
        'hey',
        [],
        mockStore([]), // no messages = no baseline
      );
      expect(result.signal).toBe('normal');
    });

    it('should return normal when too few messages for baseline', () => {
      const result = interpretContext(
        'hey',
        [],
        mockStore(['one message', 'two messages']), // only 2, need 3
      );
      expect(result.signal).toBe('normal');
    });
  });

  // ── Topic Avoidance Detection ──────────────────────────────────

  describe('avoidance', () => {
    it('should detect topic change as avoidance', () => {
      const result = interpretContext(
        'I saw a great movie yesterday about space travel',
        history([['edwin', 'How did the budget review meeting go, sir?']]),
        mockStore(),
      );
      expect(result.signal).toBe('avoidant');
    });

    it('should NOT flag avoidance when reply addresses the question topic', () => {
      const result = interpretContext(
        'The budget review went well, we are on track',
        history([['edwin', 'How did the budget review meeting go, sir?']]),
        mockStore(),
      );
      expect(result.signal).not.toBe('avoidant');
    });

    it('should NOT flag avoidance for short replies (handled by deflection)', () => {
      const result = interpretContext(
        'good',
        history([['edwin', 'How did the budget review go?']]),
        mockStore(),
      );
      // Short reply after a question = deflecting, not avoidant
      expect(result.signal).not.toBe('avoidant');
    });
  });

  // ── Normal Signal ──────────────────────────────────────────────

  describe('normal', () => {
    it('should return normal for regular conversation', () => {
      const result = interpretContext(
        'I have a meeting at 3pm today',
        history([['edwin', 'Good afternoon, sir.']]),
        mockStore(),
      );
      expect(result.signal).toBe('normal');
      expect(result.confidence).toBe(1.0);
    });

    it('should return normal with empty history', () => {
      const result = interpretContext('Hey Edwin', [], mockStore());
      expect(result.signal).toBe('normal');
    });
  });

  // ── Format ─────────────────────────────────────────────────────

  describe('formatContextInterpretation', () => {
    it('should return null for normal signal', () => {
      expect(formatContextInterpretation({
        signal: 'normal',
        confidence: 1.0,
        note: '',
      })).toBeNull();
    });

    it('should return formatted string for non-normal signal', () => {
      const result = formatContextInterpretation({
        signal: 'deflecting',
        confidence: 0.75,
        note: 'Jan gave a minimal response to a question — might be deflecting.',
      });
      expect(result).toBe('[CONTEXT SIGNAL] Jan gave a minimal response to a question — might be deflecting.');
    });

    it('should include CONTEXT SIGNAL prefix', () => {
      const result = formatContextInterpretation({
        signal: 'venting',
        confidence: 0.8,
        note: 'Jan is venting.',
      });
      expect(result).toContain('[CONTEXT SIGNAL]');
    });
  });
});
