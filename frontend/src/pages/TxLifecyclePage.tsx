import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useVaultexEvents, isLedgerEvent } from '../lib/useVaultexEvents';
import { apiJson } from '../lib/api';
import { useIsLightMode } from '../lib/useIsLightMode';
import { SectionHeader, SurfaceCard } from '../components/ui';

type LedgerRow = {
  id: number;
  tx_hash: string;
  block_number: number | null;
  from_addr: string;
  to_addr: string;
  value_eth: string;
  kind: string;
  cause_id: number | null;
  cause_name: string | null;
  reference: string | null;
  narrative: string | null;
  recorded_at: string;
};

type Util = {
  causeId: number;
  donatedEth: number;
  disbursedEth: number;
  remainingEth: number;
  utilizationPct: number;
};

type LifecycleResponse = {
  donation: LedgerRow;
  linkedDisbursements: LedgerRow[];
  utilization: Util | null;
};

const AUTO_SCROLL_MS = 5200;

function fmtTs(sqlite: string) {
  return new Date(sqlite + 'Z').toLocaleString();
}

function TypewriterHeading({
  text,
  active,
  className,
}: {
  text: string;
  active: boolean;
  className?: string;
}) {
  const [shown, setShown] = useState('');
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const startId = window.setTimeout(() => {
      setShown('');
      let i = 0;
      intervalRef.current = window.setInterval(() => {
        i += 1;
        setShown(text.slice(0, i));
        if (i >= text.length && intervalRef.current != null) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }, 16);
    }, 0);
    return () => {
      window.clearTimeout(startId);
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [text, active]);

  const display = active ? shown : text;

  return (
    <h2 className={className}>
      {display}
      {active && shown.length < text.length ? (
        <span className="ml-0.5 inline-block h-[1em] w-0.5 animate-pulse bg-[var(--text-high-3)] align-bottom" />
      ) : null}
    </h2>
  );
}

