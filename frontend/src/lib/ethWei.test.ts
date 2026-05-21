import test from 'node:test';
import assert from 'node:assert/strict';
import { formatEther, parseEther } from './ethWei.js';

test('parseEther and formatEther round-trip', () => {
  assert.equal(formatEther(parseEther('1')), '1');
  assert.equal(formatEther(parseEther('0.5')), '0.5');
  assert.equal(formatEther(parseEther('1.234567')), '1.234567');
});

test('parseEther invalid input returns 0', () => {
  assert.equal(parseEther(''), 0n);
  assert.equal(parseEther('not-a-number'), 0n);
});

test('formatEther handles zero', () => {
  assert.equal(formatEther(0n), '0');
});
