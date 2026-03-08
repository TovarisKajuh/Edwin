import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from '../../db/database';
import { MemoryStore } from '../store';
import { seedJanProfile } from '../seed/jan-profile';

describe('MemoryStore', () => {
  let db: Database;
  let store: MemoryStore;

  beforeEach(() => {
    db = new Database(':memory:');
    store = new MemoryStore(db);
  });

  afterEach(() => {
    db.close();
  });

  // ── Identity ─────────────────────────────────────────────────────

  it('should setIdentity and getIdentity', () => {
    store.setIdentity('personal', 'location', 'Austria', 'told', 1.0);

    const row = store.getIdentity('personal', 'location');
    expect(row).toBeDefined();
    expect(row!.value).toBe('Austria');
    expect(row!.source).toBe('told');
    expect(row!.confidence).toBe(1.0);
  });

  it('should upsert on setIdentity (update existing key)', () => {
    store.setIdentity('personal', 'location', 'Graz', 'told', 1.0);
    store.setIdentity('personal', 'location', 'Vienna', 'told', 0.9);

    const row = store.getIdentity('personal', 'location');
    expect(row).toBeDefined();
    expect(row!.value).toBe('Vienna');
    expect(row!.confidence).toBe(0.9);
  });

  it('should getIdentityCategory returning all facts in a category', () => {
    store.setIdentity('goals', 'net_worth', '€6M', 'told');
    store.setIdentity('goals', 'car', 'Ferrari', 'told');
    store.setIdentity('personal', 'location', 'Austria', 'told');

    const goals = store.getIdentityCategory('goals');
    expect(goals).toHaveLength(2);
    expect(goals.map(r => r.key)).toContain('net_worth');
    expect(goals.map(r => r.key)).toContain('car');
  });

  // ── Observations ─────────────────────────────────────────────────

  it('should addObservation and getRecentObservations', () => {
    store.addObservation('mood', 'Jan seemed tired', 0.8, 'observed');
    store.addObservation('mood', 'Jan was energetic', 0.6, 'observed');

    const recent = store.getRecentObservations('mood', 7);
    expect(recent).toHaveLength(2);
    expect(recent[0].content).toBe('Jan was energetic');
    expect(recent[1].content).toBe('Jan seemed tired');
  });

  // ── Active Observations ─────────────────────────────────────────

  it('should getActiveObservations returning all observations', () => {
    store.addObservation('fact', 'Fact one', 0.9, 'observed');
    store.addObservation('fact', 'Fact two', 0.9, 'observed');
    store.addObservation('commitment', 'Go to gym', 0.9, 'observed');

    const active = store.getActiveObservations();
    expect(active).toHaveLength(3);
  });

  it('should getObservationsByCategory', () => {
    store.addObservation('commitment', 'Go to gym', 0.9, 'observed');
    store.addObservation('fact', 'Weighs 82kg', 0.9, 'observed');
    store.addObservation('commitment', 'Call electrician', 0.9, 'observed');

    const commitments = store.getObservationsByCategory('commitment');
    expect(commitments).toHaveLength(2);
    expect(commitments.map(o => o.content)).toContain('Go to gym');
    expect(commitments.map(o => o.content)).toContain('Call electrician');
  });

  // ── Deduplication ───────────────────────────────────────────────

  it('should detect existing observations with hasRecentObservation', () => {
    store.addObservation('fact', 'Jan weighs 82kg', 0.9, 'observed');

    expect(store.hasRecentObservation('fact', 'Jan weighs 82kg')).toBe(true);
    expect(store.hasRecentObservation('fact', 'Jan weighs 81kg')).toBe(false);
    expect(store.hasRecentObservation('commitment', 'Jan weighs 82kg')).toBe(false);
  });

  // ── Memory Snapshot ──────────────────────────────────────────────

  it('should buildMemorySnapshot with identity section', () => {
    store.setIdentity('personal', 'location', 'Austria', 'told');
    store.setIdentity('goals', 'car', 'Ferrari', 'told');

    const snapshot = store.buildMemorySnapshot();

    expect(snapshot).toContain('=== IDENTITY ===');
    expect(snapshot).toContain('[goals]');
    expect(snapshot).toContain('car: Ferrari');
    expect(snapshot).toContain('[personal]');
    expect(snapshot).toContain('location: Austria');
  });

  it('should buildMemorySnapshot with prioritized observations', () => {
    store.addObservation('commitment', 'Jan will go to the gym tomorrow', 0.9, 'observed');
    store.addObservation('follow_up', 'Ask about the meeting', 0.8, 'observed');
    store.addObservation('emotional_state', 'Jan seems stressed', 0.7, 'observed');
    store.addObservation('fact', 'Jan has a supplier meeting Friday', 0.95, 'observed');
    store.addObservation('preference', 'Jan prefers morning workouts', 0.85, 'observed');

    const snapshot = store.buildMemorySnapshot();

    expect(snapshot).toContain('=== WHAT YOU REMEMBER ===');
    expect(snapshot).toContain('Active commitments from Jan:');
    expect(snapshot).toContain('Jan will go to the gym tomorrow');
    expect(snapshot).toContain('Things to follow up on:');
    expect(snapshot).toContain('Ask about the meeting');
    expect(snapshot).toContain("Jan's recent mood: Jan seems stressed");
    expect(snapshot).toContain('Recent things Jan mentioned:');
    expect(snapshot).toContain('Jan has a supplier meeting Friday');
    expect(snapshot).toContain('Known preferences:');
    expect(snapshot).toContain('Jan prefers morning workouts');
  });

  it('should include all observations in memory snapshot — nothing is ever deleted', () => {
    store.addObservation('fact', 'Old fact', 0.9, 'observed');
    store.addObservation('fact', 'New fact', 0.9, 'observed');

    const snapshot = store.buildMemorySnapshot();

    expect(snapshot).toContain('Old fact');
    expect(snapshot).toContain('New fact');
  });

  // ── Seed Profile ─────────────────────────────────────────────────

  it('should seedJanProfile and populate identity table', () => {
    seedJanProfile(store);

    const goals = store.getIdentityCategory('goals');
    expect(goals.length).toBeGreaterThan(0);
    expect(goals.map(r => r.key)).toContain('net_worth_target');
    expect(goals.map(r => r.key)).toContain('car');

    const personal = store.getIdentityCategory('personal');
    expect(personal.map(r => r.key)).toContain('location');
    expect(personal.map(r => r.key)).toContain('timezone');

    const habits = store.getIdentityCategory('habits');
    expect(habits.length).toBeGreaterThan(0);
  });

  // ── Conversations ────────────────────────────────────────────────

  it('should startConversation, addMessage, and getMessages', () => {
    const convId = store.startConversation('chat');
    expect(typeof convId).toBe('number');

    const msgId1 = store.addMessage(convId, 'edwin', 'Good morning, sir.');
    const msgId2 = store.addMessage(convId, 'jan', 'Morning.');
    expect(typeof msgId1).toBe('number');
    expect(typeof msgId2).toBe('number');

    const messages = store.getMessages(convId);
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('edwin');
    expect(messages[0].content).toBe('Good morning, sir.');
    expect(messages[1].role).toBe('jan');
    expect(messages[1].content).toBe('Morning.');
  });

  it('should getActiveConversation and return undefined after endConversation', () => {
    const convId = store.startConversation('chat');

    const active = store.getActiveConversation('chat');
    expect(active).toBeDefined();
    expect(active!.id).toBe(convId);
    expect(active!.ended_at).toBeNull();

    store.endConversation(convId, 'Morning catch-up', 'neutral');

    const afterEnd = store.getActiveConversation('chat');
    expect(afterEnd).toBeUndefined();
  });

  it('should getRecentMessages across conversations', () => {
    const conv1 = store.startConversation('chat');
    store.addMessage(conv1, 'edwin', 'Hello');
    store.addMessage(conv1, 'jan', 'Hi');

    const conv2 = store.startConversation('chat');
    store.addMessage(conv2, 'edwin', 'Good evening');

    const recent = store.getRecentMessages(2);
    expect(recent).toHaveLength(2);
    // DESC order: most recent first
    expect(recent[0].content).toBe('Good evening');
    expect(recent[1].content).toBe('Hi');
  });
});
