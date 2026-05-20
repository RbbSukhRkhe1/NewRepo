export type LedgerV2Kind = 'donation_in' | 'disbursement_out' | 'chain_sync';

export type LedgerV2Entry = {
  id: number;
  tx_hash: string;
  block_number: number | null;
  from_addr: string;
  to_addr: string;
  value_eth: string;
  kind: LedgerV2Kind;
  cause_id: number | null;
  from_display_name: string | null;
  to_display_name: string | null;
  cause_name: string | null;
  memo: string | null;
  recorded_at: string;
  tags: string | null;
  reference: string | null;
  narrative: string | null;
  linked_tx_ids: string | null;
  aggregated_from: string | null;
};

export type LedgerV2Donor = {
  donationEntryId: number;
  displayName: string;
  amountEth: string;
  txHash: string;
  recordedAt: string;
};

export type CauseUtilization = {
  causeId: number;
  donatedEth: number;
  disbursedEth: number;
  remainingEth: number;
  utilizationPct: number;
};

export type LedgerV2Detail = {
  entry: LedgerV2Entry;
  donors: LedgerV2Donor[];
  aggregatedFrom: { initials: string; amountEth: string }[];
  utilization: CauseUtilization | null;
};

export async function loadLedgerV2(params?: {
  q?: string;
  kind?: LedgerV2Kind;
  causeId?: number;
  tag?: string;
  limit?: number;
  offset?: number;
}): Promise<LedgerV2Entry[]> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.kind) qs.set('kind', params.kind);
  if (params?.causeId != null) qs.set('causeId', String(params.causeId));
  if (params?.tag) qs.set('tag', params.tag);
  if (params?.limit != null) qs.set('limit', String(params.limit));
  if (params?.offset != null) qs.set('offset', String(params.offset));
  const url = `/api/ledger/v2${qs.toString() ? `?${qs.toString()}` : ''}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`Ledger v2 error ${res.status}`);
  return (await res.json()) as LedgerV2Entry[];
}

export async function loadLedgerV2Detail(id: number): Promise<LedgerV2Detail> {
  const res = await fetch(`/api/ledger/v2/${id}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Ledger detail error ${res.status}`);
  return (await res.json()) as LedgerV2Detail;
}

export async function loadLedgerV2Tags(): Promise<string[]> {
  const res = await fetch('/api/ledger/v2/tags', { credentials: 'include' });
  if (!res.ok) return [];
  const data = (await res.json()) as { tags?: unknown };
  return Array.isArray(data.tags) ? (data.tags as string[]) : [];
}

export async function verifyLedgerV2Entry(id: number): Promise<{
  txHash: string;
  vaultMasked: string;
  vaultBalanceBeforeEth: string;
  vaultBalanceAfterEth: string;
  blockNumber: number;
}> {
  const res = await fetch(`/api/ledger/v2/${id}/verify`, { credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Verify error ${res.status}`);
  return data as {
    txHash: string;
    vaultMasked: string;
    vaultBalanceBeforeEth: string;
    vaultBalanceAfterEth: string;
    blockNumber: number;
  };
}

