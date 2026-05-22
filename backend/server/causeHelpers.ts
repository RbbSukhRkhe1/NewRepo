import { db } from './db.js';

export type FundCoverLine = { label: string; weight: number };

export type CauseDbRow = {
  id: number;
  title: string;
  description: string;
  goal_eth: number;
  raised_eth: number;
  image_url: string | null;
  active: number;
  created_at: string;
  beneficiary_user_id: number | null;
  impact_story_title: string | null;
  impact_story_body: string | null;
  about_body: string | null;
  funds_cover: string | null;
  milestones: string | null;
  verification_points: string | null;
  category_tag: string | null;
  location_tag: string | null;
  campaign_end_date: string | null;
};

export type CauseDetailFields = {
  about_body: string;
  funds_cover: FundCoverLine[];
  milestones: string[];
  verification_points: string[];
  category_tag: string;
  location_tag: string;
  campaign_end_date: string | null;
  days_left: number | null;
  donor_count: number;
};

function parseJsonArray(raw: string | null): unknown[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseFundsCoverJson(raw: string | null): FundCoverLine[] {
  return parseJsonArray(raw)
    .map((item) => {
      if (item == null || typeof item !== 'object') return null;
      const o = item as { label?: unknown; weight?: unknown };
      const label = String(o.label ?? '').trim();
      const weight = Number(o.weight);
      if (!label || !Number.isFinite(weight) || weight <= 0) return null;
      return { label, weight };
    })
    .filter((x): x is FundCoverLine => x != null);
}

export function parseStringListJson(raw: string | null): string[] {
  return parseJsonArray(raw)
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);
}

