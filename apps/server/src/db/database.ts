import BetterSqlite3 from 'better-sqlite3';
import { SCHEMA } from './schema.js';

export class Database {
  private db: BetterSqlite3.Database;

  constructor(path: string = './data/edwin.db') {
    this.db = new BetterSqlite3(path);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.initialize();
  }

  private initialize(): void {
    this.db.exec(SCHEMA);
  }

  raw(): BetterSqlite3.Database {
    return this.db;
  }

  close(): void {
    this.db.close();
  }
}
