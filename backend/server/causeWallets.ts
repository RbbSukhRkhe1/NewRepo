import { db } from './db.js';
import { CAUSE_WALLET_START } from './anvil.js';

/** Assign each cause a dedicated Anvil wallet index for direct vault → cause disbursements. */
export function ensureCauseWallets(): void {
  const userIdx = db
    .prepare(`SELECT anvil_index FROM users WHERE anvil_index IS NOT NULL`)
    .all() as { anvil_index: number }[];
  const taken = new Set(userIdx.map((r) => r.anvil_index));

  const causes = db
    .prepare(`SELECT id, anvil_index FROM causes ORDER BY id ASC`)
    .all() as { id: number; anvil_index: number | null }[];

  for (const c of causes) {
    if (c.anvil_index != null) {
      taken.add(c.anvil_index);
    }
  }

  let next = CAUSE_WALLET_START;
  const assign = db.prepare(`UPDATE causes SET anvil_index = ? WHERE id = ?`);
  for (const c of causes) {
    if (c.anvil_index != null) continue;
    while (taken.has(next)) next += 1;
    assign.run(next, c.id);
    taken.add(next);
    next += 1;
  }
}

export function nextCauseAnvilIndex(): number {
  const row = db.prepare(`SELECT MAX(anvil_index) AS m FROM causes`).get() as { m: number | null };
  const userMax = db.prepare(`SELECT MAX(anvil_index) AS m FROM users`).get() as { m: number | null };
  let next = Math.max(CAUSE_WALLET_START, (row.m ?? CAUSE_WALLET_START - 1) + 1, (userMax.m ?? 0) + 1);
  while (
    db.prepare(`SELECT 1 FROM users WHERE anvil_index = ?`).get(next) ||
    db.prepare(`SELECT 1 FROM causes WHERE anvil_index = ?`).get(next)
  ) {
    next += 1;
  }
  return next;
}
