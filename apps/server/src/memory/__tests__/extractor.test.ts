import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Database } from '../../db/database';
import { MemoryStore } from '../store';

// Mock the reasoning module to avoid real API calls
vi.mock('../../brain/reasoning', () => ({
  callClaudeFast: vi.fn(),
}));

import { callClaudeFast } from '../../brain/reasoning';
import { extractMemories } from '../extractor';

const mockedCallClaude = vi.mocked(callClaudeFast);

describe('Memory Extractor', () => {
  let db: Database;
  let store: MemoryStore;

  beforeEach(() => {
    db = new Database(':memory:');
    store = new MemoryStore(db);
    vi.clearAllMocks();
  });

  afterEach(() => {
    db.close();
  });

  it('should extract facts from a conversation and store as observations', async () => {
    mockedCallClaude.mockResolvedValueOnce(JSON.stringify({
      extractions: [
        { category: 'fact', content: 'Jan has a meeting with the solar supplier on Friday', confidence: 0.95 },
        { category: 'commitment', content: 'Jan said he will go to the gym tomorrow', confidence: 0.9 },
      ],
    }));

    const messages = [
      { role: 'jan' as const, content: 'I have a meeting with the solar supplier on Friday. I\'ll go to the gym tomorrow.' },
      { role: 'edwin' as const, content: 'Noted, sir. I\'ll keep that in mind.' },
    ];

    await extractMemories(store, messages);

    const facts = store.getRecentObservations('fact', 1);
    expect(facts).toHaveLength(1);
    expect(facts[0].content).toBe('Jan has a meeting with the solar supplier on Friday');
    expect(facts[0].confidence).toBe(0.95);
    expect(facts[0].source).toBe('observed');

    const commitments = store.getRecentObservations('commitment', 1);
    expect(commitments).toHaveLength(1);
    expect(commitments[0].content).toBe('Jan said he will go to the gym tomorrow');
  });

  it('should extract preferences and emotional states', async () => {
    mockedCallClaude.mockResolvedValueOnce(JSON.stringify({
      extractions: [
        { category: 'preference', content: 'Jan prefers morning workouts', confidence: 0.8 },
        { category: 'emotional_state', content: 'Jan seems stressed about the solar contract', confidence: 0.7 },
      ],
    }));

    const messages = [
      { role: 'jan' as const, content: 'I really prefer working out in the morning. This solar contract is stressing me out.' },
      { role: 'edwin' as const, content: 'Understood, sir.' },
    ];

    await extractMemories(store, messages);

    const prefs = store.getRecentObservations('preference', 1);
    expect(prefs).toHaveLength(1);
    expect(prefs[0].content).toBe('Jan prefers morning workouts');

    const emotions = store.getRecentObservations('emotional_state', 1);
    expect(emotions).toHaveLength(1);
    expect(emotions[0].content).toBe('Jan seems stressed about the solar contract');
  });

  it('should extract follow-up items', async () => {
    mockedCallClaude.mockResolvedValueOnce(JSON.stringify({
      extractions: [
        { category: 'follow_up', content: 'Ask Jan how the client meeting went', confidence: 0.85 },
      ],
    }));

    const messages = [
      { role: 'jan' as const, content: 'I have a big client meeting this afternoon.' },
      { role: 'edwin' as const, content: 'Good luck, sir. You\'ve got this.' },
    ];

    await extractMemories(store, messages);

    const followUps = store.getRecentObservations('follow_up', 1);
    expect(followUps).toHaveLength(1);
    expect(followUps[0].content).toBe('Ask Jan how the client meeting went');
  });

  it('should set correct expiry dates per category', async () => {
    mockedCallClaude.mockResolvedValueOnce(JSON.stringify({
      extractions: [
        { category: 'fact', content: 'Jan weighs 82kg', confidence: 0.95 },
        { category: 'commitment', content: 'Jan will call the electrician', confidence: 0.9 },
        { category: 'preference', content: 'Jan likes espresso', confidence: 0.85 },
        { category: 'emotional_state', content: 'Jan is relaxed', confidence: 0.7 },
        { category: 'follow_up', content: 'Check if Jan called the electrician', confidence: 0.8 },
      ],
    }));

    const messages = [
      { role: 'jan' as const, content: 'test message' },
      { role: 'edwin' as const, content: 'test response' },
    ];

    await extractMemories(store, messages);

    // Verify observations exist with expiry dates
    const allObs = db.raw().prepare(
      'SELECT category, expires_at FROM observations ORDER BY id'
    ).all() as { category: string; expires_at: string | null }[];

    expect(allObs).toHaveLength(5);

    // Fact: 90 days
    const fact = allObs.find(o => o.category === 'fact')!;
    expect(fact.expires_at).not.toBeNull();
    const factExpiry = new Date(fact.expires_at!);
    const now = new Date();
    const factDays = Math.round((factExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expect(factDays).toBeGreaterThanOrEqual(89);
    expect(factDays).toBeLessThanOrEqual(91);

    // Commitment: 14 days
    const commitment = allObs.find(o => o.category === 'commitment')!;
    const commitExpiry = new Date(commitment.expires_at!);
    const commitDays = Math.round((commitExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expect(commitDays).toBeGreaterThanOrEqual(13);
    expect(commitDays).toBeLessThanOrEqual(15);

    // Preference: 180 days
    const preference = allObs.find(o => o.category === 'preference')!;
    const prefExpiry = new Date(preference.expires_at!);
    const prefDays = Math.round((prefExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expect(prefDays).toBeGreaterThanOrEqual(179);
    expect(prefDays).toBeLessThanOrEqual(181);

    // Emotional state: 1 day
    const emotion = allObs.find(o => o.category === 'emotional_state')!;
    const emotionExpiry = new Date(emotion.expires_at!);
    const emotionDays = Math.round((emotionExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expect(emotionDays).toBeGreaterThanOrEqual(0);
    expect(emotionDays).toBeLessThanOrEqual(2);

    // Follow-up: 14 days
    const followUp = allObs.find(o => o.category === 'follow_up')!;
    const followExpiry = new Date(followUp.expires_at!);
    const followDays = Math.round((followExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expect(followDays).toBeGreaterThanOrEqual(13);
    expect(followDays).toBeLessThanOrEqual(15);
  });

  it('should handle empty extractions gracefully', async () => {
    mockedCallClaude.mockResolvedValueOnce(JSON.stringify({
      extractions: [],
    }));

    const messages = [
      { role: 'jan' as const, content: 'Hi' },
      { role: 'edwin' as const, content: 'Hello, sir.' },
    ];

    await extractMemories(store, messages);

    const allObs = db.raw().prepare('SELECT * FROM observations').all();
    expect(allObs).toHaveLength(0);
  });

  it('should handle malformed JSON from Claude gracefully', async () => {
    mockedCallClaude.mockResolvedValueOnce('This is not valid JSON');

    const messages = [
      { role: 'jan' as const, content: 'Hello' },
      { role: 'edwin' as const, content: 'Hi sir.' },
    ];

    // Should not throw
    await extractMemories(store, messages);

    const allObs = db.raw().prepare('SELECT * FROM observations').all();
    expect(allObs).toHaveLength(0);
  });

  it('should handle Claude API failure gracefully', async () => {
    mockedCallClaude.mockRejectedValueOnce(new Error('API error'));

    const messages = [
      { role: 'jan' as const, content: 'Hello' },
      { role: 'edwin' as const, content: 'Hi sir.' },
    ];

    // Should not throw
    await extractMemories(store, messages);

    const allObs = db.raw().prepare('SELECT * FROM observations').all();
    expect(allObs).toHaveLength(0);
  });

  it('should skip extractions with invalid categories', async () => {
    mockedCallClaude.mockResolvedValueOnce(JSON.stringify({
      extractions: [
        { category: 'fact', content: 'Valid extraction', confidence: 0.9 },
        { category: 'invalid_category', content: 'This should be skipped', confidence: 0.8 },
        { category: 'commitment', content: 'Another valid one', confidence: 0.85 },
      ],
    }));

    const messages = [
      { role: 'jan' as const, content: 'test' },
      { role: 'edwin' as const, content: 'test' },
    ];

    await extractMemories(store, messages);

    const allObs = db.raw().prepare('SELECT * FROM observations').all();
    expect(allObs).toHaveLength(2); // Only the 2 valid ones
  });

  it('should deduplicate — not store the same observation twice', async () => {
    // First extraction
    mockedCallClaude.mockResolvedValueOnce(JSON.stringify({
      extractions: [
        { category: 'fact', content: 'Jan weighs 82kg', confidence: 0.9 },
      ],
    }));

    const messages = [
      { role: 'jan' as const, content: 'I weigh 82kg' },
      { role: 'edwin' as const, content: 'Noted, sir.' },
    ];

    await extractMemories(store, messages);

    // Second extraction with same content
    mockedCallClaude.mockResolvedValueOnce(JSON.stringify({
      extractions: [
        { category: 'fact', content: 'Jan weighs 82kg', confidence: 0.95 },
      ],
    }));

    await extractMemories(store, messages);

    const facts = store.getRecentObservations('fact', 1);
    expect(facts).toHaveLength(1); // Only one, not two
  });

  it('should pass conversation messages to Claude in the right format', async () => {
    mockedCallClaude.mockResolvedValueOnce(JSON.stringify({ extractions: [] }));

    const messages = [
      { role: 'jan' as const, content: 'I weigh 82kg now.' },
      { role: 'edwin' as const, content: 'Noted, sir.' },
      { role: 'jan' as const, content: 'And I have a meeting at 3pm.' },
      { role: 'edwin' as const, content: 'I\'ll remind you.' },
    ];

    await extractMemories(store, messages);

    // Verify Claude was called with proper system prompt and conversation content
    expect(mockedCallClaude).toHaveBeenCalledOnce();
    const [systemPrompt, claudeMessages] = mockedCallClaude.mock.calls[0];

    expect(systemPrompt).toContain('extract structured facts');
    expect(claudeMessages).toHaveLength(1);
    expect(claudeMessages[0].role).toBe('user');
    expect(claudeMessages[0].content).toContain('I weigh 82kg now.');
    expect(claudeMessages[0].content).toContain('And I have a meeting at 3pm.');

    // Verify it uses the fast model (callClaudeFast), not callClaude
    expect(mockedCallClaude).toHaveBeenCalledOnce();
  });
});
