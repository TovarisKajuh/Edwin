import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Database } from '../../../db/database';
import { MemoryStore } from '../../../memory/store';

// Mock the reasoning module so we control Claude's response
vi.mock('../../reasoning', () => ({
  callClaude: vi.fn(),
}));

import { detectPatterns, detectAndStorePatterns } from '../pattern-detector';
import { callClaude } from '../../reasoning';

let store: MemoryStore;

beforeEach(() => {
  vi.clearAllMocks();
  const db = new Database(':memory:');
  store = new MemoryStore(db);
});

describe('Pattern Detector', () => {
  // ── Minimum observations threshold ─────────────────────────────

  it('should return empty when too few observations', async () => {
    store.addObservation('fact', 'Something happened', 0.8, 'observed');
    store.addObservation('fact', 'Another thing', 0.8, 'observed');

    const patterns = await detectPatterns(store, 7);
    expect(patterns).toHaveLength(0);
    expect(callClaude).not.toHaveBeenCalled();
  });

  // ── Pattern parsing ────────────────────────────────────────────

  it('should parse temporal patterns from Claude response', async () => {
    // Add enough observations
    for (let i = 0; i < 6; i++) {
      store.addObservation('fact', `Observation ${i}`, 0.8, 'observed');
    }

    vi.mocked(callClaude).mockResolvedValue(
      'temporal|0.8|Jan tends to skip the gym on Wednesdays\n' +
      'trend|0.7|Jan\'s mood has been improving over the week',
    );

    const patterns = await detectPatterns(store, 7);
    expect(patterns).toHaveLength(2);
    expect(patterns[0].type).toBe('temporal');
    expect(patterns[0].description).toContain('gym');
    expect(patterns[0].confidence).toBe(0.8);
    expect(patterns[1].type).toBe('trend');
  });

  it('should parse causal patterns', async () => {
    for (let i = 0; i < 6; i++) {
      store.addObservation('fact', `Observation ${i}`, 0.8, 'observed');
    }

    vi.mocked(callClaude).mockResolvedValue(
      'causal|0.75|When Jan is stressed he orders Wolt instead of cooking',
    );

    const patterns = await detectPatterns(store, 7);
    expect(patterns).toHaveLength(1);
    expect(patterns[0].type).toBe('causal');
  });

  it('should parse absence patterns', async () => {
    for (let i = 0; i < 6; i++) {
      store.addObservation('fact', `Observation ${i}`, 0.8, 'observed');
    }

    vi.mocked(callClaude).mockResolvedValue(
      'absence|0.6|Jan has not mentioned friends or social plans in over a week',
    );

    const patterns = await detectPatterns(store, 7);
    expect(patterns).toHaveLength(1);
    expect(patterns[0].type).toBe('absence');
  });

  it('should handle NONE response', async () => {
    for (let i = 0; i < 6; i++) {
      store.addObservation('fact', `Observation ${i}`, 0.8, 'observed');
    }

    vi.mocked(callClaude).mockResolvedValue('NONE');

    const patterns = await detectPatterns(store, 7);
    expect(patterns).toHaveLength(0);
  });

  it('should reject low-confidence patterns', async () => {
    for (let i = 0; i < 6; i++) {
      store.addObservation('fact', `Observation ${i}`, 0.8, 'observed');
    }

    vi.mocked(callClaude).mockResolvedValue(
      'temporal|0.3|Maybe something happens on Mondays',
    );

    const patterns = await detectPatterns(store, 7);
    expect(patterns).toHaveLength(0);
  });

  it('should reject malformed lines', async () => {
    for (let i = 0; i < 6; i++) {
      store.addObservation('fact', `Observation ${i}`, 0.8, 'observed');
    }

    vi.mocked(callClaude).mockResolvedValue(
      'This is not a pattern line\n' +
      'temporal|0.8|This is a valid pattern line\n' +
      'invalid|0.8',
    );

    const patterns = await detectPatterns(store, 7);
    expect(patterns).toHaveLength(1);
    expect(patterns[0].type).toBe('temporal');
  });

  it('should reject invalid types', async () => {
    for (let i = 0; i < 6; i++) {
      store.addObservation('fact', `Observation ${i}`, 0.8, 'observed');
    }

    vi.mocked(callClaude).mockResolvedValue(
      'magic|0.8|Some magical pattern',
    );

    const patterns = await detectPatterns(store, 7);
    expect(patterns).toHaveLength(0);
  });

  // ── Deduplication ──────────────────────────────────────────────

  it('should skip patterns similar to existing ones', async () => {
    // Add an existing pattern
    store.addObservation('pattern', 'Jan tends to skip the gym on Wednesdays', 0.8, 'inferred');

    for (let i = 0; i < 6; i++) {
      store.addObservation('fact', `Observation ${i}`, 0.8, 'observed');
    }

    vi.mocked(callClaude).mockResolvedValue(
      'temporal|0.8|Jan tends to skip the gym on Wednesdays\n' +
      'trend|0.7|Jan is sleeping better this week',
    );

    const patterns = await detectPatterns(store, 7);
    expect(patterns).toHaveLength(1);
    expect(patterns[0].description).toContain('sleeping');
  });

  // ── Store integration ──────────────────────────────────────────

  it('should store detected patterns as observations', async () => {
    for (let i = 0; i < 6; i++) {
      store.addObservation('fact', `Observation ${i}`, 0.8, 'observed');
    }

    vi.mocked(callClaude).mockResolvedValue(
      'temporal|0.8|Jan exercises more on weekends\n' +
      'trend|0.7|Jan mood improving throughout the week',
    );

    const count = await detectAndStorePatterns(store, 7);
    expect(count).toBe(2);

    const stored = store.getObservationsByCategory('pattern');
    expect(stored).toHaveLength(2);
    expect(stored[0].source).toBe('inferred');
  });

  it('should not duplicate patterns on repeated runs', async () => {
    for (let i = 0; i < 6; i++) {
      store.addObservation('fact', `Observation ${i}`, 0.8, 'observed');
    }

    vi.mocked(callClaude).mockResolvedValue(
      'temporal|0.8|Jan exercises more on weekends',
    );

    await detectAndStorePatterns(store, 7);
    await detectAndStorePatterns(store, 7);

    const stored = store.getObservationsByCategory('pattern');
    // hasRecentObservation should prevent the duplicate
    expect(stored).toHaveLength(1);
  });

  // ── Uses Haiku model ───────────────────────────────────────────

  it('should use Haiku model for cost efficiency', async () => {
    for (let i = 0; i < 6; i++) {
      store.addObservation('fact', `Observation ${i}`, 0.8, 'observed');
    }

    vi.mocked(callClaude).mockResolvedValue('NONE');

    await detectPatterns(store, 7);

    expect(callClaude).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      expect.objectContaining({ model: 'claude-haiku-4-5-20251001' }),
    );
  });
});
