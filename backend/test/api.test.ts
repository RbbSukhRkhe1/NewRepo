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
  assert.equal(login.body.user.anvilIndex, 0);

  const users = await agent.get('/api/users').expect(200);
  const beneficiary = users.body.find((u: { role: string }) => u.role === 'beneficiary');
  assert.ok(beneficiary?.id);

  const causeDetailFields = {
    aboutBody: 'Detailed about text for API test cause.',
    fundsCover: [
      { label: 'Program A', weight: 60 },
      { label: 'Program B', weight: 40 },
    ],
    milestones: ['First milestone', 'Second milestone'],
    verificationPoints: ['Ledger tracked', 'Beneficiary verified'],
    categoryTag: 'Test',
    locationTag: 'Test Region',
    campaignEndDate: '2026-12-31',
  };

  const created = await agent
    .post('/api/causes')
    .send({
      title: 'API Test Cause',
      description: 'Subtitle',
      goalEth: 10,
      beneficiaryUserId: beneficiary.id,
      impactStoryTitle: 'Impact headline',
      impactStoryBody: 'Impact body text.',
      ...causeDetailFields,
    })
    .expect(201);
  assert.ok(created.body.id);

  const detail = await agent.get(`/api/causes/${created.body.id}`).expect(200);
  assert.equal(detail.body.about_body, causeDetailFields.aboutBody);
  assert.equal(detail.body.funds_cover.length, 2);
  assert.equal(detail.body.donor_count, 0);

  const donorAgent = request.agent(app);
  await donorAgent
    .post('/api/auth/login')
    .send({ email: 'tasin@vaultex.local', password: 'demo123' })
    .expect(200);

  await donorAgent
    .post('/api/causes')
    .send({
      title: 'Nope',
      description: 'x',
      goalEth: 1,
      beneficiaryUserId: beneficiary.id,
      impactStoryTitle: 'x',
      impactStoryBody: 'x',
    })
    .expect(403);
});

test('GET /api/ledger/v2 returns array', async () => {
  const res = await request(app).get('/api/ledger/v2?limit=5').expect(200);
  assert.ok(Array.isArray(res.body));
});

test('GET /api/me/badges requires auth', async () => {
  await request(app).get('/api/me/badges').expect(401);
});

test('GET /api/me/impact for donor returns totals', async () => {
  const agent = request.agent(app);
  await agent
    .post('/api/auth/login')
    .send({ email: 'tasin@vaultex.local', password: 'demo123' })
    .expect(200);
  const res = await agent.get('/api/me/impact').expect(200);
  assert.ok(typeof res.body.totalDonatedEth === 'number');
  assert.ok(Array.isArray(res.body.byCause));
});

test('responses include security headers from helmet', async () => {
  const res = await request(app).get('/api/config');
  assert.ok(res.headers['x-content-type-options']);
});
