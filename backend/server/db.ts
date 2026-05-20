import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.SQLITE_PATH ?? path.join(dataDir, 'donate.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

function ensureMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function applySqlMigrations() {
  ensureMigrations();
  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) return;

  const applied = new Set(
    (db.prepare(`SELECT id FROM schema_migrations`).all() as { id: string }[]).map((r) => r.id)
  );

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.toLowerCase().endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  const apply = db.transaction(() => {
    for (const f of files) {
      if (applied.has(f)) continue;
      const full = path.join(migrationsDir, f);
      const sql = fs.readFileSync(full, 'utf8');
      db.exec(sql);
      db.prepare(`INSERT INTO schema_migrations (id) VALUES (?)`).run(f);
      console.log('[db] applied migration', f);
    }
  });

  apply();
}

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','donor','beneficiary')),
  anvil_index INTEGER UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS causes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  goal_eth REAL NOT NULL,
  raised_eth REAL NOT NULL DEFAULT 0,
  image_url TEXT,
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
  memo TEXT,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (cause_id) REFERENCES causes(id)
);

CREATE INDEX IF NOT EXISTS idx_ledger_recorded ON ledger_entries(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_anvil ON users(anvil_index);
`);

applySqlMigrations();

const causesColumns = db.prepare(`PRAGMA table_info(causes)`).all() as { name: string }[];
if (!causesColumns.some((c) => c.name === 'image_url')) {
  db.exec(`ALTER TABLE causes ADD COLUMN image_url TEXT`);
  console.log('[db] added causes.image_url');
}
if (!causesColumns.some((c) => c.name === 'anvil_index')) {
  db.exec(`ALTER TABLE causes ADD COLUMN anvil_index INTEGER`);
  db.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_causes_anvil_index ON causes(anvil_index) WHERE anvil_index IS NOT NULL`
  );
  console.log('[db] added causes.anvil_index');
}

const ledgerColumns = db.prepare(`PRAGMA table_info(ledger_entries)`).all() as { name: string }[];
if (!ledgerColumns.some((c) => c.name === 'memo')) {
  db.exec(`ALTER TABLE ledger_entries ADD COLUMN memo TEXT`);
  console.log('[db] added ledger_entries.memo');
}

// One-time migration for dev DBs created with role 'hospital'.
// We cannot UPDATE role to 'beneficiary' while the CHECK only allows 'hospital',
// so we rebuild the table in one transaction.
const usersSchema =
  (db
    .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'")
    .get() as { sql: string } | undefined)?.sql ?? '';
if (usersSchema.includes("'hospital'")) {
  const migrate = db.transaction(() => {
    db.exec(`
      CREATE TABLE users__mig (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin','donor','beneficiary')),
        anvil_index INTEGER UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO users__mig (id, name, email, password_hash, role, anvil_index, created_at)
      SELECT
        id, name, email, password_hash,
        CASE WHEN role = 'hospital' THEN 'beneficiary' ELSE role END,
        anvil_index, created_at
      FROM users;
      DROP TABLE users;
      ALTER TABLE users__mig RENAME TO users;
    `);
    db.exec('CREATE INDEX IF NOT EXISTS idx_users_anvil ON users(anvil_index);');
  });
  migrate();
  console.log("[db] migrated users.role 'hospital' -> 'beneficiary' (table rebuild)");
}
