import test from 'node:test';
import assert from 'node:assert/strict';
import { filterByCauseName, sortLedgerEntries } from './ledgerGrid.js';
import type { LedgerV2Entry } from './ledgerV2.js';

const base = (partial: Partial<LedgerV2Entry> & Pick<LedgerV2Entry, 'id' | 'recorded_at' | 'cause_name'>): LedgerV2Entry => ({
  tx_hash: '0xabc',
  block_number: 1,
  from_addr: '0x1',
  to_addr: '0x2',
  value_eth: '1',
  kind: 'donation_in',
  cause_id: 1,
  from_display_name: 'A',
  to_display_name: 'B',
  memo: null,
  tags: null,
  reference: null,
  narrative: null,
  linked_tx_ids: null,
  aggregated_from: null,
  ...partial,
});

test('filterByCauseName keeps all when __all__', () => {
  const rows = [base({ id: 1, recorded_at: '2026-01-01', cause_name: 'War' })];
  assert.equal(filterByCauseName(rows, '__all__').length, 1);
});

test('sortLedgerEntries by time desc', () => {
  const rows = [
    base({ id: 1, recorded_at: '2026-01-01', cause_name: 'A' }),
    base({ id: 2, recorded_at: '2026-06-01', cause_name: 'B' }),
  ];
  const sorted = sortLedgerEntries(rows, 'time', 'desc');
  assert.equal(sorted[0].id, 2);
});
