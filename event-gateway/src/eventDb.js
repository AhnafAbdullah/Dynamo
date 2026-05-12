const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../control-plane/data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'events.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    event_id    TEXT PRIMARY KEY,
    tenant_id   TEXT NOT NULL DEFAULT 'default',
    app_id      TEXT NOT NULL,
    user_id     TEXT NOT NULL DEFAULT 'anonymous',
    session_id  TEXT NOT NULL,
    event_type  TEXT NOT NULL,
    context     TEXT NOT NULL DEFAULT '{}',
    timestamp   TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_events_app_id    ON events(app_id);
  CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
  CREATE INDEX IF NOT EXISTS idx_events_session   ON events(session_id);
  CREATE INDEX IF NOT EXISTS idx_events_type      ON events(event_type);
`);

module.exports = db;