export function TxLifecyclePage() {
  const { txHash = '' } = useParams();
  const isLightMode = useIsLightMode();
  const [data, setData] = useState<LifecycleResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [autoOn, setAutoOn] = useState(true);

  const load = useCallback(() => {
    if (!txHash) return Promise.resolve();
    return apiJson<LifecycleResponse>(`/ledger/v2/lifecycle/${txHash}`)
      .then((res) => {
        setErr(null);
        setData(res);
      })
      .catch((e: unknown) =>
        setErr(e instanceof Error ? e.message : 'Failed to load lifecycle')
      );
  }, [txHash]);

  useEffect(() => {
    void load();
  }, [load]);

  useVaultexEvents(() => {
    void load();
  }, { enabled: Boolean(txHash), filter: isLedgerEvent });

  const steps = useMemo(() => {
    if (!data) return [];
    const disb = data.linkedDisbursements ?? [];
    return [
      {
        key: 'donation',
        title: '1) Donation created',
        body: data.donation.narrative ?? `Donation ${data.donation.tx_hash}`,
        meta: `${data.donation.value_eth} ETH · ${fmtTs(data.donation.recorded_at)}`,
      },
      {
        key: 'vault',
        title: '2) Held in VAULTEX vault',
        body: 'Funds are received into the vault wallet for the selected cause, pending verified disbursement.',
        meta: data.utilization
          ? `Remaining for cause: ${data.utilization.remainingEth.toFixed(4)} ETH`
          : 'Cause totals unavailable',
      },
      ...disb.map((d, i) => ({
        key: `disb-${d.id}`,
        title: `3.${i + 1}) Disbursed`,
        body: d.narrative ?? `Disbursement ${d.tx_hash}`,
        meta: `${d.value_eth} ETH · ${fmtTs(d.recorded_at)}`,
      })),
      {
        key: 'audit',
        title: '4) Audit trail',
        body: 'This lifecycle is backed by on-chain transaction hashes and internally linked ledger references.',
        meta: 'Scroll or wait. The story loops automatically, and new disbursements appear when the ledger updates.',
      },
    ];
  }, [data]);

  const lifecycleResetKey = data
    ? `${data.donation.id}:${data.linkedDisbursements.length}`
    : '';

  useEffect(() => {
    if (!lifecycleResetKey) return;
    const t = window.setTimeout(() => setStepIdx(0), 0);
    return () => window.clearTimeout(t);
  }, [lifecycleResetKey]);

  useEffect(() => {
    if (!autoOn || !data || steps.length === 0) return;
    const t = window.setInterval(() => {
      setStepIdx((i) => (i + 1) % steps.length);
    }, AUTO_SCROLL_MS);
    return () => window.clearInterval(t);
  }, [autoOn, data, steps.length]);

  useEffect(() => {
    if (!scrollRef.current || steps.length === 0) return;
    const sections = scrollRef.current.querySelectorAll<HTMLElement>('[data-lifecycle-step]');
    const el = sections[stepIdx];
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [stepIdx, steps.length]);

  return (
    <div className="vtx-page max-w-5xl">
      <SectionHeader
        title="Donation lifecycle"
        body="Animated story: from donation → vault → disbursement(s), with live ledger refresh."
      />

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <Link
          to="/account"
          className={`rounded-full px-3 py-1.5 font-semibold ${
            isLightMode
              ? 'border border-slate-300 bg-white/80 text-slate-700 hover:bg-white'
              : 'border border-white/15 bg-white/[0.03] text-white/80 hover:bg-white/[0.08]'
          }`}
        >
          Back to profile
        </Link>
        <button
          type="button"
          onClick={() => setAutoOn((v) => !v)}
          className={`rounded-full px-3 py-1.5 font-semibold ${
            isLightMode
              ? 'border border-slate-300 bg-white/80 text-slate-700 hover:bg-white'
              : 'border border-white/15 bg-white/[0.03] text-white/80 hover:bg-white/[0.08]'
          }`}
        >
          {autoOn ? 'Pause auto-scroll' : 'Resume auto-scroll'}
        </button>
        <span className="font-mono text-[var(--text-muted-1)]">{txHash}</span>
      </div>

      {err ? (
        <SurfaceCard className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-200">
          {err}
        </SurfaceCard>
      ) : null}

      {!data && !err ? (
        <SurfaceCard className="mt-6 rounded-2xl p-6 text-[var(--text-muted-1)]">Loading…</SurfaceCard>
      ) : null}

      {data ? (
        <div
          ref={scrollRef}
          className="mt-6 h-[min(72vh,720px)] overflow-y-auto scroll-smooth rounded-3xl border border-[var(--glass-border)] bg-[var(--overlay-surface)]"
          style={{ scrollSnapType: 'y mandatory' }}
        >
          {steps.map((s, i) => (
            <section
              key={s.key}
              data-lifecycle-step
              className="grid min-h-[min(72vh,720px)] place-items-center px-6 py-10"
              style={{ scrollSnapAlign: 'start' }}
            >
              <div className="w-full max-w-2xl">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted-2)]">
                  {s.title}
                </p>
                <TypewriterHeading
                  text={s.body}
                  active={i === stepIdx}
                  className="mt-2 min-h-[3.5rem] text-2xl font-semibold leading-snug text-[var(--text-high-3)] sm:min-h-[2.75rem]"
                />
                <p className="mt-3 text-sm text-[var(--text-muted-1)]">{s.meta}</p>

                {s.key === 'vault' && data.utilization ? (
                  <div className="mt-5 rounded-2xl border border-[var(--glass-border)] bg-[var(--overlay-surface-soft)] p-4">
                    <p className="text-xs font-semibold text-[var(--text-high-2)]">Cause utilization</p>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <div className="vtx-glass-inset px-3 py-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted-2)]">
                          Donated
                        </p>
                        <p className="mt-1 font-mono text-[var(--text-high-3)]">
                          {data.utilization.donatedEth.toFixed(4)} ETH
                        </p>
                      </div>
                      <div className="vtx-glass-inset px-3 py-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted-2)]">
                          Disbursed
                        </p>
                        <p className="mt-1 font-mono text-[var(--text-high-3)]">
                          {data.utilization.disbursedEth.toFixed(4)} ETH
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full border border-[var(--glass-border)] bg-[var(--overlay-surface-soft)]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-[width] duration-700 ease-out"
                        style={{
                          width: `${Math.min(100, Math.max(0, data.utilization.utilizationPct))}%`,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-[var(--text-muted-1)]">
                      {data.utilization.utilizationPct.toFixed(0)}% utilized ·{' '}
                      {data.utilization.remainingEth.toFixed(4)} ETH remaining
                    </p>
                  </div>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
