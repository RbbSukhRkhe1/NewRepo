import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { prepareTestEnv, cleanupTestDb } from './setup-env.js';

const dbPath = prepareTestEnv();
const { createApp } = await import('../server/app.js');
const { seedIfEmpty } = await import('../server/seed.js');
const { getReadiness } = await import('../server/health.js');

seedIfEmpty();
const app = createApp();

test.after(() => {
  cleanupTestDb(dbPath);
});

test('GET /api/config returns network and chainId', async () => {
  const res = await request(app).get('/api/config').expect(200);
  assert.equal(res.body.network, 'anvil');
  assert.equal(res.body.chainId, 31337);
  assert.ok(res.body.superRichAddress);
});

test('readiness passes with isolated DB and RPC skipped', async () => {
  const body = await getReadiness();
  assert.equal(body.status, 'ok');
  assert.equal(body.db, 'ok');
  assert.equal(body.rpc, 'skipped');
});

test('admin login and donor blocked from POST /causes', async () => {
  const agent = request.agent(app);
  const login = await agent
    .post('/api/auth/login')
    .send({ email: 'admin@vaultex.local', password: 'demo123' })
    .expect(200);
  assert.equal(login.body.user.role, 'admin');

  const donorAgent = request.agent(app);
  await donorAgent
    .post('/api/auth/login')
    .send({ email: 'tasin@vaultex.local', password: 'demo123' })
    .expect(200);

  await donorAgent
    .post('/api/causes')
    .send({ title: 'Nope', description: 'x', goalEth: 1 })
    .expect(403);
});

test('GET /api/ledger/v2 returns array', async () => {
  const res = await request(app).get('/api/ledger/v2?limit=5').expect(200);
  assert.ok(Array.isArray(res.body));
});

test('GET /api/me/badges requires auth', async () => {
  await request(app).get('/api/me/badges').expect(401);
});
