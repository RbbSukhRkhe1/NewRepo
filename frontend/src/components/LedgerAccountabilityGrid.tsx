import { useMemo, useState } from 'react';
import type { LedgerV2Entry } from '../lib/ledgerV2';
import {
  formatEth,
  formatTimestamp,
  initials,
  recordedIso,
  shortAddress,
  shortHash,
  weiFromEthString,
} from '../lib/ledgerFormat';
import { SurfaceCard } from './ui';

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

type Props = {
  entries: LedgerV2Entry[];
  isLoading: boolean;
  loadError: string | null;
  isLightMode: boolean;
  onOpenDetail: (id: number) => void;
};

export function LedgerAccountabilityGrid({ entries, isLoading, loadError, isLightMode, onOpenDetail }: Props) {
  const [causeSearch, setCauseSearch] = useState('');
  const [selectedCause, setSelectedCause] = useState('');

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

  const activeCause = useMemo(() => {
    if (selectedCause && causeOptions.includes(selectedCause)) return selectedCause;
    return causeOptions[0] ?? '';
  }, [selectedCause, causeOptions]);

  const selectedCauseEntries = useMemo(() => {
    const c = activeCause.trim();
    if (!c) return [];
    return entries.filter((e) => (e.cause_name || '').trim() === c);
  }, [entries, activeCause]);

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
    const base = 'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold';
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

  return (
    <SurfaceCard className="mt-6 overflow-hidden rounded-2xl p-0">
      <div className="border-b border-[var(--glass-border)] px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-[var(--text-high-3)]">Transparency grid</h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted-1)]">
              Search by <span className="font-semibold">cause name</span>. Compare donations in vs disbursements out with
              balancing totals.
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
              value={activeCause}
              onChange={(e) => setSelectedCause(e.target.value)}
              className="vtx-input w-full px-4 py-2.5 text-sm sm:w-[320px]"
              disabled={causeOptions.length === 0}
              aria-label="Select cause for transparency grid"
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
        <div className="border-b border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 sm:px-6">{loadError}</div>
      ) : null}

      <div className="grid gap-4 px-4 py-4 sm:px-6 lg:grid-cols-2">
        <SurfaceCard className="overflow-hidden rounded-2xl p-0">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--glass-border)] px-4 py-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted-2)]">Inflow</p>
              <p className="mt-0.5 text-sm font-semibold text-[var(--text-high-3)]">Donations log</p>
            </div>
            <p className="truncate text-xs text-[var(--text-muted-1)]">{activeCause || 'Select a cause'}</p>
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
                            <p className="truncate font-semibold text-[var(--text-high-3)]">
                              {e.from_display_name ?? 'Anonymous'}
                            </p>
                            <p className="font-mono text-[11px] text-[var(--text-muted-1)]">{shortAddress(e.from_addr)}</p>
                          </div>
                        </div>
                      </td>
                      <td
                        className={`px-4 py-3 font-mono text-xs font-semibold ${isLightMode ? 'text-emerald-700' : 'text-emerald-300'}`}
                      >
                        +{e.value_eth} <span className="text-[11px] font-medium text-[var(--text-muted-1)]">ETH</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted-1)]">
                        {(() => {
                          const iso = recordedIso(e.recorded_at);
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
                  <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted-2)]">
                    Total received
                  </td>
                  <td className="px-4 py-3 font-mono text-sm font-semibold text-[var(--text-high-3)]">
                    {formatEth(causeTotals.receivedWei, 6)} ETH
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </SurfaceCard>

        <SurfaceCard className="overflow-hidden rounded-2xl p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--glass-border)] px-4 py-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted-2)]">Outflow & status</p>
              <p className="mt-0.5 text-sm font-semibold text-[var(--text-high-3)]">Disbursement log</p>
            </div>
            <span className={statusPillClass}>{disbursementStatus.label}</span>
          </div>

          <div className="grid gap-3 px-4 py-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  ['Total received', formatEth(causeTotals.receivedWei, 6)],
                  ['Disbursed', formatEth(causeTotals.disbursedWei, 6)],
                  ['Remaining in Vaultex', formatEth(causeTotals.remainingWei, 6)],
                ] as const
              ).map(([label, value]) => (
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
                          onClick={() => onOpenDetail(e.id)}
                          className="text-left hover:underline"
                          title="Open rich detail"
                        >
                          <p className="truncate font-semibold text-[var(--text-high-3)]">
                            {e.to_display_name || 'Beneficiary'}
                          </p>
                        </button>
                        <p className="font-mono text-[11px] text-[var(--text-muted-1)]">{shortAddress(e.to_addr)}</p>
                      </td>
                      <td
                        className={`px-4 py-3 font-mono text-xs font-semibold ${isLightMode ? 'text-amber-800' : 'text-amber-200'}`}
                      >
                        −{e.value_eth} <span className="text-[11px] font-medium text-[var(--text-muted-1)]">ETH</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted-1)]">
                        {(() => {
                          const iso = recordedIso(e.recorded_at);
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
  );
}
