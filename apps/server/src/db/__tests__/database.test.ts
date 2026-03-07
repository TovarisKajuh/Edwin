import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from '../database';

describe('Database', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('should initialize all tables', () => {
    const tables = db.raw()
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const tableNames = tables.map(t => t.name);

    expect(tableNames).toContain('identity');
    expect(tableNames).toContain('people');
    expect(tableNames).toContain('items');
    expect(tableNames).toContain('bills');
    expect(tableNames).toContain('routines');
    expect(tableNames).toContain('observations');
    expect(tableNames).toContain('conversations');
    expect(tableNames).toContain('messages');
    expect(tableNames).toContain('weekly_summaries');
    expect(tableNames).toContain('scheduled_actions');
  });

  it('should insert and retrieve identity data', () => {
    db.raw().prepare(
      'INSERT INTO identity (category, key, value, source) VALUES (?, ?, ?, ?)'
    ).run('goals', 'net_worth_target', '6000000', 'told');

    const row = db.raw().prepare(
      'SELECT * FROM identity WHERE category = ? AND key = ?'
    ).get('goals', 'net_worth_target') as any;

    expect(row.value).toBe('6000000');
    expect(row.source).toBe('told');
    expect(row.confidence).toBe(1.0);
  });

  it('should insert and retrieve conversations with messages', () => {
    const conv = db.raw().prepare(
      'INSERT INTO conversations (channel) VALUES (?)'
    ).run('chat');

    db.raw().prepare(
      'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)'
    ).run(conv.lastInsertRowid, 'edwin', 'Good morning, sir.');

    const msg = db.raw().prepare(
      'SELECT * FROM messages WHERE conversation_id = ?'
    ).get(conv.lastInsertRowid) as any;

    expect(msg.role).toBe('edwin');
    expect(msg.content).toBe('Good morning, sir.');
  });
});
