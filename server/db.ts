import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js';
import { createSupabaseAdminClient } from './db/supabase.js';
import { isDualWriteSqliteEnabled, isSupabaseEnabled } from './env.js';

export type UserRow = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  anvil_index: number | null;
  /** Base Sepolia smart / embedded wallet (Privy) used when USE_USEROP=true */
  embedded_wallet_address?: string | null;
  created_at?: string;
};

export type CauseRow = {
  id: number;
  title: string;
  description: string;
  goal_eth: number;
  raised_eth: number;
  active?: number | boolean;
  created_at?: string;
};

export type LedgerDbRow = {
  id: number;
  tx_hash: string;
  block_number: number | null;
  from_addr: string;
  to_addr: string;
  value_eth: string;
  kind: string;
  cause_id: number | null;
  from_display_name: string | null;
  to_display_name: string | null;
  cause_name: string | null;
  recorded_at: string;
};

type LedgerWriteInput = Omit<LedgerDbRow, 'id' | 'recorded_at'>;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = process.env.SQLITE_PATH ?? path.join(dataDir, 'donate.db');
const supabase = isSupabaseEnabled() ? createSupabaseAdminClient() : null;
const dualWrite = isSupabaseEnabled() && isDualWriteSqliteEnabled();
const needsSqlite = !supabase || dualWrite;
const require = createRequire(import.meta.url);

type SqliteStmt = {
  get: (...args: unknown[]) => unknown;
  all: (...args: unknown[]) => unknown;
  run: (...args: unknown[]) => { lastInsertRowid?: bigint | number };
};
type SqliteDb = {
  pragma: (sql: string) => unknown;
  exec: (sql: string) => unknown;
  prepare: (sql: string) => SqliteStmt;
};

let sqlite: SqliteDb | null = null;
try {
  const BetterSqlite = require('better-sqlite3') as new (filename: string) => SqliteDb;
  sqlite = new BetterSqlite(dbPath);
} catch (error: unknown) {
  if (needsSqlite) {
    const msg = error instanceof Error ? error.message : 'unknown sqlite load error';
    throw new Error(
      `SQLite is required but failed to load better-sqlite3. Reinstall dependencies for current Node runtime. Root cause: ${msg}`
    );
  }
}

function sqliteOrThrow(): SqliteDb {
  if (!sqlite) throw new Error('SQLite unavailable while configured as required backend.');
  return sqlite;
}

