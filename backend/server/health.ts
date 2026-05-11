import { db } from './db.js';

export type ReadinessJson = {
  status: 'ok' | 'fail';
  db: 'ok' | 'fail';
  rpc: 'ok' | 'skipped' | 'fail';
  timestamp: string;
};

function checkDb(): 'ok' | 'fail' {
  try {
    const row = db.prepare('PRAGMA quick_check').get() as Record<string, unknown> | undefined;
    if (!row) return 'fail';
    const val = Object.values(row)[0];
    return val === 'ok' ? 'ok' : 'fail';
  } catch {
    return 'fail';
  }
}

async function checkRpc(): Promise<'ok' | 'skipped' | 'fail'> {
  const skip =
    process.env.READY_SKIP_RPC === '1' || process.env.READY_SKIP_RPC === 'true';
  if (skip) return 'skipped';

  const url = process.env.ANVIL_RPC_URL ?? 'http://127.0.0.1:8545';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_chainId',
        params: [],
        id: 1,
      }),
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return 'fail';
    const json = (await res.json()) as { result?: unknown; error?: unknown };
    if (json.error != null) return 'fail';
    if (typeof json.result !== 'string' || !json.result.startsWith('0x')) return 'fail';
    return 'ok';
  } catch {
    return 'fail';
  }
}

/** Readiness for orchestrators (DB + optional JSON-RPC). Not for cheap liveness — use GET /health. */
/** When the DB is unhealthy we do not call RPC (avoids extra latency and misleading rpc: "ok"). */
export async function getReadiness(): Promise<ReadinessJson> {
  const dbStatus = checkDb();
  const rpcStatus = dbStatus === 'ok' ? await checkRpc() : 'skipped';

  const status: 'ok' | 'fail' =
    dbStatus === 'ok' && (rpcStatus === 'ok' || rpcStatus === 'skipped') ? 'ok' : 'fail';

  return {
    status,
    db: dbStatus,
    rpc: rpcStatus,
    timestamp: new Date().toISOString(),
  };
}
