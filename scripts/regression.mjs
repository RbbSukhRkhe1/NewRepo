#!/usr/bin/env node
/**
 * Local regression: unit tests + typecheck + frontend production build.
 * Optional live API smoke when backend is already running.
 *
 *   node scripts/regression.mjs
 *   node scripts/regression.mjs --smoke   # also runs integration-smoke.mjs
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const withSmoke = process.argv.includes('--smoke');

function run(cmd, args, label) {
  console.log(`\n==> ${label}`);
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) {
    console.error(`\nFAILED: ${label}`);
    process.exit(r.status ?? 1);
  }
}

run('npm', ['run', 'test', '-w', 'backend'], 'Backend unit tests');
run('npm', ['run', 'test', '-w', 'frontend'], 'Frontend unit tests');
run('npx', ['tsc', '-p', 'backend', '--noEmit'], 'Backend typecheck');
run('npm', ['run', 'build', '-w', 'frontend'], 'Frontend production build');

if (withSmoke) {
  run('node', ['scripts/integration-smoke.mjs'], 'Integration smoke (requires API on :3847)');
}

console.log('\n✓ Regression suite passed\n');
