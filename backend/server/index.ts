import 'dotenv/config';
import { createApp } from './app.js';
import { seedIfEmpty } from './seed.js';
import { startChainWatcherSafe } from './watcher.js';

let stopWatcher: () => void = () => {};

async function main() {
  seedIfEmpty();
  stopWatcher = await startChainWatcherSafe();

  const app = createApp();
  app.get('/health', (_req, res) => res.json({ ok: true }));

  const port = parseInt(process.env.PORT || '3847', 10);
  app.listen(port, '0.0.0.0', () => {
    console.log(`[api] http://127.0.0.1:${port}`);
  });
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});

function shutdown() {
  stopWatcher();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
