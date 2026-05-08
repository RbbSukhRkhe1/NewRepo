import { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  loadDonationLedger,
  type DonationLedgerEntry,
  type DonationLedgerKind,
} from '../lib/donationLedger';
import { EyebrowLabel, SectionHeader, SurfaceCard } from '../components/ui';

const ROW_HEIGHT = 152;
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
  const [search, setSearch] = useState('');
  const [isLightMode, setIsLightMode] = useState(
    () => typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light',
  );

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
      `${e.fromDisplayName} ${e.toDisplayName} ${e.fromMasked} ${e.toMasked} ${e.txHash} ${e.causeName}`
        .toLowerCase()
        .includes(q),
    );
  }, [entries, tab, search]);

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

  const availableEth = Math.max(0, totals.inEth - totals.outEth);
  const availablePct = totals.inEth > 0 ? Math.max(0, Math.min(100, (availableEth / totals.inEth) * 100)) : 0;

  return (
    <div className="vtx-page max-w-3xl text-left">
      <EyebrowLabel>On-chain + database</EyebrowLabel>
      <SectionHeader title="Transparency ledger" body="Pulled from SQLite (app writes + Anvil watcher). Refreshes every few seconds." />

      <SurfaceCard
        className={`mt-6 rounded-3xl p-6 ${
          isLightMode
            ? 'border border-[rgba(168,186,209,0.35)] bg-[linear-gradient(180deg,rgba(252,254,255,0.96),rgba(240,246,252,0.9))] shadow-[0_12px_24px_rgba(77,106,141,0.12)]'
            : 'shadow-[0_14px_34px_rgba(1,8,15,0.12)]'
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted-1)]">Totals</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div
            className={`rounded-2xl p-4 ${
              isLightMode
                ? 'border border-emerald-400/30 bg-emerald-400/10'
                : 'border border-emerald-500/25 bg-emerald-500/10'
            }`}
          >
            <p className={`text-xs font-semibold uppercase tracking-wider ${isLightMode ? 'text-emerald-700' : 'text-emerald-300'}`}>
              Received
            </p>
            <p className={`mt-1 text-3xl font-bold tabular-nums ${isLightMode ? 'text-emerald-700' : 'text-emerald-300'}`}>
              {totals.inEth.toLocaleString(undefined, { maximumFractionDigits: 4 })}{' '}
              <span className="text-lg font-semibold">ETH</span>
            </p>
          </div>
          <div
            className={`rounded-2xl p-4 ${
              isLightMode ? 'border border-amber-400/28 bg-amber-400/10' : 'border border-amber-500/25 bg-amber-500/10'
            }`}
          >
            <p className={`text-xs font-semibold uppercase tracking-wider ${isLightMode ? 'text-amber-700' : 'text-amber-300'}`}>
              Distributed
            </p>
            <p className={`mt-1 text-3xl font-bold tabular-nums ${isLightMode ? 'text-amber-700' : 'text-amber-300'}`}>
              {totals.outEth.toLocaleString(undefined, { maximumFractionDigits: 4 })}{' '}
              <span className="text-lg font-semibold">ETH</span>
            </p>
          </div>
        </div>
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[var(--text-muted-1)]">{availablePct.toFixed(1)}% of funds still available</span>
            <span className="font-mono text-[var(--text-high-3)]">{availableEth.toFixed(4)} ETH</span>
          </div>
          <div className="mt-2 h-2.5 rounded-full bg-[var(--bg-depth-1)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-[width] duration-500"
              style={{ width: `${availablePct}%` }}
            />
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard
        className={`mt-6 overflow-hidden rounded-3xl p-0 backdrop-blur-xl ${
          isLightMode
            ? 'border border-[rgba(168,186,209,0.35)] bg-[linear-gradient(180deg,rgba(252,254,255,0.96),rgba(240,246,252,0.9))] shadow-[0_12px_24px_rgba(77,106,141,0.12)]'
            : 'shadow-[0_14px_34px_rgba(1,8,15,0.12)]'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-high-3)]">Activity</h2>
            <p className="mt-0.5 inline-flex items-center gap-2 text-xs text-[var(--text-muted-1)]">
              <span
                className={`inline-block h-2 w-2 rounded-full ${isLightMode ? 'bg-emerald-600' : 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.65)]'}`}
              />
              Live · auto-refresh every {Math.round(POLL_MS / 1000)}s
            </p>
          </div>
          <nav
            className={`flex rounded-full border p-1 text-xs font-medium ${
              isLightMode
                ? 'border-[rgba(167,186,208,0.45)] bg-white/80'
                : 'border-[var(--border-chrome-2)] bg-[var(--surface-panel-overlay)]'
            }`}
          >
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
                  tab === key
                    ? 'text-black shadow-[0_4px_14px_rgba(34,197,94,0.26)]'
                    : 'text-[var(--text-muted-2)] hover:bg-[var(--overlay-surface-soft)] hover:text-[var(--text-high-1)]'
                }`}
                style={tab === key ? { backgroundColor: 'var(--accent-core)', color: '#020617' } : undefined}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
        <div className="border-b border-white/[0.08] px-4 py-3 sm:px-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by donor, recipient, cause, or tx hash"
            className="vtx-input w-full px-4 py-2.5 text-sm"
          />
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
            <div className="px-6 py-16 text-center text-sm text-[var(--text-muted-1)]">
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
                    className={`border-b px-4 py-4 transition-colors sm:px-6 ${
                      isLightMode
                        ? 'border-[rgba(173,191,213,0.28)] hover:bg-[rgba(255,255,255,0.64)]'
                        : 'border-white/[0.06] hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="group flex gap-4">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border text-sm font-bold"
                        style={{
                          borderColor: 'var(--border-accent-soft)',
                          background: 'linear-gradient(145deg, rgba(34,197,94,0.2), rgba(59,130,246,0.12))',
                          color: 'var(--accent-bright-2)',
                        }}
                      >
                        {initials(entry.fromDisplayName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium leading-snug text-[var(--text-high-3)]">{summaryLine(entry)}</p>
                        <p className="mt-1 text-xs font-medium text-[var(--text-muted-1)]">{timeAgo(entry.recordedAt)}</p>
                        <p className="mt-1 font-mono text-xs leading-relaxed text-[var(--text-muted-1)]">
                          <span className="text-[var(--text-muted-2)]">{entry.fromDisplayName}</span>{' '}
                          <span className="text-[var(--text-muted-1)]">
                            ({shortAddress(entry.fromMasked)})
                            <button
                              type="button"
                              onClick={() => void navigator.clipboard.writeText(entry.fromMasked)}
                              className="ml-1 font-semibold text-[var(--text-high-1)] opacity-0 transition-opacity group-hover:opacity-100 hover:underline"
                            >
                              Copy
                            </button>
                          </span>
                          {' · '}
                          <span className="text-[var(--text-muted-2)]">{entry.toDisplayName}</span>{' '}
                          <span className="text-[var(--text-muted-1)]">
                            ({shortAddress(entry.toMasked)})
                            <button
                              type="button"
                              onClick={() => void navigator.clipboard.writeText(entry.toMasked)}
                              className="ml-1 font-semibold text-[var(--text-high-1)] opacity-0 transition-opacity group-hover:opacity-100 hover:underline"
                            >
                              Copy
                            </button>
                          </span>
                        </p>
                        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-[var(--text-muted-1)]">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-semibold ${
                              isLightMode
                                ? 'border-emerald-600/25 bg-emerald-600/12 text-emerald-700'
                                : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                            }`}
                          >
                            <span aria-hidden="true">⛓</span> On-chain
                          </span>
                          <span className="text-[var(--text-muted-1)]">Tx</span>{' '}
                          <button
                            type="button"
                            title="Copy hash"
                            onClick={() => void navigator.clipboard.writeText(entry.txHash)}
                            className={`${isLightMode ? 'text-sky-700 hover:text-sky-800' : 'text-cyan-300 hover:text-cyan-200'} font-semibold hover:underline`}
                          >
                            {shortHash(entry.txHash)}
                          </button>
                          <span className="hidden sm:inline text-[var(--text-muted-1)]">·</span>
                          <span className="text-[var(--text-muted-1)]">Cause: {entry.causeName || '—'}</span>
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className={`text-lg font-semibold tabular-nums ${
                            incoming
                              ? isLightMode
                                ? 'text-emerald-700 text-2xl'
                                : 'text-emerald-300 text-2xl'
                              : isLightMode
                                ? 'text-amber-700 text-2xl'
                                : 'text-amber-300 text-2xl'
                          }`}
                        >
                          {incoming ? '+' : '−'}
                          {entry.amountEth}
                          <span className="ml-0.5 text-sm font-medium text-[var(--text-muted-1)]">ETH</span>
                        </p>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted-1)]">
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
      </SurfaceCard>
    </div>
  );
}
