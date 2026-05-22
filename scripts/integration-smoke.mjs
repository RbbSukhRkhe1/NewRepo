/**
 * Smoke test for Vaultex API — auth, cause CRUD, donate/disburse rules.
 * Run: node scripts/integration-smoke.mjs
 * Requires backend on http://127.0.0.1:3847 (start with npm run dev -w backend).
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.API_BASE ?? 'http://127.0.0.1:3847/api';
const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const results = [];

function pass(name, detail = '') {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`);
}

function jar() {
  let cookie = '';
  return {
    get headers() {
      return cookie ? { Cookie: cookie } : {};
    },
    absorb(res) {
      const set = res.headers.getSetCookie?.() ?? [];
      const raw = set.length ? set : [res.headers.get('set-cookie')].filter(Boolean);
      for (const line of raw) {
        const part = String(line).split(';')[0];
        if (!part) continue;
        if (!cookie) cookie = part;
        else if (!cookie.includes(part.split('=')[0])) cookie += `; ${part}`;
      }
    },
  };
}

async function req(j, method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...j.headers },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  j.absorb(res);
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function login(j, email, password) {
  const r = await req(j, 'POST', '/auth/login', { email, password });
  if (r.status !== 200) throw new Error(`login ${email} failed: ${r.status} ${JSON.stringify(r.data)}`);
  return r.data;
}

async function main() {
  console.log(`Testing ${BASE}\n`);

  try {
    await fetch(`${BASE.replace('/api', '')}/health`);
    pass('Backend health reachable');
  } catch (e) {
    fail('Backend health reachable', e.message);
    console.error('\nStart backend: npm run dev -w backend');
    process.exit(1);
  }

  const adminJar = jar();
  const donorJar = jar();

  // --- Auth ---
  const admin = await login(adminJar, 'admin@vaultex.local', 'demo123');
  if (admin.user?.role === 'admin') pass('Admin login', admin.user.name);
  else fail('Admin login', JSON.stringify(admin));

  const donor = await login(donorJar, 'tasin@vaultex.local', 'demo123');
  if (donor.user?.role === 'donor') pass('Donor login', donor.user.name);
  else fail('Donor login', JSON.stringify(donor));

  const dedupe = spawnSync(
    process.execPath,
    ['--import', 'tsx', '-e', "import('./backend/server/seed.ts').then((m) => m.seedCausesUpsert())"],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  if (dedupe.status === 0) pass('Seed dedupe applied');
  else fail('Seed dedupe applied', dedupe.stderr || dedupe.stdout || `exit ${dedupe.status}`);

  const adminCauses = await req(adminJar, 'GET', '/admin/causes');
  const lgbtqRows = adminCauses.data?.filter((c) => c.title === 'LGBTQs') ?? [];
  if (adminCauses.status === 200 && lgbtqRows.length === 1) {
    pass('Seed dedupe: single LGBTQs row');
  } else {
    fail('Seed dedupe: single LGBTQs row', `found ${lgbtqRows.length}`);
  }

  // --- UC1: donor cannot create cause ---
  const donorCreate = await req(donorJar, 'POST', '/causes', {
    title: 'Blocked Cause',
    description: 'Should fail',
    goalEth: 5,
  });
  if (donorCreate.status === 403) pass('UC1: Donor blocked from POST /causes');
  else fail('UC1: Donor blocked from POST /causes', `status ${donorCreate.status}`);

  // --- UC2: admin CRUD ---
  const usersRes = await req(adminJar, 'GET', '/users');
  const beneficiary = usersRes.data?.find((u) => u.role === 'beneficiary');
  if (!beneficiary?.id) {
    fail('UC2: Beneficiary available for cause create', JSON.stringify(usersRes.data));
    process.exit(1);
  }

  const causeDetailFields = {
    aboutBody: 'Detailed about text for integration test cause.',
    fundsCover: [
      { label: 'Program A', weight: 50 },
      { label: 'Program B', weight: 50 },
    ],
    milestones: ['First milestone', 'Second milestone'],
    verificationPoints: ['Ledger tracked', 'Beneficiary verified'],
    categoryTag: 'Test',
    locationTag: 'Test Region',
    campaignEndDate: '2026-12-31',
  };

  const created = await req(adminJar, 'POST', '/causes', {
    title: `Test Cause ${Date.now()}`,
    description: 'Integration test cause subtitle',
    goalEth: 12,
    beneficiaryUserId: beneficiary.id,
    impactStoryTitle: 'Test impact headline',
    impactStoryBody: 'Integration test impact story body.',
    imageUrl: '/samples/cause-education.svg',
    ...causeDetailFields,
  });
  if (created.status === 201 && created.data?.id) {
    pass('UC2: Admin create cause', `id=${created.data.id}`);
  } else {
    fail('UC2: Admin create cause', JSON.stringify(created.data));
    process.exit(1);
  }
  const causeId = created.data.id;

  const adminList = await req(adminJar, 'GET', '/admin/causes');
  if (adminList.status === 200 && adminList.data.some((c) => c.id === causeId)) {
    pass('UC2: GET /admin/causes includes new cause');
  } else fail('UC2: GET /admin/causes', `status ${adminList.status}`);

  const updated = await req(adminJar, 'PUT', `/causes/${causeId}`, {
    title: `Updated Test ${causeId}`,
    description: 'Updated description',
    goalEth: 15,
    beneficiaryUserId: beneficiary.id,
    impactStoryTitle: 'Updated impact title',
    impactStoryBody: 'Updated impact story body.',
    imageUrl: null,
    ...causeDetailFields,
  });
  if (updated.status === 200) pass('UC2: PUT /causes/:id');
  else fail('UC2: PUT /causes/:id', JSON.stringify(updated.data));

  const publicGet = await req(jar(), 'GET', `/causes/${causeId}`);
  if (publicGet.status === 200 && publicGet.data.title.includes('Updated Test')) {
    pass('UC2: Public GET /causes/:id reflects update');
  } else fail('UC2: Public GET /causes/:id', JSON.stringify(publicGet.data));

  // --- UC3: admin blocked from donate ---
  const adminDonate = await req(adminJar, 'POST', '/donate', {
    causeId,
    amountEth: '0.01',
  });
  if (adminDonate.status === 403) pass('UC3: Admin blocked from POST /donate');
  else fail('UC3: Admin blocked from POST /donate', `status ${adminDonate.status}`);

  // --- Chain-dependent tests (Anvil: compose default 4585, bare anvil often 8545) ---
  const anvilPorts = [];
  if (process.env.ANVIL_HOST_PORT) anvilPorts.push(process.env.ANVIL_HOST_PORT);
  if (process.env.ANVIL_RPC_URL) {
    try {
      const p = new URL(process.env.ANVIL_RPC_URL).port;
      if (p) anvilPorts.push(p);
    } catch {
      /* ignore */
    }
  }
  for (const p of ['4585', '8545']) {
    if (!anvilPorts.includes(p)) anvilPorts.push(p);
  }
  let anvilUp = false;
  let anvilPortUsed = '';
  for (const port of anvilPorts) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 1 }),
    });
      const j = await r.json();
      if (j.result) {
        anvilUp = true;
        anvilPortUsed = port;
        break;
      }
    } catch {
      /* try next port */
    }
  }

  if (!anvilUp) {
    console.log('\n⚠ Anvil not running — skipping on-chain donate/disburse tests');
    console.log(`  Tried ports: ${anvilPorts.join(', ')} — start Anvil or docker compose up anvil\n`);
  } else {
    pass('Anvil RPC reachable', `port ${anvilPortUsed}`);

    const war = (await req(jar(), 'GET', '/causes')).data?.find((c) => c.title === 'War');
    const disburseCauseId = war?.id ?? causeId;

    const disb = await req(adminJar, 'POST', `/causes/${disburseCauseId}/disburse`, {
      amountEth: '0.5',
      message: 'Frontline aid',
    });
    if (disb.status === 200 && disb.data?.txHash) {
      pass('UC3: Admin disburse to cause', disb.data.txHash.slice(0, 18) + '…');
    } else {
      fail('UC3: Admin disburse to cause', JSON.stringify(disb.data));
    }

    const ledger = await req(jar(), 'GET', '/ledger');
    const lastDisb = [...(ledger.data ?? [])].reverse().find((e) => e.kind === 'disbursement_out');
    const warBeneficiary = war?.beneficiary_name ?? 'Regional Medical Center';
    if (
      lastDisb &&
      lastDisb.causeName &&
      lastDisb.toDisplayName === warBeneficiary &&
      lastDisb.toDisplayName !== lastDisb.causeName
    ) {
      pass('UC3: Ledger disbursement receiver is beneficiary', `${lastDisb.toDisplayName} · ${lastDisb.causeName}`);
    } else {
      fail('UC3: Ledger disbursement receiver is beneficiary', JSON.stringify(lastDisb));
    }

    if (lastDisb?.memo === 'Frontline aid') {
      pass('Disbursement message stored in ledger memo');
    } else {
      fail('Disbursement message stored in ledger memo', JSON.stringify(lastDisb?.memo));
    }

    const warAfter = (await req(jar(), 'GET', '/causes')).data?.find((c) => c.title === 'War');
    if (warAfter && Number(warAfter.disbursed_eth) >= 0.5) {
      pass('Cause disbursed_eth reflects vault disbursement', `${warAfter.disbursed_eth} ETH`);
    } else {
      fail('Cause disbursed_eth reflects vault disbursement', JSON.stringify(warAfter));
    }

    const adminHistory = await req(adminJar, 'GET', '/me/history');
    if (adminHistory.data?.summary?.isVaultWallet && adminHistory.data?.summary?.totalDisbursedEth) {
      pass('Admin vault wallet summary', `disbursed ${adminHistory.data.summary.totalDisbursedEth} ETH`);
    } else {
      fail('Admin vault wallet summary', JSON.stringify(adminHistory.data?.summary));
    }

    const donorDonate = await req(donorJar, 'POST', '/donate', {
      causeId: disburseCauseId,
      amountEth: '0.01',
    });
    if (donorDonate.status === 200 && donorDonate.data?.txHash) {
      pass('Donor POST /donate', donorDonate.data.txHash.slice(0, 18) + '…');
    } else {
      fail('Donor POST /donate', JSON.stringify(donorDonate.data));
    }
  }

  // --- UC2: soft delete ---
  const del = await req(adminJar, 'DELETE', `/causes/${causeId}`);
  if (del.status === 200) pass('UC2: DELETE /causes/:id (deactivate)');
  else fail('UC2: DELETE /causes/:id', JSON.stringify(del.data));

  const gone = await req(jar(), 'GET', `/causes/${causeId}`);
  if (gone.status === 404) pass('UC2: Deactivated cause hidden from public GET');
  else fail('UC2: Deactivated cause hidden', `status ${gone.status}`);

  const publicList = await req(jar(), 'GET', '/causes');
  const stillListed = publicList.data?.some((c) => c.id === causeId);
  if (publicList.status === 200 && !stillListed) pass('UC2: Deactivated cause hidden from GET /causes list');
  else fail('UC2: Deactivated cause hidden from list', JSON.stringify(publicList.data));

  const lgbtqId = lgbtqRows[0]?.id;
  if (lgbtqId) {
    const off = await req(adminJar, 'PATCH', `/causes/${lgbtqId}/active`, { active: false });
    if (off.status === 200) pass('Seeded LGBTQs deactivate via PATCH');
    else fail('Seeded LGBTQs deactivate via PATCH', JSON.stringify(off.data));

    const hidden = await req(jar(), 'GET', '/causes');
    const lgbtqVisible = hidden.data?.some((c) => c.title === 'LGBTQs');
    if (hidden.status === 200 && !lgbtqVisible) pass('Seeded LGBTQs hidden from public Causes page');
    else fail('Seeded LGBTQs hidden from public Causes page', JSON.stringify(hidden.data));

    const on = await req(adminJar, 'PATCH', `/causes/${lgbtqId}/active`, { active: true });
    if (on.status === 200) pass('Seeded LGBTQs reactivated (cleanup)');
    else fail('Seeded LGBTQs reactivated (cleanup)', JSON.stringify(on.data));
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
