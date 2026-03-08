export const SCHEMA = `
CREATE TABLE IF NOT EXISTS identity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  source TEXT,
  confidence REAL DEFAULT 1.0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category, key)
);

CREATE TABLE IF NOT EXISTS people (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  relationship TEXT,
  last_contact TEXT,
  contact_frequency_goal TEXT,
  notes TEXT,
  phone TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT,
  quantity INTEGER DEFAULT 0,
  reorder_threshold INTEGER,
  reorder_link TEXT,
  last_restocked TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  amount REAL,
  currency TEXT DEFAULT 'EUR',
  due_day INTEGER,
  frequency TEXT,
  auto_pay INTEGER DEFAULT 0,
  last_paid TEXT,
  next_due DATE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS routines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT,
  schedule TEXT,
  details TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT,
  content TEXT NOT NULL,
  confidence REAL DEFAULT 0.5,
  source TEXT DEFAULT 'observed',
  observed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT
);

CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT DEFAULT 'chat',
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  ended_at TEXT,
  summary TEXT,
  mood TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS weekly_summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start DATE NOT NULL UNIQUE,
  highlights TEXT,
  concerns TEXT,
  patterns TEXT,
  mood_trend TEXT
);

CREATE TABLE IF NOT EXISTS scheduled_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT,
  description TEXT,
  trigger_time TEXT,
  status TEXT DEFAULT 'pending',
  stakes_level TEXT DEFAULT 'low',
  response TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT,
  location TEXT,
  event_type TEXT DEFAULT 'event',
  recurring TEXT,
  external_id TEXT UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_identity_category ON identity(category);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_observations_category ON observations(category);
CREATE INDEX IF NOT EXISTS idx_scheduled_actions_status ON scheduled_actions(status);
CREATE INDEX IF NOT EXISTS idx_observations_expires_at ON observations(expires_at);
`;
