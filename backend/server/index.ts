import 'dotenv/config';
import { createApp } from './app.js';
import { getReadiness } from './health.js';
import { seedIfEmpty } from './seed.js';
import { startChainWatcherSafe } from './watcher.js';
import { closeRedis } from './lib/redis.js';
import { backfillLedgerV2Defaults, recomputeAllDisbursementLinks } from './ledger/LedgerService.js';
import { WebSocketServer } from 'ws';
import { subscribeToEvents } from './lib/redis.js';

let stopWatcher: () => void = () => {};

async function main() {
  seedIfEmpty();
  backfillLedgerV2Defaults();
  recomputeAllDisbursementLinks();

  const app = createApp();
  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.get('/ready', async (_req, res) => {
    try {
      const body = await getReadiness();
      res.status(body.status === 'ok' ? 200 : 503).json(body);
    } catch (e) {
      console.error('[ready] unexpected error:', e);
      res.status(503).json({
        status: 'fail',
        db: 'fail',
        rpc: 'skipped',
        timestamp: new Date().toISOString(),
      });
    }
  });

  const port = parseInt(process.env.PORT || '3847', 10);
  const server = await new Promise<import('node:http').Server>((resolve) => {
    const s = app.listen(port, '0.0.0.0', () => {
      console.log(`[api] http://127.0.0.1:${port}`);
      resolve(s);
    });
  });

  // WebSocket bridge for realtime ledger updates.
  // Uses Redis pub/sub if available; otherwise clients can rely on polling.
  const wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (socket) => {
    socket.send(
      JSON.stringify({ type: 'hello', ts: new Date().toISOString() })
    );
  });

  try {
    await subscribeToEvents((envelope) => {
      const payload = JSON.stringify({ type: 'event', envelope });
      for (const client of wss.clients) {
        if (client.readyState === client.OPEN) client.send(payload);
      }
    });
  } catch (e) {
    console.warn('[ws] Redis subscribe unavailable — realtime bridge disabled:', e);
  }

  // Start watcher after HTTP is up so deploy healthchecks and systemd don't time out.
  stopWatcher = await startChainWatcherSafe();
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});

function shutdown() {
  stopWatcher();
  void closeRedis().finally(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
