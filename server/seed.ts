import bcrypt from 'bcryptjs';
import { db } from './db.js';
import {
  ADMIN_INDICES,
  BENEFICIARY_INDICES,
  SUPER_RICH_INDEX,
  anvilAddress,
} from './anvil.js';

/** Shared demo password for every seeded account (capstone only). */
export const DEMO_PASSWORD = 'demo123';

export function seedIfEmpty(): void {
  const n = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  if (n.c > 0) return;

  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  const ins = db.prepare(
    `INSERT INTO users (name, email, password_hash, role, anvil_index) VALUES (?,?,?,?,?)`
  );

  const admins = [
    { name: 'Haha', email: 'haha@letsdonate.local', idx: ADMIN_INDICES[0] },
    { name: 'Sukhan', email: 'sukhan@letsdonate.local', idx: ADMIN_INDICES[1] },
    { name: 'Tasin', email: 'tasin@letsdonate.local', idx: ADMIN_INDICES[2] },
  ];
  for (const a of admins) {
    ins.run(a.name, a.email, hash, 'admin', a.idx);
  }

  const beneficiaries = [
    { name: 'City General Hospital', email: 'citygeneral@hospital.local', idx: BENEFICIARY_INDICES[0] },
    { name: 'Childrens Care Hospital', email: 'childrens@hospital.local', idx: BENEFICIARY_INDICES[1] },
    { name: 'Regional Medical Center', email: 'regional@hospital.local', idx: BENEFICIARY_INDICES[2] },
  ];
  for (const b of beneficiaries) {
    ins.run(b.name, b.email, hash, 'beneficiary', b.idx);
  }

  const causeIns = db.prepare(
    `INSERT INTO causes (title, description, goal_eth, raised_eth, active) VALUES (?,?,?,?,1)`
  );
  causeIns.run(
    'Baby Cancer Research',
    'Transparent funding for pediatric oncology trials and family support.',
    50,
    0
  );
  causeIns.run(
    'Clean Water Wells',
    'Building sustainable wells in underserved regions.',
    25,
    0
  );

  console.log('[seed] Seeded admins + beneficiaries + sample causes.');
  console.log('[seed] Donation vault (Anvil #0):', anvilAddress(SUPER_RICH_INDEX));
  console.log('[seed] Login with any seeded email; password:', DEMO_PASSWORD);
}
