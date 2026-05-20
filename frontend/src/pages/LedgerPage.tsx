import { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { formatEther, parseEther } from '../lib/ethWei';
import { loadLedgerV2, loadLedgerV2Detail, loadLedgerV2Tags, type LedgerV2Entry, type LedgerV2Kind } from '../lib/ledgerV2';
import { formatLedgerSummary } from '../lib/ledgerCopy';
import { EyebrowLabel, SectionHeader, SurfaceCard } from '../components/ui';
import { TransactionModal } from '../components/TransactionModal';

const ROW_HEIGHT = 152;
const STICK_BOTTOM_THRESHOLD = 80;
const POLL_MS = 4000;

function weiFromEthString(amountEth: string): bigint {
  try {
    return parseEther(amountEth);
  } catch {
    return 0n;
  }
}

function formatEth(wei: bigint, decimals = 6): string {
  const s = formatEther(wei);
  const [i, f = ''] = s.split('.');
  if (decimals <= 0) return i;
  return `${i}.${f.padEnd(decimals, '0').slice(0, decimals)}`.replace(/\.?0+$/, '');
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function initials(name: string): string {
  const t = name.trim();
  if (!t) return '??';
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return t.slice(0, 2).toUpperCase();
}

function shortHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

function shortAddress(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function timeAgo(iso: string): string {
  const diffMs = Math.max(0, Date.now() - new Date(iso).getTime());
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function summaryLine(entry: {
  kind: LedgerV2Kind;
  value_eth: string;
  from_display_name: string | null;
  to_display_name: string | null;
  from_addr: string;
  to_addr: string;
  cause_name: string | null;
}): string {
  return formatLedgerSummary({
    id: '0',
    kind: entry.kind === 'chain_sync' ? 'donation_in' : entry.kind,
    fromDisplayName: entry.from_display_name ?? 'Anonymous',
    fromMasked: entry.from_addr,
    toDisplayName: entry.to_display_name ?? 'Unknown',
    toMasked: entry.to_addr,
    amountEth: entry.value_eth,
    causeName: entry.cause_name ?? '',
    memo: '',
    txHash: '',
    recordedAt: new Date().toISOString(),
  });
}

export function LedgerPage() {
  const [entries, setEntries] = useState<LedgerV2Entry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<'all' | LedgerV2Kind>('all');
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [tagOptions, setTagOptions] = useState<string[]>([]);
  const [causeSearch, setCauseSearch] = useState('');
  const [selectedCause, setSelectedCause] = useState<string>('');
  const [isLightMode, setIsLightMode] = useState(
    () => typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light',
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [modalDetail, setModalDetail] = useState<Awaited<ReturnType<typeof loadLedgerV2Detail>> | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const refresh = useCallback(() => {
    setIsLoading(true);
    loadLedgerV2({ limit: 500, q: search.trim() || undefined, kind: tab === 'all' ? undefined : tab, tag: tag.trim() || undefined })
      .then((data) => {
        setEntries(data);
        setLoadError(null);
      })
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : 'Failed to load ledger');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [search, tab, tag]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    loadLedgerV2Tags().then(setTagOptions).catch(() => setTagOptions([]));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => setIsLightMode(root.getAttribute('data-theme') === 'light');
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const filtered = useMemo(() => {
    const byTab = tab === 'all' ? entries : entries.filter((e) => e.kind === tab);
    const q = search.trim().toLowerCase();
    if (!q) return byTab;
    return byTab.filter((e) =>
      `${e.from_display_name ?? ''} ${e.to_display_name ?? ''} ${e.from_addr} ${e.to_addr} ${e.tx_hash} ${e.cause_name ?? ''} ${e.reference ?? ''} ${e.narrative ?? ''} ${e.tags ?? ''}`
        .toLowerCase()
        .includes(q),
    );
  }, [entries, tab, search]);

  const causeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      const name = (e.cause_name || '').trim();
      if (name) set.add(name);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const filteredCauseOptions = useMemo(() => {
    const q = causeSearch.trim().toLowerCase();
    if (!q) return causeOptions;
    return causeOptions.filter((c) => c.toLowerCase().includes(q));
  }, [causeOptions, causeSearch]);

  useEffect(() => {
    if (selectedCause) return;
    if (causeOptions.length === 0) return;
    setSelectedCause(causeOptions[0]);
  }, [causeOptions, selectedCause]);

  const selectedCauseEntries = useMemo(() => {
    const c = selectedCause.trim();
    if (!c) return [];
    return entries.filter((e) => (e.cause_name || '').trim() === c);
  }, [entries, selectedCause]);

  const donationsForCause = useMemo(
    () => selectedCauseEntries.filter((e) => e.kind === 'donation_in'),
    [selectedCauseEntries],
  );
  const disbursementsForCause = useMemo(
    () => selectedCauseEntries.filter((e) => e.kind === 'disbursement_out'),
    [selectedCauseEntries],
  );

  const causeTotals = useMemo(() => {
    let receivedWei = 0n;
    let disbursedWei = 0n;
    for (const e of selectedCauseEntries) {
      const w = weiFromEthString(e.value_eth);
      if (e.kind === 'donation_in') receivedWei += w;
      else disbursedWei += w;
    }
    const remainingWei = receivedWei > disbursedWei ? receivedWei - disbursedWei : 0n;
    return { receivedWei, disbursedWei, remainingWei };
  }, [selectedCauseEntries]);

  const disbursementStatus = useMemo(() => {
    const r = causeTotals.receivedWei;
    const d = causeTotals.disbursedWei;
    const rem = causeTotals.remainingWei;
    if (r === 0n) return { key: 'none', label: 'No donations yet' } as const;
    if (d === 0n && rem === r) return { key: 'vault', label: 'In Vaultex' } as const;
    if (rem === 0n && d > 0n) return { key: 'full', label: 'Fully Disbursed' } as const;
    return { key: 'partial', label: 'Partially Disbursed' } as const;
  }, [causeTotals]);

  const statusPillClass = useMemo(() => {
    const base =
      'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold';
    if (disbursementStatus.key === 'full') {
      return `${base} ${isLightMode ? 'border-emerald-600/25 bg-emerald-600/12 text-emerald-800' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'}`;
    }
    if (disbursementStatus.key === 'partial') {
      return `${base} ${isLightMode ? 'border-amber-600/25 bg-amber-600/12 text-amber-900' : 'border-amber-400/25 bg-amber-400/10 text-amber-100'}`;
    }
    if (disbursementStatus.key === 'vault') {
      return `${base} ${isLightMode ? 'border-sky-600/25 bg-sky-600/12 text-sky-900' : 'border-cyan-400/25 bg-cyan-400/10 text-cyan-100'}`;
    }
    return `${base} ${isLightMode ? 'border-[rgba(15,23,42,0.14)] bg-[rgba(15,23,42,0.04)] text-slate-700' : 'border-white/[0.10] bg-white/[0.03] text-white/80'}`;
  }, [disbursementStatus.key, isLightMode]);

  // eslint-disable-next-line react-hooks/incompatible-library
  // TanStack Virtual returns non-memoizable functions — safe here, React Compiler skips this subtree
  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const virtualTotalSize = rowVirtualizer.getTotalSize();

  const updateStickToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = gap <= STICK_BOTTOM_THRESHOLD;
  };

  useLayoutEffect(() => {
    if (filtered.length === 0) return;
    if (!stickToBottomRef.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [filtered.length, virtualTotalSize]);

  const totals = useMemo(() => {
    let inEth = 0;
    let outEth = 0;
    for (const e of entries) {
      const n = parseFloat(e.value_eth);
      if (e.kind === 'donation_in') inEth += n;
      else outEth += n;
    }
    return { inEth, outEth };
  }, [entries]);

  const availableEth = Math.max(0, totals.inEth - totals.outEth);

  const donationEntries = useMemo(() => entries.filter((e) => e.kind === 'donation_in'), [entries]);
  const disbursementEntries = useMemo(() => entries.filter((e) => e.kind === 'disbursement_out'), [entries]);
  const activeDonorCount = useMemo(() => new Set(donationEntries.map((e) => e.from_addr)).size, [donationEntries]);
  const proofCoveragePct = useMemo(() => {
    if (entries.length === 0) return 0;
    const withTx = entries.filter((e) => e.tx_hash && e.tx_hash.length > 0).length;
    return (withTx / entries.length) * 100;
  }, [entries]);
  const causeAllocations = useMemo(() => {
    const map = new Map<string, { donated: number; disbursed: number; events: number }>();
    for (const e of entries) {
      const key = e.cause_name || 'Unassigned';
      const current = map.get(key) ?? { donated: 0, disbursed: 0, events: 0 };
      const amt = parseFloat(e.value_eth);
      if (e.kind === 'donation_in') current.donated += amt;
      else current.disbursed += amt;
      current.events += 1;
      map.set(key, current);
    }
    return [...map.entries()]
      .map(([causeName, v]) => ({
        causeName,
        donated: v.donated,
        disbursed: v.disbursed,
        reserved: Math.max(0, v.donated - v.disbursed),
        events: v.events,
      }))
      .sort((a, b) => b.donated - a.donated);
  }, [entries]);

  useEffect(() => {
    // WebSocket realtime: improves responsiveness, but polling remains the fallback.
    try {
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const ws = new WebSocket(`${proto}://${window.location.host}/api/ws`);
      ws.onmessage = () => refresh();
      return () => ws.close();
    } catch {
      return;
    }
  }, [refresh]);

  const openDetail = (id: number) => {
    setModalOpen(true);
    setModalDetail(null);
    loadLedgerV2Detail(id)
      .then((d) => setModalDetail(d))
      .catch(() => setModalOpen(false));
  };

  return (
    <div className="vtx-page max-w-6xl text-left">
      <EyebrowLabel>Donor transparency</EyebrowLabel>
      <SectionHeader
        title="Ledger — Full Accountability Grid"
        body="Absolute transparency: trace inflow vs outflow per cause with totals that balance."
      />

      <SurfaceCard className="mt-6 overflow-hidden rounded-2xl p-0">
        <div className="border-b border-[var(--glass-border)] px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-[var(--text-high-3)]">Cause search</h2>
              <p className="mt-0.5 text-xs text-[var(--text-muted-1)]">
                Search by <span className="font-semibold">Cause Name</span>. Selecting a cause loads its accountability grid.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                value={causeSearch}
                onChange={(e) => setCauseSearch(e.target.value)}
                placeholder="Search causes…"
                className="vtx-input w-full px-4 py-2.5 text-sm sm:w-[260px]"
              />
              <select
                value={selectedCause}
                onChange={(e) => setSelectedCause(e.target.value)}
                className="vtx-input w-full px-4 py-2.5 text-sm sm:w-[320px]"
                disabled={causeOptions.length === 0}
              >
                {causeOptions.length === 0 ? <option value="">No causes yet</option> : null}
                {(causeSearch.trim() ? filteredCauseOptions : causeOptions).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loadError ? (
          <div className="border-b border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 sm:px-6">
            {loadError}
          </div>
        ) : null}

        <div className="grid gap-4 px-4 py-4 sm:px-6 lg:grid-cols-2">
          <SurfaceCard className="rounded-2xl p-0 overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--glass-border)] px-4 py-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted-2)]">Inflow</p>
                <p className="mt-0.5 text-sm font-semibold text-[var(--text-high-3)]">Donations log</p>
              </div>
              <p className="truncate text-xs text-[var(--text-muted-1)]">{selectedCause ? selectedCause : 'Select a cause'}</p>
            </div>

            <div className="overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-[var(--overlay-surface-soft)] text-[11px] uppercase tracking-wide text-[var(--text-muted-2)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Donor</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Timestamp</th>
                    <th className="px-4 py-3 font-semibold">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-sm text-[var(--text-muted-1)]">
                        Loading donations…
                      </td>
                    </tr>
                  ) : donationsForCause.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-sm text-[var(--text-muted-1)]">
                        No donations found for this cause.
                      </td>
                    </tr>
                  ) : (
                    donationsForCause.map((e) => (
                      <tr key={`in-${e.id}-${e.tx_hash}`} className="border-t border-[var(--glass-border)]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-accent-soft)] bg-[var(--overlay-surface-soft)] text-xs font-bold text-[var(--accent-bright-2)]">
                              {initials(e.from_display_name ?? 'Anonymous')}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[var(--text-high-3)]">{e.from_display_name ?? 'Anonymous'}</p>
                              <p className="font-mono text-[11px] text-[var(--text-muted-1)]">{shortAddress(e.from_addr)}</p>
                            </div>
                          </div>
                        </td>
                        <td className={`px-4 py-3 font-mono text-xs font-semibold ${isLightMode ? 'text-emerald-700' : 'text-emerald-300'}`}>
                          +{e.value_eth} <span className="text-[11px] font-medium text-[var(--text-muted-1)]">ETH</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--text-muted-1)]">
                          {(() => {
                            const iso = new Date(e.recorded_at + 'Z').toISOString();
                            return (
                              <>
                                <div className="font-medium text-[var(--text-high-2)]">{formatTimestamp(iso)}</div>
                                <div>{timeAgo(iso)}</div>
                              </>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted-1)]">
                          <button
                            type="button"
                            title="Copy transaction hash"
                            onClick={() => void navigator.clipboard.writeText(e.tx_hash)}
                            className={`${isLightMode ? 'text-sky-700 hover:text-sky-800' : 'text-cyan-300 hover:text-cyan-200'} font-semibold hover:underline`}
                          >
                            {shortHash(e.tx_hash)}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="border-t border-[var(--glass-border)] bg-[var(--overlay-surface-soft)]">
                  <tr>
                    <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted-2)]">Total received</td>
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-[var(--text-high-3)]">
                      {formatEth(causeTotals.receivedWei, 6)} ETH
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </SurfaceCard>

          <SurfaceCard className="rounded-2xl p-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--glass-border)] px-4 py-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted-2)]">Outflow & status</p>
                <p className="mt-0.5 text-sm font-semibold text-[var(--text-high-3)]">Disbursement log</p>
              </div>
              <span className={statusPillClass}>{disbursementStatus.label}</span>
            </div>

            <div className="grid gap-3 px-4 py-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ['Total received', formatEth(causeTotals.receivedWei, 6)],
                  ['Disbursed', formatEth(causeTotals.disbursedWei, 6)],
                  ['Remaining in Vaultex', formatEth(causeTotals.remainingWei, 6)],
                ].map(([label, value]) => (
                  <div key={label} className="vtx-glass-inset px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted-2)]">{label}</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-[var(--text-high-3)]">{value} ETH</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-[var(--overlay-surface-soft)] text-[11px] uppercase tracking-wide text-[var(--text-muted-2)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Beneficiary</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Timestamp</th>
                    <th className="px-4 py-3 font-semibold">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-sm text-[var(--text-muted-1)]">
                        Loading disbursements…
                      </td>
                    </tr>
                  ) : disbursementsForCause.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-sm text-[var(--text-muted-1)]">
                        No disbursements yet for this cause.
                      </td>
                    </tr>
                  ) : (
                    disbursementsForCause.map((e) => (
                      <tr
                        key={`out-${e.id}-${e.tx_hash}`}
                        className="border-t border-[var(--glass-border)] hover:bg-[var(--overlay-surface-soft)]"
                      >
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => openDetail(e.id)}
                            className="text-left hover:underline"
                            title="Open rich detail"
                          >
                            <p className="truncate font-semibold text-[var(--text-high-3)]">{e.to_display_name || 'Beneficiary'}</p>
                          </button>
                          <p className="font-mono text-[11px] text-[var(--text-muted-1)]">{shortAddress(e.to_addr)}</p>
                        </td>
                        <td className={`px-4 py-3 font-mono text-xs font-semibold ${isLightMode ? 'text-amber-800' : 'text-amber-200'}`}>
                          −{e.value_eth} <span className="text-[11px] font-medium text-[var(--text-muted-1)]">ETH</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--text-muted-1)]">
                          {(() => {
                            const iso = new Date(e.recorded_at + 'Z').toISOString();
                            return (
                              <>
                                <div className="font-medium text-[var(--text-high-2)]">{formatTimestamp(iso)}</div>
                                <div>{timeAgo(iso)}</div>
                              </>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted-1)]">
                          <button
                            type="button"
                            title="Copy transaction hash"
                            onClick={() => void navigator.clipboard.writeText(e.tx_hash)}
                            className={`${isLightMode ? 'text-sky-700 hover:text-sky-800' : 'text-cyan-300 hover:text-cyan-200'} font-semibold hover:underline`}
                          >
                            {shortHash(e.tx_hash)}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SurfaceCard>
        </div>
      </SurfaceCard>

      <TransactionModal
        open={modalOpen}
        detail={modalDetail}
        onClose={() => {
          setModalOpen(false);
          setModalDetail(null);
        }}
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Total donated', `${totals.inEth.toFixed(4)} ETH`],
          ['Total disbursed', `${totals.outEth.toFixed(4)} ETH`],
          ['Active donors', `${activeDonorCount}`],
          ['On-chain proof', `${proofCoveragePct.toFixed(0)}% coverage`],
        ].map(([label, value]) => (
          <SurfaceCard key={label} className="rounded-2xl p-4 sm:p-4.5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted-2)]">{label}</p>
            <p className="mt-1.5 font-mono text-lg font-semibold text-[var(--text-high-3)]">{value}</p>
          </SurfaceCard>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <SurfaceCard className="rounded-2xl p-0 overflow-hidden">
          <div className="border-b border-[var(--glass-border)] px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-muted-2)]">Cause allocation</h2>
          </div>
          <div className="max-h-[260px] overflow-auto px-4 py-3 sm:px-5">
            {causeAllocations.length === 0 ? (
              <p className="text-sm text-[var(--text-muted-1)]">No allocation activity yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {causeAllocations.map((c) => {
                  const pct = c.donated > 0 ? Math.min(100, (c.disbursed / c.donated) * 100) : 0;
                  return (
                    <li key={c.causeName} className="vtx-glass-inset px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-[var(--text-high-3)]">{c.causeName}</p>
                        <span className="text-xs text-[var(--text-muted-2)]">{c.events} events</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                        <span className="text-[var(--text-muted-1)]">Donated: <span className="font-mono">{c.donated.toFixed(4)} ETH</span></span>
                        <span className="text-[var(--text-muted-1)]">Disbursed: <span className="font-mono">{c.disbursed.toFixed(4)} ETH</span></span>
                        <span className="text-[var(--text-muted-1)]">Reserved: <span className="font-mono">{c.reserved.toFixed(4)} ETH</span></span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-[var(--bg-depth-1)] ring-1 ring-[var(--glass-border)]">
                        <div
                          className="h-full rounded-full bg-[var(--accent-core)] opacity-90"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </SurfaceCard>

        <div className="grid gap-4">
          <SurfaceCard className="rounded-2xl p-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-muted-2)]">Proof & traceability</h2>
            <ul className="mt-3 space-y-2 text-sm text-[var(--text-muted-1)]">
              <li>Explorer-ready tx hashes with copy action</li>
              <li>Wallet source/destination per movement</li>
              <li>Live activity refresh every {Math.round(POLL_MS / 1000)}s</li>
              <li>Available pool: <span className="font-mono text-[var(--text-high-3)]">{availableEth.toFixed(4)} ETH</span></li>
            </ul>
          </SurfaceCard>
          <SurfaceCard className="rounded-2xl p-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-muted-2)]">Impact-linked events</h2>
            <ul className="mt-3 space-y-2">
              {disbursementEntries.slice(0, 4).map((e) => (
                <li key={`impact-${e.id}-${e.tx_hash}`} className="rounded-lg border border-[var(--border-chrome-2)] px-3 py-2 text-sm">
                  <p className="truncate font-medium text-[var(--text-high-3)]">{e.cause_name || 'Unassigned cause'}</p>
                  <p className="mt-0.5 text-xs text-[var(--text-muted-1)]">
                    {e.value_eth} ETH · {timeAgo(new Date(e.recorded_at + 'Z').toISOString())}
                  </p>
                </li>
              ))}
              {disbursementEntries.length === 0 ? <li className="text-sm text-[var(--text-muted-1)]">No disbursement impact events yet.</li> : null}
            </ul>
          </SurfaceCard>
        </div>
      </div>

      <SurfaceCard className="mt-6 overflow-hidden rounded-2xl p-0">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--glass-border)] px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-high-3)]">Recent activity feed</h2>
            <p className="mt-0.5 inline-flex items-center gap-2 text-xs text-[var(--text-muted-1)]">
              <span className={`inline-block h-2 w-2 rounded-full ${isLightMode ? 'bg-emerald-600' : 'bg-emerald-400'}`} />
              Live · auto-refresh every {Math.round(POLL_MS / 1000)}s
            </p>
          </div>
          <nav className="flex rounded-full border border-[var(--border-chrome-2)] p-1 text-xs font-medium">
            {(
              [
                ['all', 'All'],
                ['donation_in', 'Donations'],
                ['disbursement_out', 'Disbursements'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`rounded-full px-3 py-1.5 transition-colors ${
                  tab === key ? 'text-black' : 'text-[var(--text-muted-2)] hover:bg-[var(--overlay-surface-soft)] hover:text-[var(--text-high-1)]'
                }`}
                style={tab === key ? { backgroundColor: 'var(--accent-core)', color: '#020617' } : undefined}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
        <div className="border-b border-[var(--glass-border)] px-4 py-3 sm:px-6">
          <div className="grid gap-2 sm:grid-cols-[1fr_240px]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search narratives, refs, causes, hashes…"
              className="vtx-input w-full px-4 py-2.5 text-sm"
            />
            <input
              list="ledger-tags"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="Filter by tag…"
              className="vtx-input w-full px-4 py-2.5 text-sm"
            />
            <datalist id="ledger-tags">
              {tagOptions.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>
        </div>

        {loadError && <div className="border-b border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 sm:px-6">{loadError}</div>}

        <div ref={scrollRef} onScroll={updateStickToBottom} className="max-h-[min(560px,70vh)] overflow-auto">
          {filtered.length === 0 && !loadError ? (
            <div className="px-6 py-16 text-center text-sm text-[var(--text-muted-1)]">No entries yet. Run Anvil, use the app, or adjust filters.</div>
          ) : filtered.length === 0 ? null : (
            <div className="relative w-full" style={{ height: virtualTotalSize }}>
              {rowVirtualizer.getVirtualItems().map((vi) => {
                const entry = filtered[vi.index];
                const incoming = entry.kind === 'donation_in';
                return (
                  <div
                    key={String(entry.id) + entry.tx_hash}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: vi.size, transform: `translateY(${vi.start}px)` }}
                    className={`border-b px-4 py-4 transition-colors sm:px-6 ${
                      isLightMode ? 'border-[rgba(173,191,213,0.28)] hover:bg-[rgba(255,255,255,0.64)]' : 'border-white/[0.06] hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="group flex gap-4">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--border-accent-soft)] bg-[var(--overlay-surface-soft)] text-sm font-bold text-[var(--accent-bright-2)]"
                      >
                        {initials(entry.from_display_name ?? 'Anonymous')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium leading-snug text-[var(--text-high-3)]">{summaryLine(entry)}</p>
                        <p className="mt-1 text-xs font-medium text-[var(--text-muted-1)]">{timeAgo(new Date(entry.recorded_at + 'Z').toISOString())}</p>
                        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-[var(--text-muted-1)]">
                          <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-semibold ${isLightMode ? 'border-emerald-600/25 bg-emerald-600/12 text-emerald-700' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'}`}>
                            <span aria-hidden="true">⛓</span> On-chain
                          </span>
                          <span>Tx</span>
                          <button type="button" title="Copy hash" onClick={() => void navigator.clipboard.writeText(entry.tx_hash)} className={`${isLightMode ? 'text-sky-700 hover:text-sky-800' : 'text-cyan-300 hover:text-cyan-200'} font-semibold hover:underline`}>
                            {shortHash(entry.tx_hash)}
                          </button>
                          <span className="hidden sm:inline">·</span>
                          <span>
                            {entry.kind === 'disbursement_out' && entry.to_display_name
                              ? `Recipient: ${entry.to_display_name}`
                              : `Cause: ${entry.cause_name || '—'}`}
                          </span>
                          {entry.kind === 'disbursement_out' ? (
                            <>
                              <span className="hidden sm:inline">·</span>
                              <span>Note: {entry.memo?.trim() || '—'}</span>
                            </>
                          ) : null}
                          <span className="hidden sm:inline">·</span>
                          <span>{shortAddress(entry.from_addr)} → {shortAddress(entry.to_addr)}</span>
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-xl font-semibold tabular-nums ${incoming ? (isLightMode ? 'text-emerald-700' : 'text-emerald-300') : isLightMode ? 'text-amber-700' : 'text-amber-300'}`}>
                          {incoming ? '+' : '−'}
                          {entry.value_eth}
                          <span className="ml-0.5 text-sm font-medium text-[var(--text-muted-1)]">ETH</span>
                        </p>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted-1)]">{incoming ? 'Donation' : 'Disbursement'}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SurfaceCard>
    </div>
  );
}
