import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.SQLITE_PATH ?? path.join(dataDir, 'donate.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','donor','hospital')),
  anvil_index INTEGER UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS causes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  goal_eth REAL NOT NULL,
  raised_eth REAL NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tx_hash TEXT NOT NULL UNIQUE,
  block_number INTEGER,
  from_addr TEXT NOT NULL,
  to_addr TEXT NOT NULL,
  value_eth TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('donation_in','disbursement_out','chain_sync')),
  cause_id INTEGER,
  from_display_name TEXT,
  to_display_name TEXT,
  cause_name TEXT,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (cause_id) REFERENCES causes(id)
);

CREATE INDEX IF NOT EXISTS idx_ledger_recorded ON ledger_entries(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_anvil ON users(anvil_index);
`);
