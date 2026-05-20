import { db } from '../db.js';
import { maskAddr } from '../resolve.js';

export type LedgerKind = 'donation_in' | 'disbursement_out' | 'chain_sync';

export type LedgerV2Row = {
  id: number;
  tx_hash: string;
  block_number: number | null;
  from_addr: string;
  to_addr: string;
  value_eth: string;
  kind: LedgerKind;
  cause_id: number | null;
  from_display_name: string | null;
  to_display_name: string | null;
  cause_name: string | null;
  memo: string | null;
  recorded_at: string;
  tags: string | null;
  reference: string | null;
  narrative: string | null;
  linked_tx_ids: string | null;
  aggregated_from: string | null;
};

export type AggregatedDonorSummary = {
  initials: string;
  amountEth: string;
};

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function maskedInitial(name: string | null | undefined): string {
  const t = (name ?? '').trim();
  if (!t) return 'Anonymous';
  // Privacy logic: we only expose initials for other users.
  // (Full name can be shown only to the current user on the client.)
  return t[0]!.toUpperCase();
}

export function ledgerReference(kind: LedgerKind, txHash: string): string {
  const short = txHash.replace(/^0x/i, '').slice(0, 10).toUpperCase();
  if (kind === 'donation_in') return `DON-${short}`;
  if (kind === 'disbursement_out') return `DIS-${short}`;
  return `CHN-${short}`;
}

export function buildNarrative(input: {
  kind: LedgerKind;
  fromDisplay: string;
  toDisplay: string;
  amountEth: string;
  causeName?: string | null;
  utilization?: { disbursedEth: number; donatedEth: number } | null;
  memo?: string | null;
}): string {
  const cause = (input.causeName ?? '').trim();
  const causePart = cause ? ` (Cause: ${cause})` : '';
  if (input.kind === 'donation_in') {
    return `${input.fromDisplay} donated ${input.amountEth} ETH to VAULTEX${causePart}.`;
  }
  if (input.kind === 'disbursement_out') {
    const u = input.utilization;
    const utilPart =
      u && u.donatedEth > 0
        ? ` (Cause Utilization: ${u.disbursedEth.toFixed(4)}/${u.donatedEth.toFixed(4)} ETH)`
        : '';
    const memoPart = input.memo ? ` Note: ${input.memo}` : '';
    return `VAULTEX disbursed ${input.amountEth} ETH to ${input.toDisplay}${causePart}${utilPart}.${memoPart}`.trim();
  }
  return `On-chain transfer of ${input.amountEth} ETH from ${input.fromDisplay} to ${input.toDisplay}${causePart}.`;
}

