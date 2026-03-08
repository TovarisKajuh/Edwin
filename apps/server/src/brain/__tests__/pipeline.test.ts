import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Database } from '../../db/database';
import { MemoryStore } from '../../memory/store';

vi.mock('../reasoning', () => ({
  callClaude: vi.fn().mockResolvedValue('Good morning, sir. Let\'s make today count.'),
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
});
