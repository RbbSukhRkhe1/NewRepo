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
}

export interface MeHistoryResponse {
  entries: UserHistoryEntry[];
  summary: UserWalletSummary | null;
}

export async function loadMeHistory(): Promise<MeHistoryResponse> {
  const res = await fetch('/api/me/history', { credentials: 'include' });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `History error ${res.status}`);
  }
  return (await res.json()) as MeHistoryResponse;
}
