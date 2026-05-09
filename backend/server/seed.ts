import bcrypt from 'bcryptjs';
import { db } from './db.js';
import {
  VAULTEX_ADMIN_INDEX,
  SEEDED_DONOR_INDICES,
  BENEFICIARY_INDICES,
  SUPER_RICH_INDEX,
  anvilAddress,
} from './anvil.js';

/** Shared demo password for every seeded account (capstone only). */
export const DEMO_PASSWORD = 'demo123';

type SeedCause = { title: string; description: string; goalEth: number; raisedEth: number };

const SEEDED_CAUSES: SeedCause[] = [
  {
    title: 'LGBTQs',
    description:
      'Safe housing, counselling, and mutual aid for queer and trans communities—transparent, verifiable fund flow.',
    goalEth: 25,
    raisedEth: 0,
  },
  {
    title: 'War',
    description: 'Emergency relief, medical supplies, and resettlement support for families affected by conflict.',
    goalEth: 50,
    raisedEth: 0,
  },
  {
    title: 'Disaster',
    description: 'Rapid response shelters, food, and infrastructure repair after climate and natural disasters.',
    goalEth: 40,
    raisedEth: 0,
  },
  {
    title: 'Hospital',
    description: 'Medical equipment, staff support, and patient care funds for public hospital networks.',
    goalEth: 75,
    raisedEth: 75,
  },
  {
    title: 'Education',
    description: 'Scholarships, supplies, and digital access for underserved students.',
    goalEth: 30,
    raisedEth: 9,
  },
];

function seedUsersIfEmpty(): boolean {
  const n = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  if (n.c > 0) return false;

  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  const ins = db.prepare(`INSERT INTO users (name, email, password_hash, role, anvil_index) VALUES (?,?,?,?,?)`);

  ins.run('Vaultex', 'admin@vaultex.local', hash, 'admin', VAULTEX_ADMIN_INDEX);

  const donors = [
    { name: 'Haha', email: 'haha@vaultex.local', idx: SEEDED_DONOR_INDICES[0] },
    { name: 'Sukhan', email: 'sukhan@vaultex.local', idx: SEEDED_DONOR_INDICES[1] },
    { name: 'Tasin', email: 'tasin@vaultex.local', idx: SEEDED_DONOR_INDICES[2] },
  ];
  for (const d of donors) ins.run(d.name, d.email, hash, 'donor', d.idx);

  const beneficiaries = [
    { name: 'City General Hospital', email: 'citygeneral@hospital.local', idx: BENEFICIARY_INDICES[0] },
    { name: 'Childrens Care Hospital', email: 'childrens@hospital.local', idx: BENEFICIARY_INDICES[1] },
    { name: 'Regional Medical Center', email: 'regional@hospital.local', idx: BENEFICIARY_INDICES[2] },
  ];
  for (const b of beneficiaries) ins.run(b.name, b.email, hash, 'beneficiary', b.idx);

  return true;
}

/**
 * Ensure the 5 “marketing” causes exist even when the DB already has users/causes.
 * This keeps `/causes/:id` details aligned with the Causes page prompts without requiring manual DB resets.
 */
export function seedCausesUpsert(): void {
  const existing = db
    .prepare(`SELECT id, title FROM causes WHERE active = 1 ORDER BY id ASC`)
    .all() as { id: number; title: string }[];

  const desiredTitles = new Set(SEEDED_CAUSES.map((c) => c.title));
  const existingDesired = new Set(existing.map((c) => c.title).filter((t) => desiredTitles.has(t)));

  // Reuse existing non-desired causes by rewriting them into missing desired causes (preserves ids for links).
  const reusable = existing.filter((c) => !desiredTitles.has(c.title));
  const missing = SEEDED_CAUSES.filter((c) => !existingDesired.has(c.title));

  const update = db.prepare(
    `UPDATE causes SET title = ?, description = ?, goal_eth = ?, raised_eth = ?, active = 1 WHERE id = ?`
  );
  let reused = 0;
  for (let i = 0; i < Math.min(reusable.length, missing.length); i++) {
    const row = reusable[i]!;
    const m = missing[i]!;
    update.run(m.title, m.description, m.goalEth, m.raisedEth, row.id);
    reused++;
  }

  // Insert any remaining missing causes.
  const insert = db.prepare(`INSERT INTO causes (title, description, goal_eth, raised_eth, active) VALUES (?,?,?,?,1)`);
  for (const m of missing.slice(reused)) {
    insert.run(m.title, m.description, m.goalEth, m.raisedEth);
  }
}

export function seedIfEmpty(): void {
  const seededUsers = seedUsersIfEmpty();
  seedCausesUpsert();

  if (seededUsers) {
    console.log('[seed] Seeded Vaultex admin + donors + beneficiaries + sample causes.');
    console.log('[seed] Vaultex vault (Anvil #0):', anvilAddress(SUPER_RICH_INDEX));
    console.log('[seed] Login with any seeded email; password:', DEMO_PASSWORD);
  }
}
