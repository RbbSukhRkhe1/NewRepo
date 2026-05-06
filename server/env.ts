const REQUIRED_IN_ALL_ENVS = ['SESSION_SECRET', 'ANVIL_MNEMONIC', 'ANVIL_RPC_URL'] as const;
const REQUIRED_OUTSIDE_DEV: readonly string[] = [];

function missingVars(names: readonly string[]): string[] {
  return names.filter((name) => {
    const val = process.env[name];
    return !val || !val.trim();
  });
}

export function assertRequiredEnv(): void {
  const missing = new Set<string>();
  for (const name of missingVars(REQUIRED_IN_ALL_ENVS)) missing.add(name);

  const isDev = (process.env.NODE_ENV ?? 'development') === 'development';
  if (!isDev) {
    for (const name of missingVars(REQUIRED_OUTSIDE_DEV)) missing.add(name);
  }
  if (process.env.USE_SUPABASE === 'true') {
    for (const name of missingVars(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])) missing.add(name);
  }
  if (process.env.CHAIN_TX_MODE === 'vault') {
    for (const name of missingVars(['BASE_SEPOLIA_RPC_URL', 'VAULT_CONTRACT_ADDRESS'])) missing.add(name);
  }

  if (missing.size > 0) {
    throw new Error(`[env] Missing required environment variables: ${Array.from(missing).join(', ')}`);
  }
}

export function getSessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || !s.trim()) {
    throw new Error('[env] SESSION_SECRET is required');
  }
  return s;
}

export function isSupabaseEnabled(): boolean {
  return process.env.USE_SUPABASE === 'true';
}

export function isDualWriteSqliteEnabled(): boolean {
  return process.env.DUAL_WRITE_SQLITE === 'true';
}
