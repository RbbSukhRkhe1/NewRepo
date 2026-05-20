import bcrypt from 'bcryptjs';
import { db } from './db.js';
import {
  VAULTEX_ADMIN_INDEX,
  SEEDED_DONOR_INDICES,
  BENEFICIARY_INDICES,
  SUPER_RICH_INDEX,
  anvilAddress,
} from './anvil.js';
import { ensureCauseWallets } from './causeWallets.js';

/** Shared demo password for every seeded account (capstone only). */
export const DEMO_PASSWORD = 'demo123';

type SeedCause = {
  title: string;
  description: string;
  goalEth: number;
  raisedEth: number;
  /** Hero: site path (under frontend/public) or https URL */
  imageUrl?: string | null;
};

const SEEDED_CAUSES: SeedCause[] = [
  {
    title: 'LGBTQs',
    description:
      'Safe housing, counselling, and mutual aid for queer and trans communities—transparent, verifiable fund flow.',
    goalEth: 25,
    raisedEth: 0,
    imageUrl: '/samples/causes/lgbtqs.jpg',
  },
  {
    title: 'War',
    description: 'Emergency relief, medical supplies, and resettlement support for families affected by conflict.',
    goalEth: 50,
    raisedEth: 0,
    imageUrl: '/Photos/War.jpg',
  },
  {
    title: 'Disaster',
    description: 'Rapid response shelters, food, and infrastructure repair after climate and natural disasters.',
    goalEth: 40,
    raisedEth: 0,
    imageUrl: '/Photos/Disaster.jpg',
  },
  {
    title: 'Hospital',
    description: 'Medical equipment, staff support, and patient care funds for public hospital networks.',
    goalEth: 75,
    raisedEth: 75,
    imageUrl: '/Photos/Hospital.jpg',
  },
  {
    title: 'Education',
    description: 'Scholarships, supplies, and digital access for underserved students.',
    goalEth: 30,
    raisedEth: 9,
    imageUrl: '/samples/causes/education.jpg',
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
 * Uses title as the stable key: one row per seeded title, preserves admin active/inactive,
 * and merges duplicate rows created by older seed logic.
 */
export function seedCausesUpsert(): void {
  const selectByTitle = db.prepare(
    `SELECT id, active FROM causes WHERE title = ? ORDER BY id ASC`,
  );
  const updateCanonical = db.prepare(
    `UPDATE causes SET description = ?, goal_eth = ?, image_url = ? WHERE id = ?`,
  );
  const insert = db.prepare(
    `INSERT INTO causes (title, description, goal_eth, raised_eth, image_url, active) VALUES (?,?,?,?,?,1)`,
  );
  const migrateLedger = db.prepare(`UPDATE ledger_entries SET cause_id = ? WHERE cause_id = ?`);
  const mergeRaisedEth = db.prepare(
    `UPDATE causes SET raised_eth = raised_eth + ? WHERE id = ?`,
  );
  const readRaisedEth = db.prepare(`SELECT raised_eth FROM causes WHERE id = ?`);
  const deleteCause = db.prepare(`DELETE FROM causes WHERE id = ?`);

  for (const seed of SEEDED_CAUSES) {
    const rows = selectByTitle.all(seed.title) as { id: number; active: number }[];

    if (rows.length === 0) {
      insert.run(seed.title, seed.description, seed.goalEth, seed.raisedEth, seed.imageUrl ?? null);
      continue;
    }

    const canonical = rows[0]!;
    updateCanonical.run(seed.description, seed.goalEth, seed.imageUrl ?? null, canonical.id);

    for (const dup of rows.slice(1)) {
      migrateLedger.run(canonical.id, dup.id);
      const raised = readRaisedEth.get(dup.id) as { raised_eth: number } | undefined;
      if (raised && raised.raised_eth > 0) {
        mergeRaisedEth.run(raised.raised_eth, canonical.id);
      }
      deleteCause.run(dup.id);
    }
  }

  const pushSeedHeroes = db.prepare(`UPDATE causes SET image_url = ? WHERE title = ?`);
  for (const c of SEEDED_CAUSES) {
    if (c.imageUrl) pushSeedHeroes.run(c.imageUrl, c.title);
  }
  ensureCauseWallets();
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
