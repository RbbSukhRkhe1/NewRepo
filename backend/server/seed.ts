import bcrypt from 'bcryptjs';
import { db } from './db.js';
import {
  SEEDED_DONOR_INDICES,
  BENEFICIARY_INDICES,
  SUPER_RICH_INDEX,
  anvilAddress,
} from './anvil.js';
import type { FundCoverLine } from './causeHelpers.js';

/** Shared demo password for every seeded account (capstone only). */
export const DEMO_PASSWORD = 'demo123';

type SeedCause = {
  title: string;
  description: string;
  goalEth: number;
  raisedEth: number;
  imageUrl?: string | null;
  beneficiaryEmail: string;
  impactStoryTitle: string;
  impactStoryBody: string;
  aboutBody: string;
  fundsCover: FundCoverLine[];
  milestones: string[];
  verificationPoints: string[];
  categoryTag: string;
  locationTag: string;
  campaignEndDate: string;
};

const SEEDED_CAUSES: SeedCause[] = [
  {
    title: 'LGBTQs',
    description:
      'Safe housing, counselling, and mutual aid for queer and trans communities—transparent, verifiable fund flow.',
    goalEth: 25,
    raisedEth: 0,
    imageUrl: '/samples/causes/lgbtqs.jpg',
    beneficiaryEmail: 'childrens@hospital.local',
    impactStoryTitle: 'Community first',
    impactStoryBody:
      'Local partners provide safe shelter and trauma-informed counseling while every disbursement stays visible on-chain for community oversight.',
    aboutBody:
      'Queer and trans communities deserve fast, practical relief: safe housing, trauma-informed counselling, crisis support, and community mutual aid. Vaultex routes every gift on-chain—so you can trace funding from wallet to outcome, not guesswork.',
    fundsCover: [
      { label: 'Emergency accommodation vouchers and short-term housing support', weight: 38 },
      { label: 'Trauma-informed counselling sessions and crisis hotlines', weight: 27 },
      { label: 'Legal/admin support for safety planning and identity documentation', weight: 21 },
      { label: 'Community mutual-aid grants for food, transport, and essentials', weight: 14 },
    ],
    milestones: [
      '50 emergency nights of safe housing funded',
      '120 counselling sessions with vetted providers',
      '200 mutual-aid microgrants to verified recipients',
    ],
    verificationPoints: [
      'Beneficiary verification before disbursement',
      'Every donation and payout recorded in the ledger',
      'Clear monthly recap of allocations and remaining budget',
    ],
    categoryTag: 'Community',
    locationTag: 'Sydney, AU',
    campaignEndDate: '2026-06-24',
  },
  {
    title: 'War',
    description: 'Emergency relief, medical supplies, and resettlement support for families affected by conflict.',
    goalEth: 50,
    raisedEth: 0,
    imageUrl: '/Photos/War.jpg',
    beneficiaryEmail: 'regional@hospital.local',
    impactStoryTitle: 'Relief corridors',
    impactStoryBody:
      'Donations route to vetted frontline responders delivering medical kits, evacuation transport, and essential family support in active conflict zones.',
    aboutBody:
      'Emergency relief for families under conflict: medical supplies, evacuation help, shelter, and essentials. Aid moves with transparent records—so “black box” logistics give way to accountable, donor-visible support.',
    fundsCover: [
      { label: 'Medical kits, trauma care supplies, and local clinic support', weight: 38 },
      { label: 'Shelter and temporary accommodation for displaced families', weight: 27 },
      { label: 'Evacuation/transport assistance and family reunification support', weight: 21 },
      { label: 'Essential goods: food, water, hygiene, and winter supplies', weight: 14 },
    ],
    milestones: [
      'Deliver 500 family relief packs through verified partners',
      'Support 3 clinics with critical medical restocks',
      'Provide 200 safe-transport vouchers for displacement routes',
    ],
    verificationPoints: [
      'Partner vetting and documented distribution plans',
      'Ledger-linked disbursements with recipient category labels',
      'Post-disbursement updates with proof artifacts where safe',
    ],
    categoryTag: 'Humanitarian',
    locationTag: 'Regional',
    campaignEndDate: '2026-06-23',
  },
  {
    title: 'Disaster',
    description: 'Rapid response shelters, food, and rebuilding after climate and natural disasters.',
    goalEth: 40,
    raisedEth: 0,
    imageUrl: '/Photos/Disaster.jpg',
    beneficiaryEmail: 'regional@hospital.local',
    impactStoryTitle: 'Rapid response',
    impactStoryBody:
      'Emergency wallets release rapid aid for shelter, food, and clean water after floods and storms, with proof-backed spending published in real time.',
    aboutBody:
      'When climate and disasters strike, speed matters—shelter, food and water, power where it counts, and early rebuilding. Every deployment pairs rapid assistance with a public ledger you can actually audit.',
    fundsCover: [
      { label: 'Emergency shelter materials and short-term housing support', weight: 38 },
      { label: 'Food, clean water, and sanitation supplies', weight: 27 },
      { label: 'Power/communications: charging stations, generators, and fuel', weight: 21 },
      { label: 'Early recovery: repairs, tools, and rebuilding essentials', weight: 14 },
    ],
    milestones: [
      'Deploy a 72-hour rapid-response kit for 1,000 people',
      'Restore clean water access for 3 affected communities',
      'Fund 100 home-repair microgrants for immediate recovery',
    ],
    verificationPoints: [
      'Pre-approved vendor list and price caps where possible',
      'Ledger entries tagged by disaster event and category',
      'Receipts and delivery confirmations attached to updates',
    ],
    categoryTag: 'Disaster Relief',
    locationTag: 'Pacific region',
    campaignEndDate: '2026-06-27',
  },
  {
    title: 'Hospital',
    description: 'Medical equipment, staff support, and patient care funds for public hospital networks.',
    goalEth: 75,
    raisedEth: 75,
    imageUrl: '/Photos/Hospital.jpg',
    beneficiaryEmail: 'citygeneral@hospital.local',
    impactStoryTitle: 'Care capacity',
    impactStoryBody:
      'Funds equip wards with monitors, pumps, and calibration cycles so clinicians can treat more patients with verifiable disbursement trails.',
    aboutBody:
      'Strengthens frontline hospitals: critical equipment, patient transport and care support, and compliance-safe maintenance. Purchasing and payouts stay visible—so donors see shortages addressed with receipts, not rhetoric.',
    fundsCover: [
      { label: 'Critical equipment: monitors, infusion pumps, and consumables', weight: 38 },
      { label: 'Patient support funds for essential care and transport', weight: 27 },
      { label: 'Staff support resources during surge periods', weight: 21 },
      { label: 'Maintenance, calibration, and safety compliance costs', weight: 14 },
    ],
    milestones: [
      'Purchase and deploy essential equipment bundles for one ward',
      'Fund 150 patient transport/support vouchers',
      'Publish an outcomes recap with procurement list and totals',
    ],
    verificationPoints: [
      'Procurement list with unit pricing and supplier details',
      'Disbursements tied to specific purchase batches',
      'Quarterly audit-friendly summary (totals + remaining budget)',
    ],
    categoryTag: 'Healthcare',
    locationTag: 'City General',
    campaignEndDate: '2026-08-01',
  },
  {
    title: 'Education',
    description: 'Scholarships, supplies, and digital access for underserved students.',
    goalEth: 30,
    raisedEth: 9,
    imageUrl: '/samples/causes/education.jpg',
    beneficiaryEmail: 'childrens@hospital.local',
    impactStoryTitle: 'Every learner',
    impactStoryBody:
      'Funds cover tuition gaps, learning kits, and connected devices so students in underserved regions can stay in class and finish terms.',
    aboutBody:
      'Widens access to learning: scholarships, supplies, devices, and connectivity for students who need it most. Budget lines stay explicit—see what was funded, for whom, and when—straight from the ledger.',
    fundsCover: [
      { label: 'Scholarships and fee support for underserved students', weight: 38 },
      { label: 'School supplies: books, uniforms, stationery, and devices', weight: 27 },
      { label: 'Connectivity: data plans, hotspots, and shared learning labs', weight: 21 },
      { label: 'Mentorship and tutoring programs with verified providers', weight: 14 },
    ],
    milestones: [
      'Fund 50 school supply bundles for the next term',
      'Provide 30 devices + connectivity for remote learners',
      'Sponsor 100 hours of tutoring and mentorship sessions',
    ],
    verificationPoints: [
      'Eligibility checks and documented distribution criteria',
      'Ledger-tracked disbursements by category',
      'Term-by-term impact recap (recipients served + spend breakdown)',
    ],
    categoryTag: 'Education',
    locationTag: 'Remote AU',
    campaignEndDate: '2026-07-03',
  },
];

