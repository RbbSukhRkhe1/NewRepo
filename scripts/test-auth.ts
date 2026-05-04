/**
 * Auth + Security smoke tests.
 *
 * Runs server-side checks that grow step-by-step alongside the auth rework.
 *
 * Usage:
 *   npx tsx scripts/test-auth.ts
 *
 * Each `step1`, `step2`, ... function corresponds to a row in the Auth + Security
 * plan and is intentionally cheap (no Anvil required where possible).
 */
import assert from 'node:assert/strict';
import { db } from '../server/db.js';

type Counts = Record<string, number>;

function roleCounts(): Counts {
  const rows = db
    .prepare('SELECT role, COUNT(*) AS n FROM users GROUP BY role')
    .all() as { role: string; n: number }[];
  const out: Counts = {};
  for (const r of rows) out[r.role] = r.n;
  return out;
}

function step1_renameRole() {
  console.log('-- step 1: hospital -> beneficiary');

  const counts = roleCounts();
  console.log('   role counts:', counts);

  assert.equal(counts.hospital, undefined, 'no rows should still have role=hospital');
  assert.ok(
    (counts.beneficiary ?? 0) >= 1,
    'at least one beneficiary expected (seeded or migrated)'
  );

  const usersSchema = (
    db
      .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'")
      .get() as { sql: string } | undefined
  )?.sql ?? '';
  assert.ok(
    usersSchema.includes("'beneficiary'"),
    "users.sql should include 'beneficiary' in CHECK"
  );
  assert.ok(
    !usersSchema.includes("'hospital'"),
    "users.sql should not include 'hospital' anymore"
  );

  let rejected = false;
  try {
    db.prepare(
      "INSERT INTO users (name, email, password_hash, role) VALUES ('x','__probe__@x','x','hospital')"
    ).run();
  } catch {
    rejected = true;
  } finally {
    db.prepare("DELETE FROM users WHERE email = '__probe__@x'").run();
  }
  assert.ok(rejected, "CHECK constraint should reject role='hospital'");

  console.log('   ok\n');
}

const steps: Record<string, () => void> = {
  step1: step1_renameRole,
};

const arg = process.argv[2];
if (arg && steps[arg]) {
  steps[arg]();
} else {
  for (const [name, fn] of Object.entries(steps)) {
    console.log(`>> ${name}`);
    fn();
  }
  console.log('all auth smoke tests passed');
}
