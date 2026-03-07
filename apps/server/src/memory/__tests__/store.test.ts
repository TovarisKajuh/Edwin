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

  // ── Memory Snapshot ──────────────────────────────────────────────

  it('should buildMemorySnapshot including identity and observations', () => {
    store.setIdentity('personal', 'location', 'Austria', 'told');
    store.setIdentity('goals', 'car', 'Ferrari', 'told');
    store.addObservation('mood', 'Feeling good', 0.9, 'observed');
    store.addObservation('mood', 'Low energy', 0.4, 'observed');

    const snapshot = store.buildMemorySnapshot();

    expect(snapshot).toContain('=== IDENTITY ===');
    expect(snapshot).toContain('[goals]');
    expect(snapshot).toContain('car: Ferrari');
    expect(snapshot).toContain('[personal]');
    expect(snapshot).toContain('location: Austria');
    expect(snapshot).toContain('=== RECENT OBSERVATIONS ===');
    expect(snapshot).toContain('[confirmed] Feeling good');
    expect(snapshot).toContain('[tentative] Low energy');
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