export function computeDaysLeft(campaignEndDate: string | null | undefined): number | null {
  const raw = campaignEndDate?.trim();
  if (!raw) return null;
  const end = new Date(`${raw}T23:59:59Z`);
  if (Number.isNaN(end.getTime())) return null;
  const diff = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

export function donorCountByCauseId(): Map<number, number> {
  const rows = db
    .prepare(
      `SELECT cause_id, COUNT(DISTINCT from_display_name) AS donor_count
       FROM ledger_entries
       WHERE kind = 'donation_in'
         AND cause_id IS NOT NULL
         AND from_display_name IS NOT NULL
         AND TRIM(from_display_name) <> ''
       GROUP BY cause_id`,
    )
    .all() as { cause_id: number; donor_count: number }[];
  return new Map(rows.map((r) => [r.cause_id, Number(r.donor_count) || 0]));
}

export function beneficiaryNameById(id: number | null | undefined): string | null {
  if (id == null) return null;
  const row = db.prepare(`SELECT name FROM users WHERE id = ? AND role = 'beneficiary'`).get(id) as
    | { name: string }
    | undefined;
  return row?.name ?? null;
}

export function parseCauseDetailInput(body: {
  aboutBody?: unknown;
  fundsCover?: unknown;
  milestones?: unknown;
  verificationPoints?: unknown;
  categoryTag?: unknown;
  locationTag?: unknown;
  campaignEndDate?: unknown;
}):
  | { ok: true; value: Omit<CauseDetailFields, 'days_left' | 'donor_count'> }
  | { ok: false; error: string } {
  const aboutBody = String(body.aboutBody ?? '').trim();
  if (!aboutBody) return { ok: false, error: 'aboutBody required' };

  const categoryTag = String(body.categoryTag ?? '').trim();
  if (!categoryTag) return { ok: false, error: 'categoryTag required' };

  const locationTag = String(body.locationTag ?? '').trim();
  if (!locationTag) return { ok: false, error: 'locationTag required' };

  const fundsCoverRaw = body.fundsCover;
  if (!Array.isArray(fundsCoverRaw) || fundsCoverRaw.length === 0) {
    return { ok: false, error: 'fundsCover must be a non-empty array' };
  }
  const fundsCover: FundCoverLine[] = [];
  for (const item of fundsCoverRaw) {
    if (item == null || typeof item !== 'object') {
      return { ok: false, error: 'Each fundsCover item needs label and weight' };
    }
    const o = item as { label?: unknown; weight?: unknown };
    const label = String(o.label ?? '').trim();
    const weight = Number(o.weight);
    if (!label) return { ok: false, error: 'Each fundsCover item needs a label' };
    if (!Number.isFinite(weight) || weight <= 0) {
      return { ok: false, error: 'Each fundsCover weight must be a positive number' };
    }
    fundsCover.push({ label, weight });
  }
  const weightSum = fundsCover.reduce((s, f) => s + f.weight, 0);
  if (Math.abs(weightSum - 100) > 0.01) {
    return { ok: false, error: 'fundsCover weights must sum to 100' };
  }

  const milestonesRaw = body.milestones;
  if (!Array.isArray(milestonesRaw) || milestonesRaw.length === 0) {
    return { ok: false, error: 'milestones must be a non-empty array' };
  }
  const milestones = milestonesRaw.map((m) => String(m ?? '').trim()).filter(Boolean);
  if (milestones.length === 0) return { ok: false, error: 'milestones must contain at least one item' };

  const verificationRaw = body.verificationPoints;
  if (!Array.isArray(verificationRaw) || verificationRaw.length === 0) {
    return { ok: false, error: 'verificationPoints must be a non-empty array' };
  }
  const verificationPoints = verificationRaw.map((m) => String(m ?? '').trim()).filter(Boolean);
  if (verificationPoints.length === 0) {
    return { ok: false, error: 'verificationPoints must contain at least one item' };
  }

  let campaignEndDate: string | null = null;
  if (body.campaignEndDate != null && String(body.campaignEndDate).trim()) {
    const raw = String(body.campaignEndDate).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return { ok: false, error: 'campaignEndDate must be YYYY-MM-DD' };
    }
    const parsed = new Date(`${raw}T12:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return { ok: false, error: 'Invalid campaignEndDate' };
    campaignEndDate = raw;
  }

  return {
    ok: true,
    value: {
      about_body: aboutBody,
      funds_cover: fundsCover,
      milestones,
      verification_points: verificationPoints,
      category_tag: categoryTag,
      location_tag: locationTag,
      campaign_end_date: campaignEndDate,
    },
  };
}

export function serializeCauseDetailFields(
  detail: Omit<CauseDetailFields, 'days_left' | 'donor_count'>,
): {
  about_body: string;
  funds_cover: string;
  milestones: string;
  verification_points: string;
  category_tag: string;
  location_tag: string;
  campaign_end_date: string | null;
} {
  return {
    about_body: detail.about_body,
    funds_cover: JSON.stringify(detail.funds_cover),
    milestones: JSON.stringify(detail.milestones),
    verification_points: JSON.stringify(detail.verification_points),
    category_tag: detail.category_tag,
    location_tag: detail.location_tag,
    campaign_end_date: detail.campaign_end_date,
  };
}

export function enrichCauseRow<T extends CauseDbRow>(
  row: T,
  donorMap?: Map<number, number>,
): T & CauseDetailFields & { beneficiary_name: string | null } {
  const beneficiaryName = beneficiaryNameById(row.beneficiary_user_id);
  const fundsCover = parseFundsCoverJson(row.funds_cover);
  const milestones = parseStringListJson(row.milestones);
  const verificationPoints = parseStringListJson(row.verification_points);
  return {
    ...row,
    beneficiary_name: beneficiaryName,
    impact_story_title: row.impact_story_title?.trim() || row.title,
    impact_story_body: row.impact_story_body?.trim() || row.description,
    about_body: row.about_body?.trim() || row.description,
    funds_cover: fundsCover,
    milestones,
    verification_points: verificationPoints,
    category_tag: row.category_tag?.trim() || 'Fundraising',
    location_tag: row.location_tag?.trim() || beneficiaryName || 'Community',
    campaign_end_date: row.campaign_end_date?.trim() || null,
    days_left: computeDaysLeft(row.campaign_end_date),
    donor_count: donorMap?.get(row.id) ?? 0,
  };
}

export function resolveBeneficiaryForCause(causeId: number): {
  id: number;
  title: string;
  beneficiary_user_id: number;
  beneficiary_name: string;
  beneficiary_anvil_index: number;
} | null {
  const row = db
    .prepare(
      `SELECT c.id, c.title, c.beneficiary_user_id, u.name AS beneficiary_name, u.anvil_index AS beneficiary_anvil_index
       FROM causes c
       INNER JOIN users u ON u.id = c.beneficiary_user_id AND u.role = 'beneficiary'
       WHERE c.id = ? AND c.active = 1`,
    )
    .get(causeId) as
    | {
        id: number;
        title: string;
        beneficiary_user_id: number;
        beneficiary_name: string;
        beneficiary_anvil_index: number | null;
      }
    | undefined;
  if (!row?.beneficiary_anvil_index) return null;
  return {
    id: row.id,
    title: row.title,
    beneficiary_user_id: row.beneficiary_user_id,
    beneficiary_name: row.beneficiary_name,
    beneficiary_anvil_index: row.beneficiary_anvil_index,
  };
}

export function assertBeneficiaryUserId(
  beneficiaryUserId: unknown,
): { ok: true; value: number } | { ok: false; error: string } {
  const id = Number(beneficiaryUserId);
  if (!Number.isFinite(id) || id <= 0) {
    return { ok: false, error: 'beneficiaryUserId required' };
  }
  const row = db.prepare(`SELECT id FROM users WHERE id = ? AND role = 'beneficiary'`).get(id) as
    | { id: number }
    | undefined;
  if (!row) return { ok: false, error: 'Beneficiary not found' };
  return { ok: true, value: id };
}
