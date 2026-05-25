/**
 * Simulates live donations for ledger demos (submission / recording).
 *
 * Requires:
 *   - Backend on http://127.0.0.1:3847
 *   - Anvil RPC reachable (same as backend)
 *   - Seeded donor accounts (haha@, sukhan@, tasin@vaultex.local)
 *
 * Usage:
 *   node scripts/simulate-live-donations.mjs
 *   DONATION_COUNT=10 DONATION_DELAY_MS=2500 node scripts/simulate-live-donations.mjs
 *
 * Open http://localhost:5173/ledger with the app running to watch updates via WebSocket.
 */
const BASE = process.env.API_BASE ?? 'http://127.0.0.1:3847/api';
const DONORS = [
  'haha@vaultex.local',
  'sukhan@vaultex.local',
  'tasin@vaultex.local',
  'sam@vaultex.local',
  'priya@vaultex.local',
  'lena@vaultex.local',
];
const PASSWORD = process.env.VAULTEX_DONOR_PASSWORD ?? 'demo123';
const COUNT = Math.max(1, parseInt(process.env.DONATION_COUNT ?? '6', 10));
const DELAY_MS = Math.max(500, parseInt(process.env.DONATION_DELAY_MS ?? '3500', 10));

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
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function login(email) {
  const j = jar();
  const r = await req(j, 'POST', '/auth/login', { email, password: PASSWORD });
  if (r.status !== 200) throw new Error(`Login failed for ${email}: ${r.status} ${JSON.stringify(r.data)}`);
  return j;
}

function randomEth() {
  const n = 0.02 + Math.random() * 0.28;
  return n.toFixed(4);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log(`Vaultex live donation simulator → ${BASE}`);
  console.log(`Planned donations: ${COUNT}, delay: ${DELAY_MS}ms\n`);

  try {
    await fetch(`${BASE.replace('/api', '')}/health`);
  } catch {
    console.error('Backend not reachable. Start with: npm run dev');
    process.exit(1);
  }

  const causesRes = await req(jar(), 'GET', '/causes?status=active');
  if (causesRes.status !== 200 || !Array.isArray(causesRes.data) || causesRes.data.length === 0) {
    console.error('No active causes. Seed the database or create campaigns first.');
    process.exit(1);
  }

  const causes = causesRes.data;
  console.log(`Active causes: ${causes.map((c) => c.title).join(', ')}\n`);

  for (let i = 0; i < COUNT; i++) {
    const email = DONORS[i % DONORS.length];
    const cause = causes[Math.floor(Math.random() * causes.length)];
    const amountEth = randomEth();
    const session = await login(email);
    const donate = await req(session, 'POST', '/donate', { causeId: cause.id, amountEth });
    if (donate.status === 200) {
      console.log(
        `[${i + 1}/${COUNT}] ${email.split('@')[0]} → ${cause.title}: ${amountEth} ETH (${donate.data?.txHash?.slice(0, 10)}…)`,
      );
    } else {
      console.warn(`[${i + 1}/${COUNT}] failed:`, donate.status, donate.data);
    }
    if (i < COUNT - 1) await sleep(DELAY_MS);
  }

  console.log('\nDone. Keep the ledger page open to see WebSocket updates.');
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
