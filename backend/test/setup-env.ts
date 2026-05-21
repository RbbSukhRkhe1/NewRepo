import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Isolated SQLite + no Redis/RPC for fast CI-safe API tests. Call before importing `../server/app.js`. */
export function prepareTestEnv(): string {
  const dbPath = path.join(os.tmpdir(), `vaultex-test-${process.pid}-${Date.now()}.db`);
  process.env.SQLITE_PATH = dbPath;
  process.env.READY_SKIP_RPC = '1';
  process.env.REDIS_DISABLED = '1';
  process.env.SESSION_SECRET = 'vaultex-test-session-secret';
  process.env.NETWORK = 'anvil';
  return dbPath;
}

export function cleanupTestDb(dbPath: string) {
  try {
    fs.unlinkSync(dbPath);
  } catch {
    /* ignore */
  }
  for (const suffix of ['-wal', '-shm']) {
    try {
      fs.unlinkSync(dbPath + suffix);
    } catch {
      /* ignore */
    }
  }
}
