import test from 'node:test';
import assert from 'node:assert/strict';
import { WS_PATH } from '../server/constants.js';

test('WS_PATH matches frontend LedgerPage and nginx /api proxy', () => {
  assert.equal(WS_PATH, '/api/ws');
});
