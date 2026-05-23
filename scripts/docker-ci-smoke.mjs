#!/usr/bin/env node
/**
 * Smoke test for Docker Compose stack (CI + post-deploy).
 *
 *   node scripts/docker-ci-smoke.mjs
 *   BASE_URL=http://127.0.0.1:8080 API_DIRECT_URL=http://127.0.0.1:3847 node scripts/docker-ci-smoke.mjs
 */
const BASE = (process.env.BASE_URL ?? 'http://127.0.0.1:8080').replace(/\/$/, '');
const WS_BASE = (process.env.WS_URL ?? BASE.replace(/^http/, 'ws')).replace(/\/$/, '');

async function WebSocketCtor() {
  if (typeof globalThis.WebSocket !== 'undefined') return globalThis.WebSocket;
  const { default: WS } = await import('ws');
  return WS;
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function waitForWsMessage(url, timeoutMs = 20000) {
  const WS = await WebSocketCtor();
  return new Promise((resolve, reject) => {
    const ws = new WS(url);
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error('WebSocket timeout'));
    }, timeoutMs);

    ws.onmessage = (ev) => {
      clearTimeout(timer);
      try {
        resolve(JSON.parse(String(ev.data)));
      } catch {
        resolve(String(ev.data));
      }
      ws.close();
    };

    ws.onerror = () => {
      clearTimeout(timer);
      reject(new Error('WebSocket connection failed'));
    };
  });
}

async function main() {
  console.log(`Docker smoke → ${BASE}`);

  const root = await fetch(`${BASE}/`);
  if (!root.ok) fail(`GET / returned ${root.status}`);
  console.log('✓ SPA reachable');

  const config = await getJson('/api/config');
  if (config.status !== 200) fail(`/api/config returned ${config.status}`);
  console.log('✓ /api/config');

  const readyHost = process.env.API_DIRECT_URL;
  if (readyHost) {
    const ready = await fetch(`${readyHost.replace(/\/$/, '')}/ready`);
    const body = await ready.json().catch(() => ({}));
    if (!ready.ok || body.status !== 'ok') {
      fail(`/ready returned ${ready.status} ${JSON.stringify(body)}`);
    }
    console.log('✓ backend /ready (direct)');
  }

  const hello = await waitForWsMessage(`${WS_BASE}/api/ws`);
  if (hello?.type !== 'hello') {
    fail(`WebSocket expected hello, got ${JSON.stringify(hello)}`);
  }
  console.log('✓ WebSocket /api/ws (nginx → backend)');

  console.log('\n✓ Docker smoke passed\n');
}

void main().catch((e) => {
  fail(e instanceof Error ? e.message : String(e));
});
