CREATE TABLE IF NOT EXISTS verification_sessions (
  bot_hash TEXT PRIMARY KEY,
  bot_username TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  telegram_user_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  verified_at INTEGER
);

CREATE TABLE IF NOT EXISTS devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_user_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  fingerprint_data TEXT NOT NULL,
  first_seen_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  verified_at INTEGER NOT NULL,
  UNIQUE(telegram_user_id),
  UNIQUE(telegram_user_id, device_id),
  UNIQUE(fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_devices_user
ON devices(telegram_user_id);

CREATE INDEX IF NOT EXISTS idx_devices_fingerprint
ON devices(fingerprint);

CREATE TABLE IF NOT EXISTS verification_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bot_hash TEXT NOT NULL,
  telegram_user_id TEXT,
  device_id TEXT,
  fingerprint TEXT,
  event_type TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
