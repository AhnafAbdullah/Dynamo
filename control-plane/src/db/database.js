const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'runtime.db'));

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS apps (
    app_id      TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    config      TEXT NOT NULL,          -- JSON blob (UI + workflow definitions)
    version     INTEGER DEFAULT 1,
    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS app_versions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    app_id      TEXT NOT NULL,
    version     INTEGER NOT NULL,
    config      TEXT NOT NULL,
    patch       TEXT,                   -- JSON Patch (RFC 6902) applied to reach this version
    created_at  TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (app_id) REFERENCES apps(app_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS mutations (
    mutation_id TEXT PRIMARY KEY,
    app_id      TEXT NOT NULL,
    status      TEXT DEFAULT 'pending', -- pending | approved | rejected | preview
    title       TEXT NOT NULL,
    description TEXT,
    patch       TEXT NOT NULL,          -- JSON Patch to apply
    source      TEXT DEFAULT 'ai',      -- ai | manual
    created_at  TEXT DEFAULT (datetime('now')),
    resolved_at TEXT,
    FOREIGN KEY (app_id) REFERENCES apps(app_id) ON DELETE CASCADE
  );
`);

module.exports = db;