if (sqlite) {
  sqlite.pragma('journal_mode = WAL');
  sqlite.exec(`
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

  try {
    sqlite.exec(`ALTER TABLE users ADD COLUMN embedded_wallet_address TEXT`);
  } catch {
    /* column exists */
  }
}

function normalizeCause(row: CauseRow): CauseRow {
  return { ...row, active: row.active === true ? 1 : row.active === false ? 0 : row.active };
}

async function supabaseRows<T>(
  table: string,
  query: (
    q: PostgrestFilterBuilder<unknown, unknown, unknown>
  ) => PostgrestFilterBuilder<unknown, unknown, unknown>
): Promise<T[]> {
  if (!supabase) return [];
  const q = query(supabase.from(table).select('*'));
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

export const dbService = {
  async getUserCount(): Promise<number> {
    if (supabase) {
      const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
      if (error) throw new Error(error.message);
      return count ?? 0;
    }
    const r = sqliteOrThrow().prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
    return r.c;
  },
  async getUserById(id: number): Promise<UserRow | undefined> {
    if (supabase) {
      const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
      if (error) throw new Error(error.message);
      return data as UserRow | undefined;
    }
    return sqliteOrThrow().prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  },
  async getUserByEmail(email: string): Promise<UserRow | undefined> {
    if (supabase) {
      const { data, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
      if (error) throw new Error(error.message);
      return data as UserRow | undefined;
    }
    return sqliteOrThrow().prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
  },
  async listUsers(): Promise<UserRow[]> {
    if (supabase) return supabaseRows<UserRow>('users', (q) => q.order('id', { ascending: true }));
    return sqlite
      .prepare(
        'SELECT id, name, email, role, anvil_index, embedded_wallet_address, created_at FROM users ORDER BY id'
      )
      .all() as UserRow[];
  },
  async updateEmbeddedWallet(userId: number, address: string | null): Promise<void> {
    if (supabase) {
      const { error } = await supabase
        .from('users')
        .update({ embedded_wallet_address: address })
        .eq('id', userId);
      if (error) throw new Error(error.message);
      if (dualWrite) {
        sqliteOrThrow().prepare(`UPDATE users SET embedded_wallet_address = ? WHERE id = ?`).run(address, userId);
      }
      return;
    }
    sqliteOrThrow().prepare(`UPDATE users SET embedded_wallet_address = ? WHERE id = ?`).run(address, userId);
  },
  async getUsersWithAnvilIndex(): Promise<Array<{ anvil_index: number; name?: string }>> {
    if (supabase) {
      const rows = await supabaseRows<{ anvil_index: number | null; name: string }>('users', (q) =>
        q.not('anvil_index', 'is', null)
      );
      return rows.filter((r) => r.anvil_index != null).map((r) => ({ anvil_index: r.anvil_index!, name: r.name }));
    }
    return sqlite
      .prepare(`SELECT anvil_index, name FROM users WHERE anvil_index IS NOT NULL`)
      .all() as Array<{ anvil_index: number; name?: string }>;
  },
  async getBeneficiaryById(id: number): Promise<UserRow | undefined> {
    if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .eq('role', 'beneficiary')
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as UserRow | undefined;
    }
    return sqliteOrThrow().prepare(`SELECT * FROM users WHERE id = ? AND role = 'beneficiary'`).get(id) as UserRow | undefined;
  },
  async getUsedAnvilIndices(indices: number[]): Promise<number[]> {
    if (supabase) {
      const { data, error } = await supabase.from('users').select('anvil_index').in('anvil_index', indices);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => Number((r as { anvil_index: number }).anvil_index));
    }
    const qs = indices.map(() => '?').join(',');
    const rows = sqliteOrThrow().prepare(`SELECT anvil_index FROM users WHERE anvil_index IN (${qs})`).all(...indices) as {
      anvil_index: number;
    }[];
    return rows.map((r) => r.anvil_index);
  },
  async createUser(input: Omit<UserRow, 'id' | 'created_at'>): Promise<number> {
    if (supabase) {
      const { data, error } = await supabase.from('users').insert(input).select('id').single();
      if (error) throw new Error(error.message);
      const id = Number((data as { id: number }).id);
      if (dualWrite) {
        sqlite
          .prepare(`INSERT OR IGNORE INTO users (id, name, email, password_hash, role, anvil_index) VALUES (?,?,?,?,?,?)`)
          .run(id, input.name, input.email, input.password_hash, input.role, input.anvil_index);
      }
      return id;
    }
    const r = sqlite
      .prepare(`INSERT INTO users (name, email, password_hash, role, anvil_index) VALUES (?,?,?,?,?)`)
      .run(input.name, input.email, input.password_hash, input.role, input.anvil_index);
    return Number(r.lastInsertRowid);
  },
  async listActiveCauses(): Promise<CauseRow[]> {
    if (supabase) return (await supabaseRows<CauseRow>('causes', (q) => q.eq('active', true).order('id', { ascending: false }))).map(normalizeCause);
    return sqliteOrThrow().prepare(`SELECT * FROM causes WHERE active = 1 ORDER BY id DESC`).all() as CauseRow[];
  },
  async getActiveCauseById(id: number): Promise<CauseRow | undefined> {
    if (supabase) {
      const { data, error } = await supabase.from('causes').select('*').eq('id', id).eq('active', true).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? normalizeCause(data as CauseRow) : undefined;
    }
    return sqliteOrThrow().prepare(`SELECT * FROM causes WHERE id = ? AND active = 1`).get(id) as CauseRow | undefined;
  },
  async createCause(input: { title: string; description: string; goal_eth: number; raised_eth: number; active: number }): Promise<number> {
    if (supabase) {
      const { data, error } = await supabase
        .from('causes')
        .insert({ ...input, active: Boolean(input.active) })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      const id = Number((data as { id: number }).id);
      if (dualWrite) {
        sqliteOrThrow().prepare(`INSERT OR IGNORE INTO causes (id, title, description, goal_eth, raised_eth, active) VALUES (?,?,?,?,?,?)`).run(id, input.title, input.description, input.goal_eth, input.raised_eth, input.active);
      }
      return id;
    }
    const r = sqlite
      .prepare(`INSERT INTO causes (title, description, goal_eth, raised_eth, active) VALUES (?,?,?,?,1)`)
      .run(input.title, input.description, input.goal_eth, input.raised_eth);
    return Number(r.lastInsertRowid);
  },
  async incrementCauseRaised(id: number, amount: number): Promise<void> {
    if (supabase) {
      const cause = await this.getActiveCauseById(id);
      if (!cause) return;
      const { error } = await supabase!.from('causes').update({ raised_eth: Number(cause.raised_eth) + amount }).eq('id', id);
      if (error) throw new Error(error.message);
      if (dualWrite) sqliteOrThrow().prepare(`UPDATE causes SET raised_eth = raised_eth + ? WHERE id = ?`).run(amount, id);
      return;
    }
    sqliteOrThrow().prepare(`UPDATE causes SET raised_eth = raised_eth + ? WHERE id = ?`).run(amount, id);
  },
  async upsertLedgerEntry(input: LedgerWriteInput): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('ledger_entries').upsert(input, { onConflict: 'tx_hash' });
      if (error) throw new Error(error.message);
      if (dualWrite) {
        sqliteOrThrow().prepare(
          `INSERT INTO ledger_entries (tx_hash, block_number, from_addr, to_addr, value_eth, kind, cause_id, from_display_name, to_display_name, cause_name)
           VALUES (?,?,?,?,?,?,?,?,?,?)
           ON CONFLICT(tx_hash) DO UPDATE SET
            block_number = excluded.block_number,
            from_addr = excluded.from_addr,
            to_addr = excluded.to_addr,
            value_eth = excluded.value_eth,
            kind = excluded.kind,
            cause_id = excluded.cause_id,
            from_display_name = excluded.from_display_name,
            to_display_name = excluded.to_display_name,
            cause_name = excluded.cause_name`
        ).run(
          input.tx_hash,
          input.block_number,
          input.from_addr,
          input.to_addr,
          input.value_eth,
          input.kind,
          input.cause_id,
          input.from_display_name,
          input.to_display_name,
          input.cause_name
        );
      }
      return;
    }
    sqliteOrThrow().prepare(
      `INSERT INTO ledger_entries (tx_hash, block_number, from_addr, to_addr, value_eth, kind, cause_id, from_display_name, to_display_name, cause_name)
       VALUES (?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(tx_hash) DO UPDATE SET
        block_number = excluded.block_number,
        from_addr = excluded.from_addr,
        to_addr = excluded.to_addr,
        value_eth = excluded.value_eth,
        kind = excluded.kind,
        cause_id = excluded.cause_id,
        from_display_name = excluded.from_display_name,
        to_display_name = excluded.to_display_name,
        cause_name = excluded.cause_name`
    ).run(
      input.tx_hash,
      input.block_number,
      input.from_addr,
      input.to_addr,
      input.value_eth,
      input.kind,
      input.cause_id,
      input.from_display_name,
      input.to_display_name,
      input.cause_name
    );
  },
  async listLedger(limit: number): Promise<LedgerDbRow[]> {
    if (supabase) {
      return supabaseRows<LedgerDbRow>('ledger_entries', (q) => q.order('recorded_at', { ascending: true }).order('id', { ascending: true }).limit(limit));
    }
    return sqliteOrThrow().prepare(`SELECT * FROM ledger_entries ORDER BY recorded_at ASC, id ASC LIMIT ?`).all(limit) as LedgerDbRow[];
  },
  async listLedgerForAddress(addrLower: string, limit: number): Promise<LedgerDbRow[]> {
    if (supabase) {
      const rows = await supabaseRows<LedgerDbRow>('ledger_entries', (q) => q.order('recorded_at', { ascending: false }).order('id', { ascending: false }).limit(limit));
      return rows.filter((r) => r.from_addr.toLowerCase() === addrLower || r.to_addr.toLowerCase() === addrLower);
    }
    return sqlite
      .prepare(
        `SELECT * FROM ledger_entries WHERE lower(from_addr) = ? OR lower(to_addr) = ? ORDER BY recorded_at DESC, id DESC LIMIT ?`
      )
      .all(addrLower, addrLower, limit) as LedgerDbRow[];
  },
  async overviewAgg(): Promise<{ active_causes: number; total_raised_eth: number; ledger_entries: number; total_donated_eth: number; total_disbursed_eth: number }> {
    const causes = await this.listActiveCauses();
    const ledger = await this.listLedger(5000);
    let totalDonated = 0;
    let totalDisbursed = 0;
    for (const l of ledger) {
      const v = Number(l.value_eth);
      if (l.kind === 'donation_in') totalDonated += v;
      if (l.kind === 'disbursement_out') totalDisbursed += v;
    }
    return {
      active_causes: causes.length,
      total_raised_eth: causes.reduce((s, c) => s + Number(c.raised_eth), 0),
      ledger_entries: ledger.length,
      total_donated_eth: totalDonated,
      total_disbursed_eth: totalDisbursed,
    };
  },
  async userHistoryAgg(addrLower: string): Promise<{ total_sent: number; total_received: number }> {
    const rows = await this.listLedger(5000);
    let sent = 0;
    let received = 0;
    for (const r of rows) {
      const v = Number(r.value_eth);
      if (r.from_addr.toLowerCase() === addrLower && r.kind === 'donation_in') sent += v;
      if (r.to_addr.toLowerCase() === addrLower && r.kind === 'disbursement_out') received += v;
    }
    return { total_sent: sent, total_received: received };
  },
};
