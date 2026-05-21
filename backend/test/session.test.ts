import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSessionSecret, sessionCookieSecure } from '../server/session.js';

test('resolveSessionSecret allows dev fallback', () => {
  const prev = { ...process.env };
  process.env.NODE_ENV = 'development';
  delete process.env.SESSION_SECRET;
  assert.equal(resolveSessionSecret(), 'vaultex-dev-secret-key');
  process.env.NODE_ENV = prev.NODE_ENV;
  process.env.SESSION_SECRET = prev.SESSION_SECRET;
});

test('resolveSessionSecret rejects weak secret in production', () => {
  const prev = { ...process.env };
  process.env.NODE_ENV = 'production';
  process.env.SESSION_SECRET = 'vaultex-dev-secret-key';
  assert.throws(() => resolveSessionSecret(), /SESSION_SECRET/);
  process.env.NODE_ENV = prev.NODE_ENV;
  process.env.SESSION_SECRET = prev.SESSION_SECRET;
});

test('sessionCookieSecure is false outside production', () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  assert.equal(sessionCookieSecure(), false);
  process.env.NODE_ENV = prev;
});
