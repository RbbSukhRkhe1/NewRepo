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

  const donationEntries = useMemo(() => entries.filter((e) => e.kind === 'donation_in'), [entries]);
  const disbursementEntries = useMemo(() => entries.filter((e) => e.kind === 'disbursement_out'), [entries]);
  const activeDonorCount = useMemo(() => new Set(donationEntries.map((e) => e.fromMasked)).size, [donationEntries]);
  const proofCoveragePct = useMemo(() => {
    if (entries.length === 0) return 0;
    const withTx = entries.filter((e) => e.txHash && e.txHash.length > 0).length;
    return (withTx / entries.length) * 100;
  }, [entries]);
  const causeAllocations = useMemo(() => {
    const map = new Map<string, { donated: number; disbursed: number; events: number }>();
    for (const e of entries) {
      const key = e.causeName || 'Unassigned';
      const current = map.get(key) ?? { donated: 0, disbursed: 0, events: 0 };
      const amt = parseFloat(e.amountEth);
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

  return (
    <div className="vtx-page max-w-6xl text-left">
      <EyebrowLabel>Donor transparency</EyebrowLabel>
      <SectionHeader title="Your Ledger" body="Track every donation, disbursement, and proof event in one place." />

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
                <li key={`impact-${e.id}-${e.txHash}`} className="rounded-lg border border-[var(--border-chrome-2)] px-3 py-2 text-sm">
                  <p className="truncate font-medium text-[var(--text-high-3)]">{e.causeName || 'Unassigned cause'}</p>
                  <p className="mt-0.5 text-xs text-[var(--text-muted-1)]">
                    {e.amountEth} ETH · {timeAgo(e.recordedAt)}
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
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by donor, recipient, cause, or tx hash"
            className="vtx-input w-full px-4 py-2.5 text-sm"
          />
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
                    key={entry.id + entry.txHash}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: vi.size, transform: `translateY(${vi.start}px)` }}
                    className={`border-b px-4 py-4 transition-colors sm:px-6 ${
                      isLightMode ? 'border-[rgba(173,191,213,0.28)] hover:bg-[rgba(255,255,255,0.64)]' : 'border-white/[0.06] hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="group flex gap-4">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--border-accent-soft)] bg-[var(--overlay-surface-soft)] text-sm font-bold text-[var(--accent-bright-2)]"
                      >
                        {initials(entry.fromDisplayName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium leading-snug text-[var(--text-high-3)]">{summaryLine(entry)}</p>
                        <p className="mt-1 text-xs font-medium text-[var(--text-muted-1)]">{timeAgo(entry.recordedAt)}</p>
                        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-[var(--text-muted-1)]">
                          <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-semibold ${isLightMode ? 'border-emerald-600/25 bg-emerald-600/12 text-emerald-700' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'}`}>
                            <span aria-hidden="true">⛓</span> On-chain
                          </span>
                          <span>Tx</span>
                          <button type="button" title="Copy hash" onClick={() => void navigator.clipboard.writeText(entry.txHash)} className={`${isLightMode ? 'text-sky-700 hover:text-sky-800' : 'text-cyan-300 hover:text-cyan-200'} font-semibold hover:underline`}>
                            {shortHash(entry.txHash)}
                          </button>
                          <span className="hidden sm:inline">·</span>
                          <span>Cause: {entry.causeName || '—'}</span>
                          <span className="hidden sm:inline">·</span>
                          <span>{shortAddress(entry.fromMasked)} → {shortAddress(entry.toMasked)}</span>
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-xl font-semibold tabular-nums ${incoming ? (isLightMode ? 'text-emerald-700' : 'text-emerald-300') : isLightMode ? 'text-amber-700' : 'text-amber-300'}`}>
                          {incoming ? '+' : '−'}
                          {entry.amountEth}
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
