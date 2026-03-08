import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Database } from '../../db/database';
import { MemoryStore } from '../../memory/store';

vi.mock('../reasoning', () => ({
  callClaude: vi.fn().mockResolvedValue('Good morning, sir. Let\'s make today count.'),
  callClaudeWithTools: vi.fn().mockResolvedValue('Good morning, sir. Let\'s make today count.'),
  streamClaudeWithTools: vi.fn().mockResolvedValue('Good morning, sir. Let\'s make today count.'),
}));

vi.mock('../../memory/extractor', () => ({
  extractMemories: vi.fn().mockResolvedValue(undefined),
}));

import { BrainPipeline } from '../pipeline';
import { extractMemories } from '../../memory/extractor';

describe('BrainPipeline', () => {
  let db: Database;
  let store: MemoryStore;
  let pipeline: BrainPipeline;

  beforeEach(() => {
    vi.clearAllMocks();
    db = new Database(':memory:');
    store = new MemoryStore(db);
    pipeline = new BrainPipeline(store);
  });

  afterEach(() => {
    db.close();
  });

  it('process() returns message and conversationId', async () => {
    const result = await pipeline.process('Hello Edwin', 'chat');

    expect(result.message).toBe('Good morning, sir. Let\'s make today count.');
    expect(typeof result.conversationId).toBe('number');
  });

  it('process() stores both jan\'s message and edwin\'s response in conversation history', async () => {
    const result = await pipeline.process('Hello Edwin', 'chat');

    const messages = store.getMessages(result.conversationId);
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('jan');
    expect(messages[0].content).toBe('Hello Edwin');
    expect(messages[1].role).toBe('edwin');
    expect(messages[1].content).toBe('Good morning, sir. Let\'s make today count.');
  });

  it('process() reuses active conversation when one exists for the channel', async () => {
    const result1 = await pipeline.process('First message', 'chat');
    const result2 = await pipeline.process('Second message', 'chat');

    expect(result2.conversationId).toBe(result1.conversationId);

    const messages = store.getMessages(result1.conversationId);
    expect(messages).toHaveLength(4); // 2 pairs of jan + edwin messages
  });

  it('process() triggers memory extraction after responding', async () => {
    await pipeline.process('I have a meeting Friday', 'chat');

    // Give the fire-and-forget promise a tick to resolve
    await new Promise((r) => setTimeout(r, 10));

    expect(extractMemories).toHaveBeenCalledOnce();
    const [passedStore, passedMessages] = vi.mocked(extractMemories).mock.calls[0];
    expect(passedStore).toBe(store);
    expect(passedMessages.length).toBeGreaterThanOrEqual(2);
    expect(passedMessages.some((m: { content: string }) => m.content.includes('meeting Friday'))).toBe(true);
  });

  it('generateBriefing() returns a string', async () => {
    const briefing = await pipeline.generateBriefing();

    expect(typeof briefing).toBe('string');
    expect(briefing).toBe('Good morning, sir. Let\'s make today count.');
  });

  // ── Integration: verify prompt composition ────────────────────

  it('process() passes reasoning brief and tools in system prompt to Claude', async () => {
    // Seed data that should appear in the system prompt
    store.addObservation('emotional_state', 'Jan is stressed about a deadline', 0.8, 'inferred');
    store.addObservation('commitment', 'Call electrician Friday', 1.0, 'told');
    store.addObservation('pattern', 'Jan skips gym on Wednesdays', 0.8, 'inferred');

    const { callClaudeWithTools: mockCallClaude } = await import('../reasoning');

    await pipeline.process('How is my day looking?', 'chat');

    // Verify callClaudeWithTools was called and inspect the system prompt
    expect(mockCallClaude).toHaveBeenCalledOnce();
    const systemPrompt = vi.mocked(mockCallClaude).mock.calls[0][0] as string;

    // System prompt should contain reasoning brief sections
    expect(systemPrompt).toContain('[YOUR CURRENT AWARENESS]');
    expect(systemPrompt).toContain('stressed');
    expect(systemPrompt).toContain('Call electrician');
    expect(systemPrompt).toContain('gym');

    // System prompt should contain tool instructions
    expect(systemPrompt).toContain('[TOOLS]');
    expect(systemPrompt).toContain('remember');
    expect(systemPrompt).toContain('recall');

    // System prompt should contain soul/identity
    expect(systemPrompt).toContain('Edwin');
    expect(systemPrompt).toContain('sir');

    // System prompt should contain speech rules
    expect(systemPrompt).toContain('[SPEECH RULES]');
    expect(systemPrompt).toContain('asterisk');
  });

  it('process() passes conversation history as Claude messages', async () => {
    const { callClaudeWithTools: mockCallClaude } = await import('../reasoning');

    // First message
    await pipeline.process('Hello Edwin', 'chat');

    // Second message in same conversation
    await pipeline.process('What do I have today?', 'chat');

    // Second call should include conversation history
    const secondCallMessages = vi.mocked(mockCallClaude).mock.calls[1][1] as Array<{ role: string; content: string }>;

    // Should have 3 messages: user1, assistant1, user2
    expect(secondCallMessages).toHaveLength(3);
    expect(secondCallMessages[0].role).toBe('user');
    expect(secondCallMessages[0].content).toBe('Hello Edwin');
    expect(secondCallMessages[1].role).toBe('assistant');
    expect(secondCallMessages[2].role).toBe('user');
    expect(secondCallMessages[2].content).toBe('What do I have today?');
  });
});
