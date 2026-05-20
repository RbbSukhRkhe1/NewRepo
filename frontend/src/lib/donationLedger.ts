export type DonationLedgerKind = 'donation_in' | 'disbursement_out';

export interface DonationLedgerEntry {
  id: string;
  kind: DonationLedgerKind;
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

export async function loadDonationLedger(): Promise<DonationLedgerEntry[]> {
  const res = await fetch('/api/ledger', { credentials: 'include' });
  if (!res.ok) throw new Error(`Ledger error ${res.status}`);
  return (await res.json()) as DonationLedgerEntry[];
}
