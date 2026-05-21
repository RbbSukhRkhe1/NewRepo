import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareTestEnv, cleanupTestDb } from './setup-env.js';

const dbPath = prepareTestEnv();
const { buildNarrative, ledgerReference, maskedInitial } = await import(
  '../server/ledger/LedgerService.js'
);

test.after(() => {
  cleanupTestDb(dbPath);
});

test('ledgerReference prefixes by kind', () => {
  const hash = '0x' + 'a'.repeat(64);
  assert.match(ledgerReference('donation_in', hash), /^DON-/);
  assert.match(ledgerReference('disbursement_out', hash), /^DIS-/);
  assert.match(ledgerReference('chain_sync', hash), /^CHN-/);
});

test('maskedInitial returns first letter or Anonymous', () => {
  assert.equal(maskedInitial('Sukhan'), 'S');
  assert.equal(maskedInitial(''), 'Anonymous');
});

test('buildNarrative donation includes cause', () => {
  const n = buildNarrative({
    kind: 'donation_in',
    fromDisplay: 'Alex',
    toDisplay: 'Vaultex',
    amountEth: '1.5',
    causeName: 'War',
    utilization: null,
    memo: null,
  });
  assert.ok(n.includes('Alex'));
  assert.ok(n.includes('1.5'));
  assert.ok(n.includes('War'));
});
