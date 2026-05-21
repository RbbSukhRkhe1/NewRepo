import type { LedgerV2Entry } from './ledgerV2';

export type LedgerSortKey = 'time' | 'cause';
export type LedgerSortDir = 'asc' | 'desc';

export function donorLabel(e: LedgerV2Entry): string {
  return e.from_display_name?.trim() || shortAddr(e.from_addr);
}

export function receiverLabel(e: LedgerV2Entry): string {
  return e.to_display_name?.trim() || shortAddr(e.to_addr);
}

export function shortAddr(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function formatLedgerTime(iso: string): string {
  const d = new Date(iso.includes('T') ? iso : `${iso}Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function amountDisplay(e: LedgerV2Entry): string {
  const sign = e.kind === 'donation_in' ? '+' : '−';
  return `${sign}${e.value_eth} ETH`;
}

export function sortLedgerEntries(
  rows: LedgerV2Entry[],
  sortBy: LedgerSortKey,
  sortDir: LedgerSortDir,
): LedgerV2Entry[] {
  const dir = sortDir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sortBy === 'cause') {
      const ca = (a.cause_name || '').toLowerCase();
      const cb = (b.cause_name || '').toLowerCase();
      const c = ca.localeCompare(cb);
      if (c !== 0) return c * dir;
    }
    const ta = new Date(a.recorded_at.includes('T') ? a.recorded_at : `${a.recorded_at}Z`).getTime();
    const tb = new Date(b.recorded_at.includes('T') ? b.recorded_at : `${b.recorded_at}Z`).getTime();
    return (ta - tb) * dir;
  });
}

export function filterByCauseName(rows: LedgerV2Entry[], causeName: string): LedgerV2Entry[] {
  const c = causeName.trim();
  if (!c || c === '__all__') return rows;
  return rows.filter((e) => (e.cause_name || '').trim() === c);
}

export function uniqueCauseNames(rows: LedgerV2Entry[]): string[] {
  const set = new Set<string>();
  for (const e of rows) {
    const n = (e.cause_name || '').trim();
    if (n) set.add(n);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
