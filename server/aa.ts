/**
 * Account abstraction utilities: Pimlico JSON-RPC proxy + health probes.
 * UserOperations are signed on the client (Privy embedded wallet + sponsor:true);
 * this module keeps the API key server-side when clients use /api/aa/rpc.
 */

const BASE_SEPOLIA_CHAIN_ID = 84532;

const ALLOWED_PIMLICO_METHODS = new Set([
  'eth_chainId',
  'eth_supportedEntryPoints',
  'eth_sendUserOperation',
  'eth_estimateUserOperationGas',
  'eth_getUserOperationReceipt',
  'eth_getUserOperationByHash',
  'pimlico_getUserOperationGasPrice',
  'pimlico_getUserOperationStatus',
  'pm_sponsorUserOperation',
  'pm_getPaymasterStubData',
]);

export function pimlicoConfigured(): boolean {
  return Boolean(process.env.PIMLICO_API_KEY?.trim());
}

export function pimlicoRpcUrl(): string {
  const key = process.env.PIMLICO_API_KEY?.trim();
  if (!key) {
    throw new Error('[env] PIMLICO_API_KEY is required for Pimlico RPC');
  }
  return `https://api.pimlico.io/v2/${BASE_SEPOLIA_CHAIN_ID}/rpc?apikey=${key}`;
}

export type PimlicoHealth = {
  configured: boolean;
  reachable: boolean;
  error?: string;
};

export async function probePimlico(): Promise<PimlicoHealth> {
  if (!pimlicoConfigured()) {
    return { configured: false, reachable: false };
  }
  try {
    const out = (await forwardPimlicoRpcUnchecked({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_chainId',
      params: [],
    })) as { result?: string; error?: { message?: string } };
    if (out.error?.message) {
      return { configured: true, reachable: false, error: out.error.message };
    }
    return { configured: true, reachable: typeof out.result === 'string' };
  } catch (e: unknown) {
    return {
      configured: true,
      reachable: false,
      error: e instanceof Error ? e.message : 'pimlico unreachable',
    };
  }
}

async function forwardPimlicoRpcUnchecked(body: unknown): Promise<unknown> {
  const res = await fetch(pimlicoRpcUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<unknown>;
}

/** Validates method allowlist, then forwards JSON body to Pimlico. */
export async function forwardPimlicoRpc(body: unknown): Promise<unknown> {
  if (!pimlicoConfigured()) {
    throw new Error('Pimlico is not configured (set PIMLICO_API_KEY)');
  }
  const parsed = body as { method?: string };
  if (!parsed.method || !ALLOWED_PIMLICO_METHODS.has(parsed.method)) {
    throw new Error(`RPC method not allowed: ${String(parsed.method)}`);
  }
  return forwardPimlicoRpcUnchecked(body);
}
