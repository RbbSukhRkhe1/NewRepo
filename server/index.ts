import { config as loadEnv } from 'dotenv';

// Match Vite: base `.env` then gitignored `.env.local` overrides (dev machines often only have `.env.local`).
loadEnv({ quiet: true });
loadEnv({ path: '.env.local', override: true, quiet: true });
import { createApp } from './app.js';
import { assertRequiredEnv } from './env.js';
import { seedIfEmpty } from './seed.js';
import { startChainWatcherSafe } from './watcher.js';

assertRequiredEnv();
await seedIfEmpty();
const stopWatcher = startChainWatcherSafe();

const app = createApp();
app.get('/health', (_req, res) => res.json({ ok: true }));

const port = parseInt(process.env.PORT || '3847', 10);
app.listen(port, '0.0.0.0', () => {
  console.info(`[api] http://127.0.0.1:${port}`);
});

function shutdown() {
  stopWatcher();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