function seedUsersIfEmpty(): boolean {
  const n = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  if (n.c > 0) return false;

  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  const ins = db.prepare(`INSERT INTO users (name, email, password_hash, role, anvil_index) VALUES (?,?,?,?,?)`);

  ins.run('Vaultex', 'admin@vaultex.local', hash, 'admin', SUPER_RICH_INDEX);

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

function beneficiaryIdByEmail(email: string): number | null {
  const row = db.prepare(`SELECT id FROM users WHERE email = ? AND role = 'beneficiary'`).get(email) as
    | { id: number }
    | undefined;
  return row?.id ?? null;
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
    `UPDATE causes SET
      description = ?, goal_eth = ?, image_url = ?, beneficiary_user_id = ?,
      impact_story_title = ?, impact_story_body = ?,
      about_body = ?, funds_cover = ?, milestones = ?, verification_points = ?,
      category_tag = ?, location_tag = ?, campaign_end_date = ?
     WHERE id = ?`,
  );
  const insert = db.prepare(
    `INSERT INTO causes (
      title, description, goal_eth, raised_eth, image_url, active,
      beneficiary_user_id, impact_story_title, impact_story_body,
      about_body, funds_cover, milestones, verification_points,
      category_tag, location_tag, campaign_end_date
    ) VALUES (?,?,?,?,?,1,?,?,?,?,?,?,?,?,?,?)`,
  );
  const migrateLedger = db.prepare(`UPDATE ledger_entries SET cause_id = ? WHERE cause_id = ?`);
  const mergeRaisedEth = db.prepare(
    `UPDATE causes SET raised_eth = raised_eth + ? WHERE id = ?`,
  );
  const readRaisedEth = db.prepare(`SELECT raised_eth FROM causes WHERE id = ?`);
  const deleteCause = db.prepare(`DELETE FROM causes WHERE id = ?`);

  for (const seed of SEEDED_CAUSES) {
    const beneficiaryId = beneficiaryIdByEmail(seed.beneficiaryEmail);
    const fundsCoverJson = JSON.stringify(seed.fundsCover);
    const milestonesJson = JSON.stringify(seed.milestones);
    const verificationJson = JSON.stringify(seed.verificationPoints);
    const rows = selectByTitle.all(seed.title) as { id: number; active: number }[];

    if (rows.length === 0) {
      insert.run(
        seed.title,
        seed.description,
        seed.goalEth,
        seed.raisedEth,
        seed.imageUrl ?? null,
        beneficiaryId,
        seed.impactStoryTitle,
        seed.impactStoryBody,
        seed.aboutBody,
        fundsCoverJson,
        milestonesJson,
        verificationJson,
        seed.categoryTag,
        seed.locationTag,
        seed.campaignEndDate,
      );
      continue;
    }

    const canonical = rows[0]!;
    updateCanonical.run(
      seed.description,
      seed.goalEth,
      seed.imageUrl ?? null,
      beneficiaryId,
      seed.impactStoryTitle,
      seed.impactStoryBody,
      seed.aboutBody,
      fundsCoverJson,
      milestonesJson,
      verificationJson,
      seed.categoryTag,
      seed.locationTag,
      seed.campaignEndDate,
      canonical.id,
    );

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

  // Backfill beneficiary + impact story on any active cause missing them (e.g. admin-created before migration).
  const orphans = db
    .prepare(`SELECT id, title, description FROM causes WHERE beneficiary_user_id IS NULL ORDER BY id ASC`)
    .all() as { id: number; title: string; description: string }[];
  const fallbackBeneficiary = beneficiaryIdByEmail('regional@hospital.local');
  const backfill = db.prepare(
    `UPDATE causes SET beneficiary_user_id = ?, impact_story_title = COALESCE(impact_story_title, ?), impact_story_body = COALESCE(impact_story_body, ?) WHERE id = ?`,
  );
  for (const row of orphans) {
    backfill.run(
      fallbackBeneficiary,
      row.title,
      row.description,
      row.id,
    );
  }
}

/** Admin wallet is the vault (Anvil #0); backfill legacy rows that used index 1. */
function ensureAdminVaultIndex(): void {
  db.prepare(
    `UPDATE users SET anvil_index = ? WHERE role = 'admin' AND (anvil_index IS NULL OR anvil_index != ?)`,
  ).run(SUPER_RICH_INDEX, SUPER_RICH_INDEX);
}

export function seedIfEmpty(): void {
  const seededUsers = seedUsersIfEmpty();
  ensureAdminVaultIndex();
  seedCausesUpsert();

  if (seededUsers) {
    console.log('[seed] Seeded Vaultex admin + donors + beneficiaries + sample causes.');
    console.log('[seed] Admin + vault wallet (Anvil #0):', anvilAddress(SUPER_RICH_INDEX));
    console.log('[seed] Login with any seeded email; password:', DEMO_PASSWORD);
  }
}
