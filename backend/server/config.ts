/**
 * Target chain from **NETWORK** (see `backend/.env.example`).
 * RPC URLs are chosen here so watchers, health checks, and API providers stay aligned.
 *
 * **Demo note:** `POST /donate` and `POST /disburse` still sign with the dev HD mnemonic
 * (`anvil.ts`). That path is intended for **local Anvil** demos. Sepolia RPC here is for
 * reads / watcher / future wallet work — browser MetaMask flows are tracked separately (frontend).
 */

export type VaultexNetwork = 'anvil' | 'sepolia';

function parseNetwork(): VaultexNetwork {
  const raw = (process.env.NETWORK ?? 'anvil').toLowerCase().trim();
  if (raw === 'sepolia') return 'sepolia';
  if (raw !== '' && raw !== 'anvil') {
    console.warn(
      `[config] Unknown NETWORK="${process.env.NETWORK}" — defaulting to anvil`,
    );
  }
  return 'anvil';
}

export const network: VaultexNetwork = parseNetwork();

/** Canonical chain id for the selected **network** (Anvil default 31337). */
export const chainId = network === 'sepolia' ? 11155111 : 31337;

/** True when using the local Anvil/Hardhat-style demo chain (default capstone setup). */
export const isAnvilDemoNetwork = network === 'anvil';

// Production default: external Anvil endpoint (pin this if you want the API
// to always target a single persistent chain, even when env vars are missing).
const DEFAULT_ANVIL_HTTP = 'http://34.116.84.132:4585';
/** Public fallback only when `SEPOLIA_RPC_URL` is unset — fine for dev; use your own RPC for demos that need reliability. */
const DEFAULT_SEPOLIA_HTTP = 'https://rpc.sepolia.org';

export function getRpcHttpUrl(): string {
  if (network === 'sepolia') {
    const u = process.env.SEPOLIA_RPC_URL?.trim();
    if (u) return u;
    console.warn(
      '[config] NETWORK=sepolia but SEPOLIA_RPC_URL unset — using public Sepolia RPC (rate-limited). Set SEPOLIA_RPC_URL for production-like runs.',
    );
    return DEFAULT_SEPOLIA_HTTP;
  }
  return process.env.ANVIL_RPC_URL?.trim() || DEFAULT_ANVIL_HTTP;
}

export function getRpcWsUrl(): string {
  if (network === 'sepolia') {
    const explicit = process.env.SEPOLIA_WS_URL?.trim();
    if (explicit) return explicit;
    const http = getRpcHttpUrl();
    return http.replace(/^https/i, 'wss').replace(/^http/i, 'ws');
  }
  const http = process.env.ANVIL_RPC_URL?.trim() || DEFAULT_ANVIL_HTTP;
  const ws = process.env.ANVIL_WS_URL?.trim();
  if (ws) return ws;
  return http.replace(/^http/i, 'ws');
}