function causeTotals(causeId: number): { donatedEth: number; disbursedEth: number } {
  const row = db
    .prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN kind = 'donation_in' THEN CAST(value_eth AS REAL) ELSE 0 END), 0) AS donated,
        COALESCE(SUM(CASE WHEN kind = 'disbursement_out' THEN CAST(value_eth AS REAL) ELSE 0 END), 0) AS disbursed
       FROM ledger_entries
       WHERE cause_id = ?`
    )
    .get(causeId) as { donated: number; disbursed: number };
  return { donatedEth: Number(row.donated) || 0, disbursedEth: Number(row.disbursed) || 0 };
}

export function linkDisbursementToDonations(params: {
  disbursementTxHash: string;
  causeId: number;
  amountEth: number;
}): { linkedIds: number[]; aggregated: AggregatedDonorSummary[] } {
  // Single-disbursement snapshot (ignores earlier disbursements). Prefer
  // recomputeDisbursementLinksForCause() for correct FIFO allocation.
  const donations = db
    .prepare(
      `SELECT id, value_eth, from_display_name
       FROM ledger_entries
       WHERE kind = 'donation_in' AND cause_id = ?
       ORDER BY recorded_at ASC, id ASC
       LIMIT 200`
    )
    .all(params.causeId) as { id: number; value_eth: string; from_display_name: string | null }[];

  let remaining = params.amountEth;
  const linked: number[] = [];
  const aggMap = new Map<string, number>();

  for (const d of donations) {
    if (remaining <= 0) break;
    const v = Number.parseFloat(d.value_eth);
    if (!Number.isFinite(v) || v <= 0) continue;
    const use = Math.min(v, remaining);
    remaining -= use;
    linked.push(d.id);
    const init = maskedInitial(d.from_display_name);
    aggMap.set(init, (aggMap.get(init) ?? 0) + use);
  }

  const aggregated: AggregatedDonorSummary[] = [...aggMap.entries()]
    .map(([initials, amount]) => ({ initials, amountEth: amount.toFixed(6).replace(/\.?0+$/, '') }))
    .sort((a, b) => Number.parseFloat(b.amountEth) - Number.parseFloat(a.amountEth));

  return { linkedIds: linked, aggregated };
}

/**
 * Recompute linked_tx_ids + aggregated_from for every disbursement on a cause using
 * FIFO donation liquidity (oldest donations first, respecting prior disbursements).
 */
export function recomputeDisbursementLinksForCause(causeId: number): void {
  const disbs = db
    .prepare(
      `SELECT id, value_eth, recorded_at FROM ledger_entries
       WHERE kind = 'disbursement_out' AND cause_id = ?
       ORDER BY recorded_at ASC, id ASC`
    )
    .all(causeId) as { id: number; value_eth: string; recorded_at: string }[];

  const donations = db
    .prepare(
      `SELECT id, value_eth, from_display_name FROM ledger_entries
       WHERE kind = 'donation_in' AND cause_id = ?
       ORDER BY recorded_at ASC, id ASC`
    )
    .all(causeId) as { id: number; value_eth: string; from_display_name: string | null }[];

  const pool = donations.map((d) => ({
    id: d.id,
    rem: Math.max(0, Number.parseFloat(d.value_eth) || 0),
    from_display_name: d.from_display_name,
  }));

  const upd = db.prepare(
    `UPDATE ledger_entries SET linked_tx_ids = ?, aggregated_from = ? WHERE id = ?`
  );

  for (const disb of disbs) {
    let need = Number.parseFloat(disb.value_eth);
    if (!Number.isFinite(need) || need <= 0) {
      upd.run('[]', '[]', disb.id);
      continue;
    }
    const linked: number[] = [];
    const aggMap = new Map<string, number>();
    for (const p of pool) {
      if (need <= 0) break;
      if (p.rem <= 0) continue;
      const use = Math.min(p.rem, need);
      if (use <= 0) continue;
      p.rem -= use;
      need -= use;
      linked.push(p.id);
      const init = maskedInitial(p.from_display_name);
      aggMap.set(init, (aggMap.get(init) ?? 0) + use);
    }
    const aggregated: AggregatedDonorSummary[] = [...aggMap.entries()]
      .map(([initials, amount]) => ({
        initials,
        amountEth: amount.toFixed(6).replace(/\.?0+$/, ''),
      }))
      .sort((a, b) => Number.parseFloat(b.amountEth) - Number.parseFloat(a.amountEth));
    upd.run(JSON.stringify(linked), JSON.stringify(aggregated), disb.id);
  }
}

export function recomputeAllDisbursementLinks(): void {
  const rows = db
    .prepare(
      `SELECT DISTINCT cause_id AS causeId FROM ledger_entries
       WHERE kind = 'disbursement_out' AND cause_id IS NOT NULL`
    )
    .all() as { causeId: number }[];
  for (const r of rows) {
    recomputeDisbursementLinksForCause(Number(r.causeId));
  }
}

export function enrichLedgerRow(row: LedgerV2Row): LedgerV2Row {
  const ref = row.reference?.trim() || ledgerReference(row.kind, row.tx_hash);

  const fromDisplay = row.from_display_name?.trim() || maskAddr(row.from_addr);
  const toDisplay = row.to_display_name?.trim() || maskAddr(row.to_addr);

  const util =
    row.kind === 'disbursement_out' && row.cause_id != null ? causeTotals(row.cause_id) : null;

  const narrative =
    row.narrative?.trim() ||
    buildNarrative({
      kind: row.kind,
      fromDisplay,
      toDisplay,
      amountEth: row.value_eth,
      causeName: row.cause_name,
      utilization: util,
      memo: row.memo,
    });

  return { ...row, reference: ref, narrative };
}

export function backfillLedgerV2Defaults(): void {
  // Ensure pre-existing rows have reference/narrative populated.
  const rows = db
    .prepare(
      `SELECT
        id, tx_hash, block_number, from_addr, to_addr, value_eth, kind, cause_id,
        from_display_name, to_display_name, cause_name, memo, recorded_at,
        tags, reference, narrative, linked_tx_ids, aggregated_from
       FROM ledger_entries
       WHERE reference IS NULL OR reference = '' OR narrative IS NULL OR narrative = ''`
    )
    .all() as LedgerV2Row[];

  const upd = db.prepare(
    `UPDATE ledger_entries
     SET reference = ?, narrative = ?
     WHERE id = ?`
  );

  const tx = db.transaction(() => {
    for (const r of rows) {
      const e = enrichLedgerRow(r);
      upd.run(e.reference, e.narrative, r.id);
    }
  });
  tx();
}

export type LedgerSearchParams = {
  q?: string;
  kind?: LedgerKind;
  causeId?: number;
  reference?: string;
  tag?: string;
  startIso?: string;
  endIso?: string;
  limit?: number;
  offset?: number;
};

export function searchLedgerV2(params: LedgerSearchParams): LedgerV2Row[] {
  const limit = Math.min(Math.max(params.limit ?? 200, 1), 500);
  const offset = Math.max(params.offset ?? 0, 0);

  const where: string[] = [];
  const args: unknown[] = [];

  if (params.kind) {
    where.push('le.kind = ?');
    args.push(params.kind);
  }
  if (params.causeId != null) {
    where.push('le.cause_id = ?');
    args.push(params.causeId);
  }
  if (params.reference?.trim()) {
    where.push('le.reference = ?');
    args.push(params.reference.trim());
  }
  if (params.tag?.trim()) {
    // tags stored as JSON text array; use substring match for now.
    where.push(`COALESCE(le.tags,'') LIKE ?`);
    args.push(`%${params.tag.trim()}%`);
  }
  if (params.startIso?.trim()) {
    where.push(`le.recorded_at >= ?`);
    args.push(params.startIso.trim().replace('T', ' ').replace('Z', ''));
  }
  if (params.endIso?.trim()) {
    where.push(`le.recorded_at <= ?`);
    args.push(params.endIso.trim().replace('T', ' ').replace('Z', ''));
  }

  const hasQ = Boolean(params.q?.trim());
  const q = (params.q ?? '').trim();

  const baseSelect = `
    SELECT
      le.id, le.tx_hash, le.block_number, le.from_addr, le.to_addr, le.value_eth, le.kind, le.cause_id,
      le.from_display_name, le.to_display_name, le.cause_name, le.memo, le.recorded_at,
      le.tags, le.reference, le.narrative, le.linked_tx_ids, le.aggregated_from
    FROM ledger_entries le
  `;

  let sql = baseSelect;
  if (hasQ) {
    sql += ` JOIN ledger_entries_fts fts ON fts.rowid = le.id`;
    where.push(`fts MATCH ?`);
    args.push(q);
  }
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
  sql += ` ORDER BY le.recorded_at DESC, le.id DESC LIMIT ? OFFSET ?`;
  args.push(limit, offset);

  const rows = db.prepare(sql).all(...args) as LedgerV2Row[];
  return rows.map(enrichLedgerRow);
}

export type CauseUtilizationRow = {
  causeId: number;
  donatedEth: number;
  disbursedEth: number;
  remainingEth: number;
  utilizationPct: number;
};

export function causeUtilizationByCauseId(): Map<number, CauseUtilizationRow> {
  const rows = db
    .prepare(
      `SELECT
        cause_id AS causeId,
        COALESCE(SUM(CASE WHEN kind = 'donation_in' THEN CAST(value_eth AS REAL) ELSE 0 END), 0) AS donatedEth,
        COALESCE(SUM(CASE WHEN kind = 'disbursement_out' THEN CAST(value_eth AS REAL) ELSE 0 END), 0) AS disbursedEth
       FROM ledger_entries
       WHERE cause_id IS NOT NULL
       GROUP BY cause_id`
    )
    .all() as { causeId: number; donatedEth: number; disbursedEth: number }[];

  const map = new Map<number, CauseUtilizationRow>();
  for (const r of rows) {
    const donated = Number(r.donatedEth) || 0;
    const disbursed = Number(r.disbursedEth) || 0;
    const remaining = Math.max(0, donated - disbursed);
    const pct = donated > 0 ? Math.min(100, Math.max(0, (disbursed / donated) * 100)) : 0;
    map.set(Number(r.causeId), {
      causeId: Number(r.causeId),
      donatedEth: donated,
      disbursedEth: disbursed,
      remainingEth: remaining,
      utilizationPct: pct,
    });
  }
  return map;
}

export type DisbursementAggregation = {
  linkedTxIds: number[];
  aggregatedFrom: AggregatedDonorSummary[];
};

export function computeAndStoreDisbursementAggregation(params: {
  ledgerEntryId: number;
  txHash: string;
  causeId: number;
  amountEth: string;
}): DisbursementAggregation {
  void params.amountEth;
  void params.txHash;
  recomputeDisbursementLinksForCause(params.causeId);
  const row = db
    .prepare(`SELECT linked_tx_ids, aggregated_from FROM ledger_entries WHERE id = ?`)
    .get(params.ledgerEntryId) as { linked_tx_ids: string | null; aggregated_from: string | null } | undefined;
  const linkedIds = safeJsonParse<number[]>(row?.linked_tx_ids, []);
  const aggregated = safeJsonParse<AggregatedDonorSummary[]>(row?.aggregated_from, []);
  return { linkedTxIds: linkedIds, aggregatedFrom: aggregated };
}

export function parseAggregatedFrom(row: LedgerV2Row): AggregatedDonorSummary[] {
  return safeJsonParse<AggregatedDonorSummary[]>(row.aggregated_from, []);
}

