import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useVaultexEvents, isLedgerEvent } from '../lib/useVaultexEvents';
import { apiJson } from '../lib/api';
import { useIsLightMode } from '../lib/useIsLightMode';

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
  from_display_name: string | null;
  to_display_name: string | null;
  reference: string | null;
  narrative: string | null;
  recorded_at: string;
  memo: string | null;
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

function fmtTs(sqlite: string) {
  return new Date(sqlite + 'Z').toLocaleString();
}

function shortHash(h: string) {
  return h.length > 14 ? `${h.slice(0, 10)}…${h.slice(-4)}` : h;
}

function StatusBadge({ disbursed }: { disbursed: boolean }) {
  return disbursed ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      Disbursed
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-400">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      In vault
    </span>
  );
}

export function TxLifecyclePage() {
  const { txHash = '' } = useParams();
  const light = useIsLightMode();
  const [data, setData] = useState<LifecycleResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!txHash) return Promise.resolve();
    return apiJson<LifecycleResponse>(`/ledger/v2/lifecycle/${txHash}`)
      .then((res) => { setErr(null); setData(res); })
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : 'Failed to load'));
  }, [txHash]);

  useEffect(() => { void load(); }, [load]);
  useVaultexEvents(() => { void load(); }, { enabled: Boolean(txHash), filter: isLedgerEvent });

  const d = data?.donation;
  const disb = data?.linkedDisbursements ?? [];
  const util = data?.utilization;
  const hasDisbursements = disb.length > 0;

  const card = light
    ? 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
    : 'rounded-2xl border border-white/10 bg-white/[0.03] p-5';
  const label = 'text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted-2)]';
  const val = 'mt-0.5 font-mono text-sm text-[var(--text-high-3)]';

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={label}>Donation lifecycle</p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--text-high-3)]">
            Where your funds went
          </h1>
        </div>
        <Link
          to="/account"
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            light
              ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              : 'border border-white/15 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]'
          }`}
        >
          ← Back to account
        </Link>
      </div>

      <p className="mt-1 font-mono text-xs text-[var(--text-muted-1)]">{txHash}</p>

      {/* Error */}
      {err ? (
        <div className="mt-6 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
          {err}
        </div>
      ) : null}

      {/* Loading */}
      {!data && !err ? (
        <div className="mt-10 text-center text-[var(--text-muted-1)]">Loading…</div>
      ) : null}

      {d ? (
        <div className="mt-8 space-y-6">
          {/* ── Flow diagram ─────────────────────────────────────── */}
          <div className={card}>
            <p className={label}>Fund flow</p>
            <div className="mt-4 flex items-center gap-3 overflow-x-auto">
              {/* FROM */}
              <div className="flex min-w-0 shrink-0 flex-col items-center gap-1">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full text-lg ${
                  light ? 'bg-blue-100 text-blue-600' : 'bg-blue-500/15 text-blue-400'
                }`}>
                  ↑
                </div>
                <p className="max-w-[100px] truncate text-center text-xs font-semibold text-[var(--text-high-3)]">
                  {d.from_display_name ?? 'Donor'}
                </p>
                <p className="text-[10px] text-[var(--text-muted-2)]">Donor</p>
              </div>

              {/* Arrow */}
              <div className="flex flex-1 items-center">
                <div className={`h-px flex-1 ${light ? 'bg-slate-300' : 'bg-white/15'}`} />
                <p className="mx-2 whitespace-nowrap text-xs font-bold text-emerald-400">
                  {d.value_eth} ETH
                </p>
                <div className={`h-px flex-1 ${light ? 'bg-slate-300' : 'bg-white/15'}`} />
              </div>

              {/* VAULT */}
              <div className="flex min-w-0 shrink-0 flex-col items-center gap-1">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold ${
                  light ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-500/15 text-emerald-400'
                }`}>
                  V
                </div>
                <p className="text-xs font-semibold text-[var(--text-high-3)]">Vaultex</p>
                <p className="text-[10px] text-[var(--text-muted-2)]">Vault</p>
              </div>

              {/* Arrow to beneficiary (if disbursed) */}
              {hasDisbursements ? (
                <>
                  <div className="flex flex-1 items-center">
                    <div className={`h-px flex-1 ${light ? 'bg-slate-300' : 'bg-white/15'}`} />
                    <p className="mx-2 whitespace-nowrap text-xs font-bold text-cyan-400">
                      {disb.reduce((s, x) => s + parseFloat(x.value_eth), 0).toFixed(4)} ETH
                    </p>
                    <div className={`h-px flex-1 ${light ? 'bg-slate-300' : 'bg-white/15'}`} />
                  </div>

                  <div className="flex min-w-0 shrink-0 flex-col items-center gap-1">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full text-lg ${
                      light ? 'bg-cyan-100 text-cyan-600' : 'bg-cyan-500/15 text-cyan-400'
                    }`}>
                      ↓
                    </div>
                    <p className="max-w-[100px] truncate text-center text-xs font-semibold text-[var(--text-high-3)]">
                      {disb[0]?.to_display_name ?? 'Beneficiary'}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted-2)]">Recipient</p>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {/* ── Status + cause utilization ────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className={card}>
              <p className={label}>Status</p>
              <div className="mt-3">
                <StatusBadge disbursed={hasDisbursements} />
              </div>
              <p className="mt-3 text-sm text-[var(--text-muted-1)]">
                {hasDisbursements
                  ? `Funds have been disbursed to ${disb[0]?.to_display_name ?? 'the beneficiary'}.`
                  : 'Funds are held in the Vaultex vault, pending disbursement to the cause beneficiary.'}
              </p>
            </div>

            {util ? (
              <div className={card}>
                <p className={label}>Cause utilization</p>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted-1)]">Donated</span>
                    <span className="font-mono text-[var(--text-high-3)]">{util.donatedEth.toFixed(4)} ETH</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted-1)]">Disbursed</span>
                    <span className="font-mono text-[var(--text-high-3)]">{util.disbursedEth.toFixed(4)} ETH</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-muted-1)]">Remaining</span>
                    <span className="font-mono text-[var(--text-high-3)]">{util.remainingEth.toFixed(4)} ETH</span>
                  </div>
                  <div className={`mt-2 h-2 overflow-hidden rounded-full ${light ? 'bg-slate-200' : 'bg-white/10'}`}>
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-[width] duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, util.utilizationPct))}%` }}
                    />
                  </div>
                  <p className="text-xs text-[var(--text-muted-1)]">
                    {util.utilizationPct.toFixed(0)}% of cause funds utilized
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {/* ── Donation detail ───────────────────────────────────── */}
          <div className={card}>
            <p className={label}>Donation</p>
            <div className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              <div>
                <p className={label}>From</p>
                <p className={val}>{d.from_display_name ?? shortHash(d.from_addr)}</p>
              </div>
              <div>
                <p className={label}>To</p>
                <p className={val}>{d.to_display_name ?? shortHash(d.to_addr)}</p>
              </div>
              <div>
                <p className={label}>Amount</p>
                <p className={val}>{d.value_eth} ETH</p>
              </div>
              <div>
                <p className={label}>Cause</p>
                <p className={val}>{d.cause_name ?? '—'}</p>
              </div>
              <div>
                <p className={label}>Time</p>
                <p className={val}>{fmtTs(d.recorded_at)}</p>
              </div>
              <div>
                <p className={label}>Block</p>
                <p className={val}>{d.block_number ?? '—'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className={label}>Tx hash</p>
                <p className="mt-0.5 break-all font-mono text-xs text-[var(--text-muted-1)]">{d.tx_hash}</p>
              </div>
            </div>
          </div>

          {/* ── Disbursements ─────────────────────────────────────── */}
          {disb.length > 0 ? (
            <div className={card}>
              <p className={label}>Disbursement{disb.length > 1 ? 's' : ''}</p>
              <div className="mt-3 space-y-4">
                {disb.map((row) => (
                  <div key={row.id} className={`rounded-xl p-4 ${light ? 'bg-slate-50' : 'bg-white/[0.02]'}`}>
                    <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                      <div>
                        <p className={label}>To</p>
                        <p className={val}>{row.to_display_name ?? shortHash(row.to_addr)}</p>
                      </div>
                      <div>
                        <p className={label}>Amount</p>
                        <p className={val}>{row.value_eth} ETH</p>
                      </div>
                      <div>
                        <p className={label}>Time</p>
                        <p className={val}>{fmtTs(row.recorded_at)}</p>
                      </div>
                      <div>
                        <p className={label}>Memo</p>
                        <p className={val}>{row.memo ?? '—'}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className={label}>Tx hash</p>
                        <p className="mt-0.5 break-all font-mono text-xs text-[var(--text-muted-1)]">{row.tx_hash}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
