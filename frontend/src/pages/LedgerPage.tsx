import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { loadLedgerV2, loadLedgerV2Detail, loadLedgerV2Tags, type LedgerV2Entry, type LedgerV2Kind } from '../lib/ledgerV2';
import { EyebrowLabel, SectionHeader, SurfaceCard } from '../components/ui';
import { TransactionModal } from '../components/TransactionModal';
import { LedgerAccountabilityGrid } from '../components/LedgerAccountabilityGrid';
import { LedgerTransactionsGrid } from '../components/LedgerTransactionsGrid';

const POLL_MS = 4000;

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

export function LedgerPage() {
  const [entries, setEntries] = useState<LedgerV2Entry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gridTab, setGridTab] = useState<'all' | LedgerV2Kind>('all');
  const [gridSearch, setGridSearch] = useState('');
  const [tag] = useState('');
  const [isLightMode, setIsLightMode] = useState(
    () => typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light',
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [modalDetail, setModalDetail] = useState<Awaited<ReturnType<typeof loadLedgerV2Detail>> | null>(null);
  const [liveNotice, setLiveNotice] = useState<string | null>(null);
  const liveNoticeTimerRef = useRef<number | null>(null);

  const refresh = useCallback(() => {
    setIsLoading(true);
    loadLedgerV2({ limit: 500, q: gridSearch.trim() || undefined, tag: tag.trim() || undefined })
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
  }, [gridSearch, tag]);

  useEffect(() => {
    queueMicrotask(() => refresh());
    const t = setInterval(() => queueMicrotask(() => refresh()), POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    loadLedgerV2Tags().catch(() => undefined);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => setIsLightMode(root.getAttribute('data-theme') === 'light');
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

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
    // WebSocket realtime: refetch on domain events; polling remains the fallback.
    try {
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const ws = new WebSocket(`${proto}://${window.location.host}/api/ws`);
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as {
            type?: string;
            envelope?: { type?: string };
          };
          if (msg.type === 'event' && msg.envelope?.type) {
            setLiveNotice('New ledger activity');
            if (liveNoticeTimerRef.current != null) {
              window.clearTimeout(liveNoticeTimerRef.current);
            }
            liveNoticeTimerRef.current = window.setTimeout(() => {
              setLiveNotice(null);
              liveNoticeTimerRef.current = null;
            }, 4000);
          }
        } catch {
          /* ignore malformed frames */
        }
        refresh();
      };
      return () => {
        if (liveNoticeTimerRef.current != null) {
          window.clearTimeout(liveNoticeTimerRef.current);
        }
        ws.close();
      };
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
        body="Transparency grid per cause (inflow vs outflow), plus a searchable transaction grid with PDF export."
      />

      {liveNotice ? (
        <div
          className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-200"
          role="status"
        >
          {liveNotice} — list refreshed
        </div>
      ) : null}

      <LedgerAccountabilityGrid
        entries={entries}
        isLoading={isLoading}
        loadError={loadError}
        isLightMode={isLightMode}
        onOpenDetail={openDetail}
      />

      <LedgerTransactionsGrid
        entries={entries}
        isLoading={isLoading}
        loadError={loadError}
        tab={gridTab}
        onTabChange={setGridTab}
        search={gridSearch}
        onSearchChange={setGridSearch}
        isLightMode={isLightMode}
        onRowClick={openDetail}
      />

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

      <p className="mt-4 text-center text-xs text-[var(--text-muted-2)]">
        Live · auto-refresh every {Math.round(POLL_MS / 1000)}s
      </p>
    </div>
  );
}
