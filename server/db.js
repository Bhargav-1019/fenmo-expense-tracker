const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'expenses.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// --- Schema ---
db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL,
    amount_paise  INTEGER NOT NULL CHECK(amount_paise > 0),
    category      TEXT    NOT NULL,
    description   TEXT    NOT NULL DEFAULT '',
    date          TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_expenses_user_id   ON expenses(user_id);
  CREATE INDEX IF NOT EXISTS idx_expenses_category  ON expenses(category);
  CREATE INDEX IF NOT EXISTS idx_expenses_date      ON expenses(date);

  -- Idempotency keys table: stores the key and the response for replay
  CREATE TABLE IF NOT EXISTS idempotency_keys (
    key         TEXT    PRIMARY KEY,
    response    TEXT    NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

module.exports = db;
