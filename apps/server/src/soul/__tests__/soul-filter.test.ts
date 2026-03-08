import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from '../../db/database';
import { MemoryStore } from '../../memory/store';
import { computeSoulDirectives, formatSoulDirectives } from '../soul-filter';

describe('Soul Filter', () => {
  let db: Database;
  let store: MemoryStore;

  beforeEach(() => {
    db = new Database(':memory:');
    store = new MemoryStore(db);
  });

  afterEach(() => {
    db.close();
  });

  // ── Sunday ────────────────────────────────────────────────────

  it('should be gentle on Sunday regardless of other factors', () => {
    store.addObservation('emotional_state', 'Jan is excited and energized', 0.9, 'observed');
    const d = computeSoulDirectives(store, 'morning', 'sunday');

    expect(d.motivationMode).toBe('gentle');
    expect(d.responseStyle).toBe('warm');
    expect(d.suppress).toContain('task reminders');
    expect(d.suppress).toContain('productivity');
  });

  // ── Late Night ────────────────────────────────────────────────

  it('should be gentle and brief at night', () => {
    const d = computeSoulDirectives(store, 'night', 'weekday');

    expect(d.motivationMode).toBe('gentle');
    expect(d.responseStyle).toBe('brief');
    expect(d.suppress).toContain('task reminders');
    expect(d.suppress).toContain('accountability');
  });

  // ── Stressed ──────────────────────────────────────────────────

  it('should switch to encouragement when Jan is stressed', () => {
    store.addObservation('emotional_state', 'Jan seems stressed about the solar contract', 0.8, 'observed');

    const d = computeSoulDirectives(store, 'morning', 'weekday');

    expect(d.motivationMode).toBe('encouragement');
    expect(d.responseStyle).toBe('warm');
    expect(d.suppress).toContain('guilt');
    expect(d.suppress).toContain('competition');
    expect(d.suppress).toContain('accountability');
    expect(d.soulInstruction).toContain('under pressure');
  });

  it('should switch to encouragement when Jan is overwhelmed', () => {
    store.addObservation('emotional_state', 'Jan feels overwhelmed with work', 0.7, 'observed');

    const d = computeSoulDirectives(store, 'afternoon', 'weekday');
    expect(d.motivationMode).toBe('encouragement');
    expect(d.soulInstruction).toContain('pressure');
  });

  // ── Tired ─────────────────────────────────────────────────────

  it('should be gentle and brief when Jan is tired', () => {
    store.addObservation('emotional_state', 'Jan seems tired and low energy', 0.7, 'observed');

    const d = computeSoulDirectives(store, 'afternoon', 'weekday');

    expect(d.motivationMode).toBe('gentle');
    expect(d.responseStyle).toBe('brief');
  });

  // ── Excited + Morning ─────────────────────────────────────────

  it('should use competition mode when Jan is excited and it is morning', () => {
    store.addObservation('emotional_state', 'Jan is excited about a new deal', 0.9, 'observed');

    const d = computeSoulDirectives(store, 'morning', 'weekday');

    expect(d.motivationMode).toBe('competition');
    expect(d.emphasize).toContain('momentum');
  });

  // ── Gym Skips ─────────────────────────────────────────────────

  it('should escalate to accountability after 3+ gym skips', () => {
    store.addObservation('fact', 'Jan skipped the gym today', 0.9, 'observed');
    store.addObservation('fact', 'Jan missed the gym again', 0.85, 'observed');
    store.addObservation('fact', 'Jan didn\'t go to the gym', 0.8, 'observed');

    const d = computeSoulDirectives(store, 'afternoon', 'weekday');

    expect(d.motivationMode).toBe('accountability');
    expect(d.motivationReason).toContain('skipped the gym');
    expect(d.motivationReason).toContain('3');
    expect(d.emphasize).toContain('gym attendance');
  });

  // ── Wolt Orders ───────────────────────────────────────────────

  it('should escalate to accountability after 3+ Wolt orders', () => {
    store.addObservation('fact', 'Jan ordered Wolt for dinner', 0.85, 'observed');
    store.addObservation('fact', 'Jan ordered food delivery again', 0.8, 'observed');
    store.addObservation('fact', 'Jan used Wolt for lunch', 0.8, 'observed');

    const d = computeSoulDirectives(store, 'afternoon', 'weekday');

    expect(d.motivationMode).toBe('accountability');
    expect(d.emphasize).toContain('cooking');
    expect(d.emphasize).toContain('spending habits');
  });

  // ── Morning Default ───────────────────────────────────────────

  it('should use competition mode on weekday morning with no special triggers', () => {
    const d = computeSoulDirectives(store, 'morning', 'weekday');

    expect(d.motivationMode).toBe('competition');
    expect(d.responseStyle).toBe('normal');
  });

  // ── Default ───────────────────────────────────────────────────

  it('should default to encouragement with no triggers', () => {
    const d = computeSoulDirectives(store, 'afternoon', 'weekday');

    expect(d.motivationMode).toBe('encouragement');
    expect(d.responseStyle).toBe('normal');
  });

  // ── Stress overrides gym skips ────────────────────────────────

  it('should prioritize stress over gym skip accountability', () => {
    store.addObservation('emotional_state', 'Jan is stressed about deadlines', 0.8, 'observed');
    store.addObservation('fact', 'Jan skipped the gym', 0.9, 'observed');
    store.addObservation('fact', 'Jan missed the gym again', 0.85, 'observed');
    store.addObservation('fact', 'Jan didn\'t go to the gym', 0.8, 'observed');

    const d = computeSoulDirectives(store, 'morning', 'weekday');

    // Stress should take priority over gym accountability
    expect(d.motivationMode).toBe('encouragement');
    expect(d.suppress).toContain('accountability');
  });

  // ── Format ────────────────────────────────────────────────────

  it('should format directives for prompt injection', () => {
    const d = computeSoulDirectives(store, 'morning', 'weekday');
    const formatted = formatSoulDirectives(d);

    expect(formatted).toContain('[SOUL FILTER — DYNAMIC]');
    expect(formatted).toContain('Motivation mode:');
    expect(formatted).toContain('Why:');
    expect(formatted).toContain('Response style:');
  });

  it('should include suppress and emphasize when present', () => {
    store.addObservation('fact', 'Jan skipped the gym', 0.9, 'observed');
    store.addObservation('fact', 'Jan missed the gym', 0.85, 'observed');
    store.addObservation('fact', 'Jan didn\'t go to the gym', 0.8, 'observed');

    const d = computeSoulDirectives(store, 'afternoon', 'weekday');
    const formatted = formatSoulDirectives(d);

    expect(formatted).toContain('EMPHASIZE');
    expect(formatted).toContain('gym attendance');
  });
});
