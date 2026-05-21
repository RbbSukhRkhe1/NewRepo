import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const libDir = path.join(root, 'src', 'lib');
const files = readdirSync(libDir)
  .filter((f) => f.endsWith('.test.ts'))
  .map((f) => path.join(libDir, f));

if (files.length === 0) {
  console.error('No src/lib/*.test.ts files found');
  process.exit(1);
}

const r = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...files], {
  cwd: root,
  stdio: 'inherit',
});
process.exit(r.status ?? 1);
