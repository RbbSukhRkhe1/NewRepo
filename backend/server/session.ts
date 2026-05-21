const WEAK_SECRETS = new Set([
  'vaultex-dev-secret-key',
  'vaultex-local-docker-secret-replace-for-any-shared-deploy',
]);

export function resolveSessionSecret(): string {
  const isProd = process.env.NODE_ENV === 'production';
  const secret = (process.env.SESSION_SECRET ?? '').trim();
  if (isProd && (!secret || WEAK_SECRETS.has(secret))) {
    throw new Error(
      '[session] Set a strong SESSION_SECRET in production (see backend/.env.example)'
    );
  }
  return secret || 'vaultex-dev-secret-key';
}

export function sessionCookieSecure(): boolean {
  if (process.env.NODE_ENV !== 'production') return false;
  return process.env.USE_HTTPS === '1' || process.env.USE_HTTPS === 'true';
}
