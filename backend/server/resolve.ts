import { db } from './db.js';
import { SUPER_RICH_INDEX, anvilAddress } from './anvil.js';

export function maskAddr(addr: string): string {
  const a = addr.toLowerCase();
  if (a.length < 12) return addr;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/** Address (lowercase) -> short display name */
export function buildAddressBook(): Map<string, string> {
  const m = new Map<string, string>();
  m.set(anvilAddress(SUPER_RICH_INDEX).toLowerCase(), 'Vaultex');
  const rows = db
    .prepare(
      `SELECT anvil_index, name FROM users WHERE anvil_index IS NOT NULL`
    )
    .all() as { anvil_index: number; name: string }[];
  for (const r of rows) {
    m.set(anvilAddress(r.anvil_index).toLowerCase(), r.name);
  }
  return m;
}

export function labelForAddress(addr: string, book: Map<string, string>): string {
  const k = addr.toLowerCase();
  return book.get(k) ?? maskAddr(addr);
}
