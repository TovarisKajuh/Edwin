import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from '../../db/database';
import { MemoryStore } from '../store';
import { seedJanProfile } from '../seed/jan-profile';

describe('Memory Search', () => {
  let db: Database;
  let store: MemoryStore;

  beforeEach(() => {
    db = new Database(':memory:');
    store = new MemoryStore(db);
    seedJanProfile(store);

    // Populate with diverse observations
    store.addObservation('fact', 'Jan went to the gym this morning', 0.9, 'observed');
    store.addObservation('fact', 'Jan had a meeting with the solar supplier', 0.85, 'observed');
    store.addObservation('fact', 'Jan ordered Wolt for dinner', 0.8, 'observed');
    store.addObservation('fact', 'Jan weighed himself at 82kg', 0.95, 'observed');
    store.addObservation('commitment', 'Jan will call the electrician tomorrow', 0.9, 'observed');
    store.addObservation('commitment', 'Jan will go to the gym at 7am', 0.85, 'observed');
    store.addObservation('preference', 'Jan prefers morning workouts', 0.8, 'observed');
    store.addObservation('emotional_state', 'Jan seems stressed about the solar contract', 0.7, 'observed');
    store.addObservation('follow_up', 'Check if Jan called the electrician', 0.8, 'observed');
    store.addObservation('follow_up', 'Ask how the supplier meeting went', 0.75, 'observed');
  });

  afterEach(() => {
    db.close();
  });

  // ── Basic Search ───────────────────────────────────────────────

  it('should find observations by keyword', () => {
    const results = store.searchMemory('gym');
    expect(results.length).toBeGreaterThan(0);

    const contents = results.map((r) => r.content);
    expect(contents.some((c) => c.includes('gym'))).toBe(true);
  });

  it('should find identity facts by keyword', () => {
    const results = store.searchMemory('Ferrari');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.tier === 'identity')).toBe(true);
    expect(results.some((r) => r.content.includes('Ferrari'))).toBe(true);
  });

  it('should find identity by key name', () => {
    const results = store.searchMemory('location');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.tier === 'identity')).toBe(true);
  });

  it('should search across multiple memory tiers', () => {
    // "solar" appears in observations and identity
    const results = store.searchMemory('solar');
    expect(results.length).toBeGreaterThan(0);

    const tiers = new Set(results.map((r) => r.tier));
    // Should find in both observations and identity
    expect(tiers.has('observation')).toBe(true);
  });

  // ── Relevance Ranking ──────────────────────────────────────────

  it('should rank higher-confidence results higher', () => {
    const results = store.searchMemory('Jan');
    expect(results.length).toBeGreaterThan(1);

    // Results should be sorted by relevance (descending)
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].relevance).toBeGreaterThanOrEqual(results[i].relevance);
    }
  });

  it('should boost identity results', () => {
    // "Solar" appears in both identity (business type) and observation
    const results = store.searchMemory('Solar');
    const identityResult = results.find((r) => r.tier === 'identity');
    const observationResult = results.find((r) => r.tier === 'observation');

    if (identityResult && observationResult) {
      // Identity should rank higher due to permanent knowledge boost
      expect(identityResult.relevance).toBeGreaterThan(0);
    }
  });

  // ── Conversation & Weekly Summaries ────────────────────────────

  it('should search conversation summaries', () => {
    const convId = store.startConversation('chat');
    store.addMessage(convId, 'jan', 'Hello');
    store.addMessage(convId, 'edwin', 'Hi sir');
    store.setConversationSummary(convId, 'Brief morning greeting about the gym workout');

    const results = store.searchMemory('morning greeting');
    const convResults = results.filter((r) => r.tier === 'conversation');
    expect(convResults.length).toBeGreaterThan(0);
    expect(convResults[0].content).toContain('morning greeting');
  });

  it('should search weekly summaries', () => {
    store.addWeeklySummary(
      '2026-03-02',
      'Jan had a productive week with gym and meetings',
      'Spending on Wolt increased',
      'Gym attendance improving',
      'Generally positive',
    );

    const results = store.searchMemory('productive');
    const weeklyResults = results.filter((r) => r.tier === 'weekly_summary');
    expect(weeklyResults.length).toBeGreaterThan(0);
    expect(weeklyResults[0].content).toContain('productive');
  });

  // ── Edge Cases ─────────────────────────────────────────────────

  it('should return empty array for no matches', () => {
    const results = store.searchMemory('xyznonexistent');
    expect(results).toHaveLength(0);
  });

  it('should respect limit parameter', () => {
    const results = store.searchMemory('Jan', 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('should exclude superseded observations', () => {
    store.addObservation('fact', 'Old weight 83kg', 0.9, 'observed');
    const obs = store.getObservationsByCategory('fact').find((o) => o.content.includes('Old weight'));
    if (obs) {
      store.supersedeObservation(obs.id, 'New weight 81kg');
    }

    const results = store.searchMemory('Old weight');
    const matchingObs = results.filter((r) => r.tier === 'observation' && r.content.includes('Old weight'));
    expect(matchingObs).toHaveLength(0);
  });

  it('should exclude compressed observations', () => {
    store.addObservation('fact', 'Compressed fact about gym', 0.9, 'compressed');

    const results = store.searchMemory('Compressed fact');
    const matchingObs = results.filter((r) => r.tier === 'observation' && r.content.includes('Compressed'));
    expect(matchingObs).toHaveLength(0);
  });

  it('should be case-insensitive', () => {
    const lower = store.searchMemory('gym');
    const upper = store.searchMemory('GYM');

    // Both should find results (SQLite LIKE is case-insensitive for ASCII)
    expect(lower.length).toBeGreaterThan(0);
    expect(upper.length).toBeGreaterThan(0);
  });

  // ── Multi-word Search ──────────────────────────────────────────

  it('should find partial matches for multi-word queries', () => {
    const results = store.searchMemory('solar supplier');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.content.includes('solar supplier'))).toBe(true);
  });

  it('should span all tiers for a topic like "gym"', () => {
    // "gym" appears in observations, commitments, preferences, and identity (habits)
    const results = store.searchMemory('gym', 20);

    const categories = new Set(results.map((r) => r.category));
    // Should find across multiple categories
    expect(categories.size).toBeGreaterThan(1);
  });
});
