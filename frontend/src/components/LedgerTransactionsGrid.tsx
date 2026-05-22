import { useMemo, useState } from 'react';
import type { LedgerV2Entry, LedgerV2Kind } from '../lib/ledgerV2';
import {
  amountDisplay,
  donorLabel,
  filterByCauseName,
  filterByDonorName,
  filterByReceiverName,
  formatLedgerTime,
  receiverLabel,
  shortAddr,
  sortLedgerEntries,
  uniqueCauseNames,
  uniqueDonorNames,
  uniqueReceiverNames,
  type LedgerSortDir,
  type LedgerSortKey,
} from '../lib/ledgerGrid';
import { exportLedgerPdf } from '../lib/ledgerExportPdf';
import { PrimaryButton, SecondaryButton, SurfaceCard } from './ui';

function shortHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}

type Props = {
  entries: LedgerV2Entry[];
  isLoading: boolean;
  loadError: string | null;
  tab: 'all' | LedgerV2Kind;
  onTabChange: (tab: 'all' | LedgerV2Kind) => void;
  search: string;
  onSearchChange: (q: string) => void;
  isLightMode: boolean;
  onRowClick?: (id: number) => void;
};

export function LedgerTransactionsGrid({
  entries,
  isLoading,
  loadError,
  tab,
  onTabChange,
  search,
  onSearchChange,
  isLightMode,
  onRowClick,
}: Props) {
  const [causeFilter, setCauseFilter] = useState('__all__');
  const [donorFilter, setDonorFilter] = useState('__all__');
  const [receiverFilter, setReceiverFilter] = useState('__all__');
  const [sortBy, setSortBy] = useState<LedgerSortKey>('time');
  const [sortDir, setSortDir] = useState<LedgerSortDir>('desc');
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const causeOptions = useMemo(() => uniqueCauseNames(entries), [entries]);
  const donorOptions = useMemo(() => uniqueDonorNames(entries), [entries]);
  const receiverOptions = useMemo(() => uniqueReceiverNames(entries), [entries]);

  const gridRows = useMemo(() => {
    const byTab = tab === 'all' ? entries : entries.filter((e) => e.kind === tab);
    const byCause = filterByCauseName(byTab, causeFilter);
    const byDonor = filterByDonorName(byCause, donorFilter);
    const byReceiver = filterByReceiverName(byDonor, receiverFilter);
    return sortLedgerEntries(byReceiver, sortBy, sortDir);
  }, [entries, tab, causeFilter, donorFilter, receiverFilter, sortBy, sortDir]);

  const allVisibleSelected =
    gridRows.length > 0 && gridRows.every((e) => selected.has(e.id));

  const toggleAll = () => {
    if (allVisibleSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const e of gridRows) next.delete(e.id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const e of gridRows) next.add(e.id);
        return next;
      });
    }
  };

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExport = () => {
    const picked = gridRows.filter((e) => selected.has(e.id));
    const toExport = picked.length > 0 ? picked : gridRows;
    if (toExport.length === 0) return;
    const label =
      causeFilter !== '__all__'
        ? `Vaultex Ledger — ${causeFilter}`
        : 'Vaultex Ledger — All transactions';
    exportLedgerPdf(toExport, label);
  };

  return (
    <SurfaceCard className="mt-6 overflow-hidden rounded-2xl p-0">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--glass-border)] px-4 py-4 sm:px-6">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-high-3)]">Transaction grid</h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted-1)]">
            {gridRows.length} row{gridRows.length === 1 ? '' : 's'}
            {selected.size > 0 ? ` · ${selected.size} selected` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
                onClick={() => onTabChange(key)}
                className={`rounded-full px-3 py-1.5 transition-colors ${
                  tab === key ? 'text-[#020617]' : 'text-[var(--text-muted-2)] hover:bg-[var(--overlay-surface-soft)]'
                }`}
                style={tab === key ? { backgroundColor: 'var(--accent-core)' } : undefined}
              >
                {label}
              </button>
            ))}
          </nav>
          <PrimaryButton type="button" onClick={handleExport} disabled={gridRows.length === 0}>
            Export PDF
          </PrimaryButton>
        </div>
      </div>

      <div className="grid gap-3 border-b border-[var(--glass-border)] px-4 py-3 sm:grid-cols-2 lg:grid-cols-6 sm:px-6">
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search donor, hash, cause…"
          className="vtx-input w-full px-4 py-2.5 text-sm lg:col-span-2"
        />
        <select
          value={causeFilter}
          onChange={(e) => setCauseFilter(e.target.value)}
          className="vtx-input w-full px-4 py-2.5 text-sm"
          aria-label="Filter by cause"
        >
          <option value="__all__">All causes</option>
          {causeOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={donorFilter}
          onChange={(e) => setDonorFilter(e.target.value)}
          className="vtx-input w-full px-4 py-2.5 text-sm"
          aria-label="Filter by donor"
        >
          <option value="__all__">All donors</option>
          {donorOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={receiverFilter}
          onChange={(e) => setReceiverFilter(e.target.value)}
          className="vtx-input w-full px-4 py-2.5 text-sm"
          aria-label="Filter by receiver"
        >
          <option value="__all__">All receivers</option>
          {receiverOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <div className="flex gap-2 lg:col-span-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as LedgerSortKey)}
            className="vtx-input min-w-0 flex-1 px-3 py-2.5 text-sm"
            aria-label="Sort by"
          >
            <option value="time">Sort: Time</option>
            <option value="cause">Sort: Cause</option>
            <option value="donor">Sort: Donor</option>
            <option value="receiver">Sort: Receiver</option>
          </select>
          <SecondaryButton
            type="button"
            className="shrink-0 px-3"
            onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            aria-label={sortDir === 'asc' ? 'Ascending' : 'Descending'}
            title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortDir === 'asc' ? '↑' : '↓'}
          </SecondaryButton>
        </div>
      </div>

      {loadError ? (
        <div className="border-b border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 sm:px-6">
          {loadError}
        </div>
      ) : null}

      <div className="overflow-auto">
        <table className="w-full min-w-[880px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--overlay-surface-soft)] text-[11px] uppercase tracking-wide text-[var(--text-muted-2)]">
            <tr>
              <th className="w-10 px-3 py-3 font-semibold">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAll}
                  disabled={gridRows.length === 0}
                  aria-label="Select all visible transactions"
                  className="h-4 w-4 rounded border-[var(--border-chrome-3)]"
                />
              </th>
              <th className="px-3 py-3 font-semibold">Txn ID</th>
              <th className="px-3 py-3 font-semibold">Donor</th>
              <th className="px-3 py-3 font-semibold">Receiver</th>
              <th className="px-3 py-3 font-semibold">Amount</th>
              <th className="px-3 py-3 font-semibold">Cause</th>
              <th className="px-3 py-3 font-semibold">Time</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-[var(--text-muted-1)]">
                  Loading transactions…
                </td>
              </tr>
            ) : gridRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-[var(--text-muted-1)]">
                  No transactions match your filters.
                </td>
              </tr>
            ) : (
              gridRows.map((e) => {
                const incoming = e.kind === 'donation_in';
                return (
                  <tr
                    key={`${e.id}-${e.tx_hash}`}
                    className={`border-t border-[var(--glass-border)] ${
                      isLightMode ? 'hover:bg-white/70' : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <td className="px-3 py-3 align-middle">
                      <input
                        type="checkbox"
                        checked={selected.has(e.id)}
                        onChange={() => toggleOne(e.id)}
                        aria-label={`Select transaction ${e.id}`}
                        className="h-4 w-4 rounded border-[var(--border-chrome-3)]"
                      />
                    </td>
                    <td className="px-3 py-3 align-middle font-mono text-xs">
                      <button
                        type="button"
                        title={e.tx_hash}
                        onClick={() => void navigator.clipboard.writeText(e.tx_hash)}
                        className={`font-semibold hover:underline ${isLightMode ? 'text-sky-700' : 'text-cyan-300'}`}
                      >
                        {shortHash(e.tx_hash)}
                      </button>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <button
                        type="button"
                        onClick={() => onRowClick?.(e.id)}
                        className="text-left hover:underline"
                      >
                        <p className="font-medium text-[var(--text-high-3)]">{donorLabel(e)}</p>
                        <p className="font-mono text-[10px] text-[var(--text-muted-1)]">{shortAddr(e.from_addr)}</p>
                      </button>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <p className="font-medium text-[var(--text-high-3)]">{receiverLabel(e)}</p>
                      <p className="font-mono text-[10px] text-[var(--text-muted-1)]">{shortAddr(e.to_addr)}</p>
                    </td>
                    <td
                      className={`px-3 py-3 align-middle font-mono text-xs font-semibold whitespace-nowrap ${
                        incoming
                          ? isLightMode
                            ? 'text-emerald-700'
                            : 'text-emerald-300'
                          : isLightMode
                            ? 'text-amber-800'
                            : 'text-amber-200'
                      }`}
                    >
                      {amountDisplay(e)}
                    </td>
                    <td className="px-3 py-3 align-middle text-[var(--text-high-2)]">
                      {e.cause_name?.trim() || '—'}
                    </td>
                    <td className="px-3 py-3 align-middle text-xs text-[var(--text-muted-1)] whitespace-nowrap">
                      {formatLedgerTime(e.recorded_at)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </SurfaceCard>
  );
}
