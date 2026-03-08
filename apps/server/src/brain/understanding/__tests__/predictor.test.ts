import { describe, it, expect, beforeEach } from 'vitest';
import { Database } from '../../../db/database';
import { MemoryStore } from '../../../memory/store';
import { generatePredictions, formatPredictions } from '../predictor';

let store: MemoryStore;

beforeEach(() => {
  const db = new Database(':memory:');
  store = new MemoryStore(db);
});

describe('Behavioral Predictor', () => {
  // ── Temporal pattern predictions ─────────────────────────────

  it('should predict risk when temporal skip pattern matches today', () => {
    const today = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
    store.addObservation('pattern', `Jan tends to skip the gym on ${today}s`, 0.8, 'inferred');

    const predictions = generatePredictions(store, 'morning', 'weekday');
    const riskPreds = predictions.filter((p) => p.type === 'risk');

    expect(riskPreds.length).toBeGreaterThanOrEqual(1);
    expect(riskPreds[0].description).toContain('skip');
    expect(riskPreds[0].actionable).toBe(true);
  });

  it('should not predict risk when temporal pattern is for a different day', () => {
    // Use a day that is NOT today
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayIdx = new Date().getDay();
    const otherDay = days[(todayIdx + 3) % 7]; // Pick a day 3 away from today

    store.addObservation('pattern', `Jan tends to skip the gym on ${otherDay}s`, 0.8, 'inferred');

    const predictions = generatePredictions(store, 'morning', 'weekday');
    const dayRiskPreds = predictions.filter((p) =>
      p.type === 'risk' && p.source.includes(otherDay),
    );

    expect(dayRiskPreds).toHaveLength(0);
  });

  it('should predict opportunity when positive temporal pattern matches today', () => {
    const today = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
    store.addObservation('pattern', `Jan exercises more on ${today}s`, 0.8, 'inferred');

    const predictions = generatePredictions(store, 'morning', 'weekday');
    const opPreds = predictions.filter((p) => p.description.includes('Opportunity'));

    expect(opPreds.length).toBeGreaterThanOrEqual(1);
  });

  // ── Causal pattern predictions ───────────────────────────────

  it('should predict risk when causal pattern trigger matches current mood', () => {
    store.addObservation('pattern', 'When Jan is stressed, he orders food delivery instead of cooking', 0.75, 'inferred');
    store.addObservation('emotional_state', 'Jan is stressed about a client deadline', 0.8, 'inferred');

    const predictions = generatePredictions(store, 'afternoon', 'weekday');
    const causalPreds = predictions.filter((p) => p.description.includes('Causal risk'));

    expect(causalPreds.length).toBeGreaterThanOrEqual(1);
    expect(causalPreds[0].description).toContain('stressed');
  });

  it('should not predict causal risk when mood does not match trigger', () => {
    store.addObservation('pattern', 'When Jan is stressed, he orders food delivery', 0.75, 'inferred');
    store.addObservation('emotional_state', 'Jan is feeling great and energised', 0.8, 'observed');

    const predictions = generatePredictions(store, 'afternoon', 'weekday');
    const causalPreds = predictions.filter((p) => p.description.includes('Causal risk'));

    expect(causalPreds).toHaveLength(0);
  });

  // ── Meal predictions ─────────────────────────────────────────

  it('should predict meal need during lunch window without food mentions', () => {
    // We can't control the clock, so this test is conditional on time
    const hour = new Date().getHours();
    if (hour < 11 || hour > 14) return; // Only valid during lunch window

    // No food-related observations
    store.addObservation('fact', 'Jan had a meeting this morning', 0.8, 'observed');

    const predictions = generatePredictions(store, 'afternoon', 'weekday');
    const mealPreds = predictions.filter((p) => p.type === 'need');

    expect(mealPreds.length).toBeGreaterThanOrEqual(1);
    expect(mealPreds[0].description).toContain('lunch');
  });

  // ── Commitment risk predictions ──────────────────────────────

  it('should predict commitment risk when skip pattern overlaps with commitment', () => {
    const today = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
    store.addObservation('pattern', `Jan tends to skip the gym on ${today}s`, 0.8, 'inferred');
    store.addObservation('commitment', 'Jan said he would go to the gym today', 1.0, 'told');

    const predictions = generatePredictions(store, 'morning', 'weekday');
    const commitPreds = predictions.filter((p) => p.description.includes('Commitment at risk'));

    expect(commitPreds.length).toBeGreaterThanOrEqual(1);
    expect(commitPreds[0].description).toContain('gym');
  });

  it('should not flag commitment risk when skip pattern is for different activity', () => {
    const today = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
    store.addObservation('pattern', `Jan tends to skip cooking on ${today}s`, 0.8, 'inferred');
    store.addObservation('commitment', 'Jan will call the electrician today', 1.0, 'told');

    const predictions = generatePredictions(store, 'morning', 'weekday');
    const commitPreds = predictions.filter((p) =>
      p.description.includes('Commitment at risk') && p.description.includes('electrician'),
    );

    expect(commitPreds).toHaveLength(0);
  });

  // ── Mood trajectory predictions ──────────────────────────────

  it('should predict declining mood trajectory from pattern', () => {
    store.addObservation('pattern', 'Jan\'s mood has been declining over the week', 0.7, 'inferred');
    store.addObservation('emotional_state', 'Jan seems a bit down', 0.6, 'inferred');

    const predictions = generatePredictions(store, 'afternoon', 'weekday');
    const moodPreds = predictions.filter((p) => p.type === 'mood');

    expect(moodPreds.length).toBeGreaterThanOrEqual(1);
    expect(moodPreds[0].description).toContain('declining');
  });

  it('should predict negative evening when stressed in evening', () => {
    store.addObservation('emotional_state', 'Jan is stressed about tomorrow', 0.8, 'observed');

    const predictions = generatePredictions(store, 'evening', 'weekday');
    const moodPreds = predictions.filter((p) => p.type === 'mood');

    expect(moodPreds.length).toBeGreaterThanOrEqual(1);
    expect(moodPreds[0].description).toContain('evening');
  });

  // ── Filtering and limits ─────────────────────────────────────

  it('should filter out predictions below 0.4 confidence', () => {
    // Very low confidence pattern → prediction confidence will be even lower
    store.addObservation('pattern', 'Jan mood improving this week', 0.5, 'inferred');
    store.addObservation('emotional_state', 'Jan is ok', 0.5, 'inferred');

    const predictions = generatePredictions(store, 'morning', 'weekday');

    // All returned predictions should be >= 0.4
    for (const p of predictions) {
      expect(p.confidence).toBeGreaterThanOrEqual(0.4);
    }
  });

  it('should return at most 5 predictions', () => {
    // Seed lots of patterns that could generate predictions
    const today = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
    for (let i = 0; i < 10; i++) {
      store.addObservation('pattern', `Jan tends to skip activity${i} on ${today}s`, 0.9, 'inferred');
    }

    const predictions = generatePredictions(store, 'morning', 'weekday');
    expect(predictions.length).toBeLessThanOrEqual(5);
  });

  it('should return no pattern-based predictions when no patterns exist', () => {
    const predictions = generatePredictions(store, 'morning', 'weekday');
    const patternBased = predictions.filter((p) => p.type === 'risk' || p.type === 'mood');
    expect(patternBased).toHaveLength(0);
  });

  // ── Formatting ───────────────────────────────────────────────

  it('should format actionable predictions with confidence percentage', () => {
    const preds = [
      { type: 'risk' as const, description: 'Jan may skip gym', confidence: 0.72, actionable: true, source: 'test' },
      { type: 'mood' as const, description: 'Mood improving', confidence: 0.6, actionable: false, source: 'test' },
    ];

    const formatted = formatPredictions(preds);

    expect(formatted).toHaveLength(1); // Only actionable
    expect(formatted[0]).toContain('72%');
    expect(formatted[0]).toContain('Jan may skip gym');
  });

  it('should return empty array when no predictions', () => {
    expect(formatPredictions([])).toHaveLength(0);
  });
});
