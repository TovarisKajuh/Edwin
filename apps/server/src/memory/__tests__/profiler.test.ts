import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Database } from '../../db/database';
import { MemoryStore } from '../store';
import { seedJanProfile } from '../seed/jan-profile';

vi.mock('../../brain/reasoning', () => ({
  callClaude: vi.fn(),
}));

import { callClaude } from '../../brain/reasoning';
import { profileObservations } from '../profiler';

const mockedCallClaude = vi.mocked(callClaude);

describe('Profiler (KNOWING system)', () => {
  let db: Database;
  let store: MemoryStore;

  beforeEach(() => {
    db = new Database(':memory:');
    store = new MemoryStore(db);
    seedJanProfile(store);
    vi.clearAllMocks();
  });

  afterEach(() => {
    db.close();
  });

  it('should fan out "skipped the gym" into multiple dimensional insights', async () => {
    mockedCallClaude.mockResolvedValueOnce(JSON.stringify({
      insights: [
        { dimension: 'health', category: 'fact', content: 'Jan missed gym — known pattern of skipping', confidence: 0.85 },
        { dimension: 'accountability', category: 'follow_up', content: 'Ask Jan why he skipped the gym and if he plans to go tomorrow', confidence: 0.8 },
        { dimension: 'goal_alignment', category: 'fact', content: 'Gym skip conflicts with Jan\'s goal of perfect physical shape', confidence: 0.9 },
      ],
    }));

    await profileObservations(store, [
      { category: 'fact', content: 'Jan skipped the gym today' },
    ]);

    const facts = store.getObservationsByCategory('fact');
    const inferred = facts.filter((f) => f.source === 'inferred');
    expect(inferred).toHaveLength(2);
    expect(inferred.map((f) => f.content)).toContain('Jan missed gym — known pattern of skipping');
    expect(inferred.map((f) => f.content)).toContain('Gym skip conflicts with Jan\'s goal of perfect physical shape');

    const followUps = store.getObservationsByCategory('follow_up');
    expect(followUps).toHaveLength(1);
    expect(followUps[0].content).toBe('Ask Jan why he skipped the gym and if he plans to go tomorrow');
    expect(followUps[0].source).toBe('inferred');
  });

  it('should fan out spending into financial and behavioral insights', async () => {
    mockedCallClaude.mockResolvedValueOnce(JSON.stringify({
      insights: [
        { dimension: 'financial', category: 'fact', content: 'Jan spent €80 on food delivery — pattern of wasteful spending', confidence: 0.85 },
        { dimension: 'health', category: 'fact', content: 'Jan is not cooking — relying on delivery', confidence: 0.7 },
        { dimension: 'goal_alignment', category: 'fact', content: 'Wolt spending conflicts with savings goals toward €6M net worth', confidence: 0.8 },
      ],
    }));

    await profileObservations(store, [
      { category: 'fact', content: 'Jan spent €80 on Wolt' },
    ]);

    const facts = store.getObservationsByCategory('fact');
    const inferred = facts.filter((f) => f.source === 'inferred');
    expect(inferred).toHaveLength(3);
  });

  it('should skip non-profilable categories (preferences, emotional_state, follow_up)', async () => {
    await profileObservations(store, [
      { category: 'preference', content: 'Jan prefers morning workouts' },
      { category: 'emotional_state', content: 'Jan seems relaxed' },
      { category: 'follow_up', content: 'Ask about meeting' },
    ]);

    // Claude should never be called for non-profilable observations
    expect(mockedCallClaude).not.toHaveBeenCalled();
  });

  it('should include Jan identity profile in the prompt', async () => {
    mockedCallClaude.mockResolvedValueOnce(JSON.stringify({ insights: [] }));

    await profileObservations(store, [
      { category: 'fact', content: 'Jan skipped the gym' },
    ]);

    expect(mockedCallClaude).toHaveBeenCalledOnce();
    const [, messages] = mockedCallClaude.mock.calls[0];
    const userContent = messages[0].content;

    // Should include identity profile
    expect(userContent).toContain('JAN\'S PROFILE');
    expect(userContent).toContain('gym');  // from habits
    expect(userContent).toContain('€6M');  // from goals
    expect(userContent).toContain('Executive function'); // from personality
  });

  it('should include recent observations for pattern detection', async () => {
    store.addObservation('fact', 'Jan skipped the gym yesterday', 0.9, 'observed');
    store.addObservation('fact', 'Jan ordered Wolt twice this week', 0.85, 'observed');

    mockedCallClaude.mockResolvedValueOnce(JSON.stringify({ insights: [] }));

    await profileObservations(store, [
      { category: 'fact', content: 'Jan skipped the gym again' },
    ]);

    const [, messages] = mockedCallClaude.mock.calls[0];
    const userContent = messages[0].content;
    expect(userContent).toContain('Recent observations');
    expect(userContent).toContain('Jan skipped the gym yesterday');
  });

  it('should deduplicate — not store the same insight twice', async () => {
    // Pre-populate with an existing inferred observation
    store.addObservation('fact', 'Jan missed gym — known pattern', 0.85, 'inferred');

    mockedCallClaude.mockResolvedValueOnce(JSON.stringify({
      insights: [
        { dimension: 'health', category: 'fact', content: 'Jan missed gym — known pattern', confidence: 0.85 },
        { dimension: 'accountability', category: 'follow_up', content: 'Nudge Jan about gym tomorrow', confidence: 0.8 },
      ],
    }));

    await profileObservations(store, [
      { category: 'fact', content: 'Jan skipped the gym' },
    ]);

    const facts = store.getObservationsByCategory('fact');
    const inferred = facts.filter((f) => f.source === 'inferred');
    expect(inferred).toHaveLength(1); // Only the original, not duplicated

    const followUps = store.getObservationsByCategory('follow_up');
    expect(followUps).toHaveLength(1); // New one stored
  });

  it('should handle empty insights gracefully', async () => {
    mockedCallClaude.mockResolvedValueOnce(JSON.stringify({ insights: [] }));

    await profileObservations(store, [
      { category: 'fact', content: 'Jan has a meeting Thursday' },
    ]);

    // No inferred observations stored
    const allObs = db.raw().prepare(
      "SELECT * FROM observations WHERE source = 'inferred'"
    ).all();
    expect(allObs).toHaveLength(0);
  });

  it('should handle malformed JSON from Claude gracefully', async () => {
    mockedCallClaude.mockResolvedValueOnce('Not valid JSON');

    await profileObservations(store, [
      { category: 'fact', content: 'Jan skipped the gym' },
    ]);

    const allObs = db.raw().prepare(
      "SELECT * FROM observations WHERE source = 'inferred'"
    ).all();
    expect(allObs).toHaveLength(0);
  });

  it('should handle Claude API failure gracefully', async () => {
    mockedCallClaude.mockRejectedValueOnce(new Error('API error'));

    await profileObservations(store, [
      { category: 'fact', content: 'Jan skipped the gym' },
    ]);

    const allObs = db.raw().prepare(
      "SELECT * FROM observations WHERE source = 'inferred'"
    ).all();
    expect(allObs).toHaveLength(0);
  });

  it('should skip insights with invalid categories', async () => {
    mockedCallClaude.mockResolvedValueOnce(JSON.stringify({
      insights: [
        { dimension: 'health', category: 'fact', content: 'Valid insight', confidence: 0.8 },
        { dimension: 'mood', category: 'invalid_cat', content: 'Should be skipped', confidence: 0.7 },
        { dimension: 'accountability', category: 'follow_up', content: 'Another valid one', confidence: 0.8 },
      ],
    }));

    await profileObservations(store, [
      { category: 'fact', content: 'Jan skipped the gym' },
    ]);

    const allObs = db.raw().prepare(
      "SELECT * FROM observations WHERE source = 'inferred'"
    ).all();
    expect(allObs).toHaveLength(2); // Only the 2 valid ones
  });

  it('should profile multiple observations in a single Claude call', async () => {
    mockedCallClaude.mockResolvedValueOnce(JSON.stringify({
      insights: [
        { dimension: 'health', category: 'fact', content: 'Gym skipped', confidence: 0.8 },
        { dimension: 'financial', category: 'fact', content: 'Wolt spending pattern', confidence: 0.7 },
      ],
    }));

    await profileObservations(store, [
      { category: 'fact', content: 'Jan skipped the gym' },
      { category: 'commitment', content: 'Jan will call the electrician tomorrow' },
      { category: 'preference', content: 'Jan likes espresso' }, // Should be filtered out
    ]);

    expect(mockedCallClaude).toHaveBeenCalledOnce(); // Single call
    const [, messages] = mockedCallClaude.mock.calls[0];
    const userContent = messages[0].content;
    expect(userContent).toContain('Jan skipped the gym');
    expect(userContent).toContain('Jan will call the electrician');
    expect(userContent).not.toContain('espresso'); // Filtered out before Claude call
  });

  it('should store insights with source=inferred', async () => {
    mockedCallClaude.mockResolvedValueOnce(JSON.stringify({
      insights: [
        { dimension: 'health', category: 'fact', content: 'Gym attendance declining', confidence: 0.75 },
      ],
    }));

    await profileObservations(store, [
      { category: 'fact', content: 'Jan skipped the gym' },
    ]);

    const facts = store.getObservationsByCategory('fact');
    const inferred = facts.filter((f) => f.source === 'inferred');
    expect(inferred).toHaveLength(1);
    expect(inferred[0].source).toBe('inferred');
    expect(inferred[0].confidence).toBe(0.75);
  });
});
