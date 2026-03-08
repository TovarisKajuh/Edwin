import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from '../../db/database';
import { MemoryStore } from '../../memory/store';
import { checkHealth, formatHealthWarnings } from '../self-awareness';

describe('Self-Awareness', () => {
  let db: Database;
  let store: MemoryStore;

  beforeEach(() => {
    db = new Database(':memory:');
    store = new MemoryStore(db);
  });

  afterEach(() => {
    db.close();
  });

  it('should return no warnings when everything is healthy', () => {
    const warnings = checkHealth(store);
    // Only info-level (missing capabilities) — no warning/critical
    const urgent = warnings.filter((w) => w.severity !== 'info');
    expect(urgent).toHaveLength(0);
  });

  it('should return info about missing capabilities', () => {
    const warnings = checkHealth(store);
    const info = warnings.filter((w) => w.severity === 'info');
    expect(info.length).toBeGreaterThan(0);
    expect(info[0].message).toContain('weather');
  });

  it('should warn when observation count exceeds warning threshold', () => {
    // Insert 500+ observations
    const stmt = db.raw().prepare(
      'INSERT INTO observations (category, content, confidence, source) VALUES (?, ?, ?, ?)'
    );
    for (let i = 0; i < 501; i++) {
      stmt.run('fact', `Observation ${i}`, 0.8, 'observed');
    }

    const warnings = checkHealth(store);
    const memWarning = warnings.find(
      (w) => w.severity === 'warning' && w.message.includes('uncompressed')
    );
    expect(memWarning).toBeDefined();
    expect(memWarning!.message).toContain('501');
  });

  it('should return critical when observation count exceeds critical threshold', () => {
    const stmt = db.raw().prepare(
      'INSERT INTO observations (category, content, confidence, source) VALUES (?, ?, ?, ?)'
    );
    for (let i = 0; i < 1001; i++) {
      stmt.run('fact', `Observation ${i}`, 0.8, 'observed');
    }

    const warnings = checkHealth(store);
    const critical = warnings.find(
      (w) => w.severity === 'critical' && w.message.includes('uncompressed')
    );
    expect(critical).toBeDefined();
  });

  it('should format warnings for system prompt — only warning/critical', () => {
    const warnings = [
      { severity: 'info' as const, message: 'Missing weather' },
      { severity: 'warning' as const, message: 'Memory getting large' },
      { severity: 'critical' as const, message: 'Storage almost full' },
    ];

    const formatted = formatHealthWarnings(warnings);
    expect(formatted).not.toBeNull();
    expect(formatted).toContain('[SELF-AWARENESS]');
    expect(formatted).toContain('NOTE: Memory getting large');
    expect(formatted).toContain('URGENT: Storage almost full');
    expect(formatted).not.toContain('Missing weather'); // info suppressed
  });

  it('should return null when no urgent warnings exist', () => {
    const warnings = [
      { severity: 'info' as const, message: 'Missing weather' },
    ];

    const formatted = formatHealthWarnings(warnings);
    expect(formatted).toBeNull();
  });

  it('should get correct observation count', () => {
    expect(store.getObservationCount()).toBe(0);

    store.addObservation('fact', 'Test 1', 0.9, 'observed');
    store.addObservation('fact', 'Test 2', 0.9, 'observed');
    store.addObservation('commitment', 'Test 3', 0.9, 'observed');

    expect(store.getObservationCount()).toBe(3);
  });

  it('should get database size without crashing', () => {
    const size = store.getDatabaseSizeMB();
    expect(typeof size).toBe('number');
    expect(size).toBeGreaterThanOrEqual(0);
  });
});
