import { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  loadDonationLedger,
  type DonationLedgerEntry,
  type DonationLedgerKind,
} from '../lib/donationLedger';

const ACCENT = '#00f0ff';
const ROW_HEIGHT = 108;
const STICK_BOTTOM_THRESHOLD = 80;
const POLL_MS = 4000;

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

function summaryLine(entry: DonationLedgerEntry): string {
  if (entry.kind === 'donation_in') {
    return `${entry.fromDisplayName} donated ${entry.amountEth} ETH to ${entry.toDisplayName}`;
  }
  return `${entry.fromDisplayName} sent ${entry.amountEth} ETH to ${entry.toDisplayName}`;
}

type Tab = 'all' | DonationLedgerKind;

export function LedgerPage() {
  const [entries, setEntries] = useState<DonationLedgerEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('all');

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const refresh = useCallback(() => {
    loadDonationLedger()
      .then((data) => {
        setEntries(data);
        setLoadError(null);
      })
      .catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : 'Failed to load ledger');
      });
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  const filtered = useMemo(() => {
    if (tab === 'all') return entries;
    return entries.filter((e) => e.kind === tab);
  }, [entries, tab]);

  // TanStack Virtual returns non-memoizable functions — safe here, React Compiler skips this subtree
  // eslint-disable-next-line react-hooks/incompatible-library -- useVirtualizer
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
      const n = parseFloat(e.amountEth);
      if (e.kind === 'donation_in') inEth += n;
      else outEth += n;
    }
    return { inEth, outEth };
  }, [entries]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-left">
      <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
        On-chain + database
      </p>
      <h1 className="mt-2 text-3xl font-bold text-white">Transparency ledger</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Pulled from SQLite (app writes + Anvil watcher). Refreshes every few seconds.
      </p>

      <div
        className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl"
        style={{ boxShadow: `0 0 0 1px ${ACCENT}14 inset` }}
      >
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Totals (loaded window)</p>
        <div className="mt-3 flex flex-wrap gap-6">
          <p className="text-2xl font-semibold tabular-nums text-white">
            {totals.inEth.toLocaleString(undefined, { maximumFractionDigits: 4 })}{' '}
            <span className="text-base font-normal text-zinc-500">ETH in</span>
          </p>
          <p className="text-2xl font-semibold tabular-nums text-white">
            {totals.outEth.toLocaleString(undefined, { maximumFractionDigits: 4 })}{' '}
            <span className="text-base font-normal text-zinc-500">ETH out</span>
          </p>
        </div>
      </div>

      <div
        className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-2xl backdrop-blur-2xl"
        style={{ boxShadow: `0 25px 80px -20px #000, 0 0 0 1px ${ACCENT}12 inset` }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6">
          <h2 className="text-lg font-semibold text-white">Activity</h2>
          <nav className="flex rounded-full border border-white/10 bg-black/30 p-1 text-xs font-medium">
            {(
              [
                ['all', 'All'],
                ['donation_in', 'Donations'],
                ['disbursement_out', 'Sent out'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`rounded-full px-3 py-1.5 transition-colors ${
                  tab === key ? 'text-black' : 'text-zinc-400 hover:text-white'
                }`}
                style={tab === key ? { backgroundColor: ACCENT, color: '#020617' } : undefined}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        {loadError && (
          <div className="border-b border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 sm:px-6">
            {loadError}
          </div>
        )}

        <div
          ref={scrollRef}
          onScroll={updateStickToBottom}
          className="max-h-[min(560px,70vh)] overflow-auto"
        >
          {filtered.length === 0 && !loadError ? (
            <div className="px-6 py-16 text-center text-sm text-zinc-500">
              No entries yet. Run Anvil, use the app, or adjust filters.
            </div>
          ) : filtered.length === 0 ? null : (
            <div className="relative w-full" style={{ height: virtualTotalSize }}>
              {rowVirtualizer.getVirtualItems().map((vi) => {
                const entry = filtered[vi.index];
                const incoming = entry.kind === 'donation_in';
                return (
                  <div
                    key={entry.id + entry.txHash}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: vi.size,
                      transform: `translateY(${vi.start}px)`,
                    }}
                    className="border-b border-white/[0.06] px-4 py-4 transition-colors hover:bg-white/[0.03] sm:px-6"
                  >
                    <div className="flex gap-4">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border text-sm font-bold"
                        style={{
                          borderColor: `${ACCENT}55`,
                          background: `linear-gradient(145deg, ${ACCENT}22, rgba(59,130,246,0.12))`,
                          color: ACCENT,
                        }}
                      >
                        {initials(entry.fromDisplayName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium leading-snug text-white">{summaryLine(entry)}</p>
                        <p className="mt-1 font-mono text-[11px] leading-relaxed text-zinc-500 sm:text-xs">
                          <span className="text-zinc-400">{entry.fromDisplayName}</span>{' '}
                          <span className="text-zinc-600">({entry.fromMasked})</span>
                          {' · '}
                          <span className="text-zinc-400">{entry.toDisplayName}</span>{' '}
                          <span className="text-zinc-600">({entry.toMasked})</span>
                        </p>
                        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-zinc-500">
                          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-emerald-300/90">
                            ✓ On-chain
                          </span>
                          <span className="text-zinc-600">Tx</span>{' '}
                          <button
                            type="button"
                            title="Copy hash"
                            onClick={() => void navigator.clipboard.writeText(entry.txHash)}
                            className="text-cyan-400/90 hover:text-cyan-300 hover:underline"
                          >
                            {shortHash(entry.txHash)}
                          </button>
                          <span className="hidden sm:inline text-zinc-600">·</span>
                          <span className="text-zinc-400">Cause: {entry.causeName || '—'}</span>
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className={`text-lg font-semibold tabular-nums ${
                            incoming ? 'text-emerald-400' : 'text-amber-300'
                          }`}
                        >
                          {incoming ? '+' : '−'}
                          {entry.amountEth}
                          <span className="ml-0.5 text-sm font-normal text-zinc-500">ETH</span>
                        </p>
                        <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                          {incoming ? 'Donation' : 'Disbursement'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
