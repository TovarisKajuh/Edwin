import { describe, it, expect, beforeEach } from 'vitest';
import { Database } from '../../../db/database';
import { MemoryStore } from '../../../memory/store';
import { calculatePriorities, getTopPriorities, formatPriorities } from '../priority-engine';

let store: MemoryStore;

beforeEach(() => {
  const db = new Database(':memory:');
  store = new MemoryStore(db);
});

describe('Priority Engine', () => {
  // ── Urgency scoring ──────────────────────────────────────────

  it('should rank overdue actions highest', () => {
    const past = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
    const future = new Date(Date.now() + 86400000).toISOString(); // tomorrow

    store.addScheduledAction('reminder', 'Overdue bill payment', past, 'high');
    store.addScheduledAction('reminder', 'Take vitamins tomorrow', future, 'low');

    const priorities = calculatePriorities(store, 'morning', null);

    expect(priorities[0].description).toBe('Overdue bill payment');
    expect(priorities[0].priority).toBe('critical');
    expect(priorities[0].score).toBeGreaterThan(priorities[1].score);
  });

  it('should escalate actions approaching their trigger time', () => {
    const in30min = new Date(Date.now() + 30 * 60000).toISOString();
    const in12hours = new Date(Date.now() + 12 * 3600000).toISOString();

    store.addScheduledAction('reminder', 'Client call soon', in30min, 'medium');
    store.addScheduledAction('reminder', 'Review report later', in12hours, 'medium');

    const priorities = calculatePriorities(store, 'morning', null);

    expect(priorities[0].description).toBe('Client call soon');
    expect(priorities[0].score).toBeGreaterThan(priorities[1].score);
  });

  // ── Impact scoring ───────────────────────────────────────────

  it('should rank financial items higher than routine items', () => {
    const future = new Date(Date.now() + 86400000).toISOString();

    store.addScheduledAction('reminder', 'Pay electricity bill', future, 'medium');
    store.addScheduledAction('reminder', 'Take vitamin supplement', future, 'low');

    const priorities = calculatePriorities(store, 'morning', null);

    const bill = priorities.find((p) => p.description.includes('bill'));
    const vitamin = priorities.find((p) => p.description.includes('vitamin'));

    expect(bill!.score).toBeGreaterThan(vitamin!.score);
  });

  it('should rank career items higher than home items', () => {
    const future = new Date(Date.now() + 86400000).toISOString();

    store.addScheduledAction('reminder', 'Prepare client presentation', future, 'medium');
    store.addScheduledAction('reminder', 'Do laundry', future, 'low');

    const priorities = calculatePriorities(store, 'morning', null);

    const client = priorities.find((p) => p.description.includes('client'));
    const laundry = priorities.find((p) => p.description.includes('laundry'));

    expect(client!.score).toBeGreaterThan(laundry!.score);
  });

  // ── Consequence scoring ──────────────────────────────────────

  it('should boost items with real consequences', () => {
    const future = new Date(Date.now() + 86400000).toISOString();

    store.addScheduledAction('reminder', 'Pay invoice before late fee', future, 'medium');
    store.addScheduledAction('reminder', 'Buy new headphones', future, 'medium');

    const priorities = calculatePriorities(store, 'morning', null);

    const invoice = priorities.find((p) => p.description.includes('invoice'));
    const headphones = priorities.find((p) => p.description.includes('headphones'));

    expect(invoice!.score).toBeGreaterThan(headphones!.score);
  });

  // ── Stakes level ─────────────────────────────────────────────

  it('should rank high-stakes actions above low-stakes', () => {
    const future = new Date(Date.now() + 86400000).toISOString();

    store.addScheduledAction('reminder', 'Something important', future, 'high');
    store.addScheduledAction('reminder', 'Something minor', future, 'low');

    const priorities = calculatePriorities(store, 'morning', null);

    expect(priorities[0].description).toBe('Something important');
    expect(priorities[0].score).toBeGreaterThan(priorities[1].score);
  });

  // ── Mood dampening ───────────────────────────────────────────

  it('should dampen low-priority items when Jan is stressed', () => {
    const future = new Date(Date.now() + 86400000).toISOString();

    store.addScheduledAction('reminder', 'Take vitamins', future, 'low');

    const normalPriorities = calculatePriorities(store, 'morning', null);
    const stressedPriorities = calculatePriorities(store, 'morning', 'Jan is stressed and overwhelmed');

    const normalScore = normalPriorities[0].score;
    const stressedScore = stressedPriorities[0].score;

    expect(stressedScore).toBeLessThan(normalScore);
  });

  it('should not dampen high-priority items when stressed', () => {
    const past = new Date(Date.now() - 3600000).toISOString();

    store.addScheduledAction('reminder', 'Pay overdue bill immediately', past, 'high');

    const normalPriorities = calculatePriorities(store, 'morning', null);
    const stressedPriorities = calculatePriorities(store, 'morning', 'Jan is stressed');

    // High-scoring items (>= 50) should not be dampened
    expect(stressedPriorities[0].priority).toBe('critical');
    expect(stressedPriorities[0].score).toBe(normalPriorities[0].score);
  });

  // ── Commitments ──────────────────────────────────────────────

  it('should include commitments in priority ranking', () => {
    store.addObservation('commitment', 'Jan said he would call the electrician today', 1.0, 'told');

    const priorities = calculatePriorities(store, 'morning', null);

    expect(priorities.length).toBeGreaterThanOrEqual(1);
    expect(priorities[0].source).toBe('commitment');
    expect(priorities[0].description).toContain('electrician');
  });

  it('should rank today-commitments higher than this-week ones', () => {
    store.addObservation('commitment', 'Jan will call the supplier today', 1.0, 'told');
    store.addObservation('commitment', 'Jan will organize the garage this week', 1.0, 'told');

    const priorities = calculatePriorities(store, 'morning', null);

    const supplier = priorities.find((p) => p.description.includes('supplier'));
    const garage = priorities.find((p) => p.description.includes('garage'));

    expect(supplier!.score).toBeGreaterThan(garage!.score);
  });

  // ── Follow-ups ───────────────────────────────────────────────

  it('should include follow-ups in priority ranking', () => {
    store.addObservation('follow_up', 'Ask Jan how the client meeting went', 0.8, 'observed');

    const priorities = calculatePriorities(store, 'morning', null);

    expect(priorities.length).toBeGreaterThanOrEqual(1);
    const followUp = priorities.find((p) => p.source === 'follow_up');
    expect(followUp).toBeDefined();
    expect(followUp!.description).toContain('client');
  });

  // ── Mixed ranking ────────────────────────────────────────────

  it('should correctly rank bill > gym > supplement across sources', () => {
    const soon = new Date(Date.now() + 2 * 3600000).toISOString(); // 2 hours

    store.addScheduledAction('reminder', 'Pay electricity bill deadline', soon, 'high');
    store.addObservation('commitment', 'Jan said he would go to the gym today', 1.0, 'told');
    store.addScheduledAction('reminder', 'Take daily supplement', soon, 'low');

    const priorities = calculatePriorities(store, 'morning', null);

    const billIdx = priorities.findIndex((p) => p.description.includes('bill'));
    const gymIdx = priorities.findIndex((p) => p.description.includes('gym'));
    const suppIdx = priorities.findIndex((p) => p.description.includes('supplement'));

    expect(billIdx).toBeLessThan(gymIdx);
    expect(gymIdx).toBeLessThan(suppIdx);
  });

  // ── Priority levels ──────────────────────────────────────────

  it('should assign correct priority levels based on score', () => {
    const past = new Date(Date.now() - 3600000).toISOString();
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();

    store.addScheduledAction('reminder', 'Overdue client payment deadline', past, 'high');
    store.addScheduledAction('reminder', 'Buy new socks next week', nextWeek, 'low');

    const priorities = calculatePriorities(store, 'morning', null);

    const overdue = priorities.find((p) => p.description.includes('Overdue'));
    const socks = priorities.find((p) => p.description.includes('socks'));

    expect(overdue!.priority).toBe('critical');
    expect(socks!.priority).toBe('medium'); // base 30 + low stakes + no urgency
  });

  // ── getTopPriorities ─────────────────────────────────────────

  it('should return limited number of items', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    for (let i = 0; i < 10; i++) {
      store.addScheduledAction('reminder', `Task ${i}`, future, 'medium');
    }

    const top = getTopPriorities(store, 'morning', null, 3);
    expect(top).toHaveLength(3);
  });

  // ── formatPriorities ─────────────────────────────────────────

  it('should format priorities with level labels', () => {
    const items = [
      { id: 'action:1', description: 'Pay bill', priority: 'critical' as const, score: 85, reason: 'overdue, financial', source: 'action' as const },
      { id: 'action:2', description: 'Take vitamins', priority: 'low' as const, score: 25, reason: 'routine', source: 'action' as const },
    ];

    const formatted = formatPriorities(items);

    expect(formatted[0]).toContain('[CRITICAL]');
    expect(formatted[0]).toContain('Pay bill');
    expect(formatted[0]).toContain('overdue');
    expect(formatted[1]).toContain('[LOW]');
  });

  // ── Reason/explanation ───────────────────────────────────────

  it('should provide meaningful reason for priority ranking', () => {
    const past = new Date(Date.now() - 3600000).toISOString();
    store.addScheduledAction('reminder', 'Pay electricity bill', past, 'high');

    const priorities = calculatePriorities(store, 'morning', null);

    expect(priorities[0].reason).toContain('overdue');
    expect(priorities[0].reason).toContain('high stakes');
  });

  // ── Empty state ──────────────────────────────────────────────

  it('should return empty array when nothing is pending', () => {
    const priorities = calculatePriorities(store, 'morning', null);
    expect(priorities).toHaveLength(0);
  });
});
