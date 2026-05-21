import type { DonationLedgerKind } from './donationLedger';

export type UserHistoryFlow = 'sent' | 'received';

export interface UserHistoryEntry {
  id: string;
  kind: DonationLedgerKind;
  flow: UserHistoryFlow;
  fromDisplayName: string;
  fromMasked: string;
  toDisplayName: string;
  toMasked: string;
  amountEth: string;
  causeName: string;
  memo?: string;
  txHash: string;
  recordedAt: string;
}

export interface UserWalletSummary {
  currentEth: string;
  referenceMaxEth: string;
  fillRatio: number;
  totalSentEth: string;
  totalReceivedEth: string;
  totalDisbursedEth?: string;
  isVaultWallet?: boolean;
  /** False when local chain RPC (Anvil) is not reachable — balance may show 0. */
  chainLive?: boolean;
}

export interface MeHistoryResponse {
  entries: UserHistoryEntry[];
  summary: UserWalletSummary | null;
}

function parseApiErrorMessage(text: string, status: number): string {
  try {
    const data = JSON.parse(text) as { error?: string };
    if (data.error) return data.error;
  } catch {
    /* raw text */
  }
  if (/ECONNREFUSED|8545|RPC|fetch failed/i.test(text)) {
    return 'Local blockchain node is not running. Start Anvil to see live wallet balances.';
  }
  return text || `History error ${status}`;
}

export async function loadMeHistory(): Promise<MeHistoryResponse> {
  const res = await fetch('/api/me/history', { credentials: 'include' });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(parseApiErrorMessage(t, res.status));
  }
  return (await res.json()) as MeHistoryResponse;
}
