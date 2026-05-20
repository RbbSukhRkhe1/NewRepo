import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiJson } from '../lib/api';
import { loadMeHistory, type MeHistoryResponse, type UserHistoryEntry } from '../lib/userHistory';
import { formatLedgerSummary } from '../lib/ledgerCopy';
import { PrimaryButton, PrimaryLinkButton, SectionHeader, SurfaceCard } from '../components/ui';

type UserRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  anvilIndex: number | null;
};

type CauseOption = {
  id: number;
  title: string;
};

const POLL_MS = 6000;

function shortHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

function TierBadgeMedal({ tier }: { tier: string }) {
  const gradId = `gold-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const t = tier.toLowerCase();
  const d = 'M12 3.5l1.9 5.8h6.1l-4.9 3.6 1.9 5.8-4.9-3.6-4.9 3.6 1.9-5.8-4.9-3.6h6.1z';
  if (t === 'gold') {
    return (
      <svg className="h-9 w-9 shrink-0 drop-shadow-[0_0_10px_rgba(251,191,36,0.45)]" viewBox="0 0 24 24" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="45%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>
        <path fill={`url(#${gradId})`} d={d} />
      </svg>
    );
  }
  if (t === 'silver') {
    return (
      <svg className="h-9 w-9 shrink-0 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" aria-hidden>
        <path d={d} />
      </svg>
    );
  }
  return (
    <svg className="h-9 w-9 shrink-0 text-amber-700" viewBox="0 0 24 24" aria-hidden>
      <path fill="#92400e" d={d} />
    </svg>
  );
}

function WalletMeter({
  summary,
  role,
}: {
  summary: NonNullable<MeHistoryResponse['summary']>;
  role: string;
}) {
  const pct = Math.round(summary.fillRatio * 1000) / 10;
  const cur = parseFloat(summary.currentEth);
  const ref = parseFloat(summary.referenceMaxEth);
  const isVault = summary.isVaultWallet === true;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/35 bg-gradient-to-b from-amber-950/40 via-[#0c0a06] to-black p-5 shadow-[inset_0_1px_0_rgba(251,191,36,0.12)]">
      <div
        className="pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full bg-amber-400/10 blur-2xl"
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/80">
            {isVault ? 'Vault wallet' : 'Wallet'}
          </p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-amber-50 sm:text-3xl">
            {cur.toFixed(4)} <span className="text-base font-semibold text-amber-400/90">ETH</span>
          </p>
        </div>
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
          Live
        </div>
      </div>

      <div className="relative mt-5">
        <div className="flex justify-between text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted-1)]">
          <span>{isVault ? 'Remaining' : 'Remaining'}</span>
          <span>
            {isVault ? `Received ~${ref.toFixed(2)} ETH` : `Pool ~${ref.toFixed(2)} ETH`}
          </span>
        </div>
        <div className="mt-2 h-4 w-full overflow-hidden rounded-full border border-black/60 bg-zinc-950 shadow-inner ring-1 ring-amber-900/40">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-lime-400 to-cyan-400 shadow-[0_0_14px_rgba(251,191,36,0.45)] transition-[width] duration-700 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Wallet balance level"
          />
        </div>
        <p className="mt-2 text-center text-[11px] tabular-nums text-[var(--text-muted-1)]">
          {isVault ? (
            <>
              Received (donations):{' '}
              <span className="text-[var(--text-muted-2)]">{parseFloat(summary.totalReceivedEth).toFixed(4)}</span> ETH
              {' · '}
              Disbursed:{' '}
              <span className="text-[var(--text-muted-2)]">
                {parseFloat(summary.totalDisbursedEth ?? '0').toFixed(4)}
              </span>{' '}
              ETH
            </>
          ) : role === 'beneficiary' ? (
            <>
              Received (ledger):{' '}
              <span className="text-[var(--text-muted-2)]">{parseFloat(summary.totalReceivedEth).toFixed(4)}</span> ETH
            </>
          ) : (
            <>
              Sent to vault (ledger):{' '}
              <span className="text-[var(--text-muted-2)]">{parseFloat(summary.totalSentEth).toFixed(4)}</span> ETH
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function HistoryRow({ e }: { e: UserHistoryEntry }) {
  const incoming = e.flow === 'received';
  return (
    <li className="grid gap-1 border-b border-white/[0.06] py-3 text-sm last:border-0 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-4">
      <div
        className={`w-fit rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
          incoming            ? 'bg-emerald-500/15 text-emerald-300'
            : 'bg-rose-500/12 text-rose-200/90'
        }`}
      >
        {incoming ? 'Received' : 'Sent'}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[var(--text-high-1)]">
          {e.kind === 'disbursement_out'
            ? formatLedgerSummary(e)
            : e.kind === 'donation_in'
              ? incoming
                ? `${e.fromDisplayName} → you`
                : `You → ${e.toDisplayName}`
              : incoming
                ? `${e.fromDisplayName} → you`
                : `You → ${e.toDisplayName}`}
        </p>
        {e.kind === 'disbursement_out' && e.toDisplayName ? (
          <p className="truncate text-xs text-[var(--text-muted-1)]">
            Recipient: {e.toDisplayName}
            {e.memo?.trim() ? ` · Cause: ${e.memo.trim()}` : ''}
          </p>
        ) : e.causeName && e.kind === 'donation_in' ? (
          <p className="truncate text-xs text-[var(--text-muted-1)]">{e.causeName}</p>
        ) : null}
        {e.kind === 'donation_in' ? (
          <Link
            to={`/lifecycle/${e.txHash}`}
            className="mt-0.5 inline-flex w-fit font-mono text-[10px] text-[var(--text-muted-3)] hover:text-[var(--text-high-2)] hover:underline"
            title="View donation lifecycle"
          >
            {shortHash(e.txHash)}
          </Link>
        ) : (
          <span className="mt-0.5 inline-flex w-fit font-mono text-[10px] text-[var(--text-muted-3)]" title="Transaction hash">
            {shortHash(e.txHash)}
          </span>
        )}
      </div>
      <div className="font-mono text-right text-base font-semibold tabular-nums text-amber-100 sm:text-lg">
        {incoming ? '+' : '−'}
        {parseFloat(e.amountEth).toFixed(4)} ETH
      </div>
    </li>
  );
}

export function AccountPage() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const disburseCauseParam = searchParams.get('disburseCause');
  const scrolledToDisburseRef = useRef(false);
  const [eth, setEth] = useState<string | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<UserRow[]>([]);
  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [causeDisburseAmount, setCauseDisburseAmount] = useState('1');
  const [beneficiaryDisburseAmount, setBeneficiaryDisburseAmount] = useState('1');
  const [causeDisburseMessage, setCauseDisburseMessage] = useState('');
  const [beneficiaryDisburseMessage, setBeneficiaryDisburseMessage] = useState('');
  const [causeId, setCauseId] = useState('');
  const [causes, setCauses] = useState<CauseOption[]>([]);
  const [causeDisburseMsg, setCauseDisburseMsg] = useState<string | null>(null);
  const [beneficiaryDisburseMsg, setBeneficiaryDisburseMsg] = useState<string | null>(null);
  const [busyCause, setBusyCause] = useState(false);
  const [busyBeneficiary, setBusyBeneficiary] = useState(false);
  const [history, setHistory] = useState<MeHistoryResponse | null>(null);
  const [historyErr, setHistoryErr] = useState<string | null>(null);
  const [badges, setBadges] = useState<
    { causeId: number | null; causeName: string; donations: number; totalEth: number; tier: string }[]
  >([]);

  const refreshHistory = useCallback(() => {
    if (!user) {
      setHistory(null);
      return;
    }
    if (user.role !== 'admin' && user.anvilIndex == null) {
      setHistory(null);
      return;
    }
    loadMeHistory()
      .then((h) => {
        setHistory(h);
        setHistoryErr(null);
        if (h.summary?.currentEth != null) setEth(h.summary.currentEth);
      })
      .catch((e: unknown) => {
        setHistoryErr(e instanceof Error ? e.message : 'Failed to load history');
      });
  }, [user]);

  useEffect(() => {
    if (!user || user.anvilIndex == null) {
      queueMicrotask(() => setEth(null));
      return;
    }
    apiJson<{ eth: string }>(`/balance/${user.anvilIndex}`)
      .then((b) => setEth(b.eth))
      .catch(() => setEth(null));
  }, [user]);

  useEffect(() => {
    queueMicrotask(() => refreshHistory());
    if (!user) return;
    if (user.role !== 'admin' && !user.anvilIndex) return;
    const t = setInterval(refreshHistory, POLL_MS);
    return () => clearInterval(t);
  }, [refreshHistory, user]);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      const t = window.setTimeout(() => {
        if (!cancelled) setBadges([]);
      }, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(t);
      };
    }
    apiJson<{ badges: { causeId: number | null; causeName: string; donations: number; totalEth: number; tier: string }[] }>(
      '/me/badges'
    )
      .then((r) => {
        if (!cancelled) setBadges(r.badges ?? []);
      })
      .catch(() => {
        if (!cancelled) setBadges([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    apiJson<UserRow[]>('/users')
      .then((rows) => setBeneficiaries(rows.filter((r) => r.role === 'beneficiary')))
      .catch(() => setBeneficiaries([]));
    apiJson<CauseOption[]>('/causes')
      .then((rows) => {
        setCauses(rows);
        const preselect = disburseCauseParam ?? (rows.length > 0 ? String(rows[0].id) : '');
        if (preselect && rows.some((c) => String(c.id) === preselect)) {
          setCauseId(preselect);
        } else if (rows.length > 0) {
          setCauseId(String(rows[0].id));
        }
      })
      .catch(() => setCauses([]));
  }, [user?.role, disburseCauseParam]);

  useEffect(() => {
    scrolledToDisburseRef.current = false;
  }, [disburseCauseParam]);

  useEffect(() => {
    if (user?.role !== 'admin' || !disburseCauseParam || scrolledToDisburseRef.current) return;
    if (causeId !== disburseCauseParam) return;
    const el = document.getElementById('disburse-cause');
    if (!el) return;
    scrolledToDisburseRef.current = true;
    window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [user?.role, disburseCauseParam, causeId]);

  async function disburseForCause(e: React.FormEvent) {
    e.preventDefault();
    if (!causeId) return;
    setCauseDisburseMsg(null);
    setBusyCause(true);
    try {
      const r = await apiJson<{ txHash: string }>(`/causes/${causeId}/disburse`, {
        method: 'POST',
        body: JSON.stringify({ amountEth: causeDisburseAmount, message: causeDisburseMessage }),
      });
      setCauseDisburseMsg(`Disbursed to cause · ${r.txHash.slice(0, 16)}…`);
      refreshHistory();
    } catch (err: unknown) {
      setCauseDisburseMsg(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusyCause(false);
    }
  }

  async function disburseToBeneficiary(e: React.FormEvent) {
    e.preventDefault();
    setBeneficiaryDisburseMsg(null);
    setBusyBeneficiary(true);
    try {
      const r = await apiJson<{ txHash: string }>('/disburse', {
        method: 'POST',
        body: JSON.stringify({
          beneficiaryUserId: parseInt(beneficiaryId, 10),
          amountEth: beneficiaryDisburseAmount,
          message: beneficiaryDisburseMessage,
        }),
      });
      setBeneficiaryDisburseMsg(`Disbursed to beneficiary · ${r.txHash.slice(0, 16)}…`);
      refreshHistory();
    } catch (err: unknown) {
      setBeneficiaryDisburseMsg(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusyBeneficiary(false);
    }
  }

  if (loading) {
    return <div className="p-12 text-center text-[var(--text-muted-1)]">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-[var(--text-muted-2)]">Sign in to see your wallet and role.</p>
        <Link to="/login" className="mt-4 inline-block text-cyan-400 hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="vtx-page max-w-2xl">
      <SectionHeader title="Account" />
      <SurfaceCard className="mt-8">
        <p className="text-sm text-[var(--text-muted-1)]">Signed in as</p>
        <p className="text-xl font-semibold text-[var(--text-high-3)]">{user.name}</p>
        <p className="mt-1 text-sm text-[var(--text-muted-2)]">{user.email}</p>
        <p className="mt-4 text-xs uppercase tracking-wider text-[var(--text-muted-1)]">Role</p>
        <p className="text-cyan-400">{user.role}</p>
        {user.anvilIndex != null && (
          <>
            <p className="mt-4 text-xs uppercase tracking-wider text-[var(--text-muted-1)]">Anvil account index</p>
            <p className="font-mono text-[var(--text-high-3)]">{user.anvilIndex}</p>
            <p className="mt-2 text-xs uppercase tracking-wider text-[var(--text-muted-1)]">Address (masked)</p>
            <p className="font-mono text-sm text-[var(--text-muted-2)]">{user.addressMasked}</p>
            {eth != null && history?.summary == null && (
              <>
                <p className="mt-4 text-xs uppercase tracking-wider text-[var(--text-muted-1)]">Balance (Anvil)</p>
                <p className="font-mono text-lg text-emerald-400">{parseFloat(eth).toFixed(4)} ETH</p>
              </>
            )}
          </>
        )}
        {user.role === 'donor' && (
          <PrimaryLinkButton to="/causes" className="mt-6 px-4 py-2">
            Donate to a cause
          </PrimaryLinkButton>
        )}
      </SurfaceCard>

      {user.anvilIndex != null || user.role === 'admin' ? (
        <>
          {history?.summary && (
            <div className="mt-8">
              <WalletMeter summary={history.summary} role={user.role} />
            </div>
          )}

          {user.role === 'donor' ? (
            <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6" aria-labelledby="acct-badges">
              <h2 id="acct-badges" className="text-lg font-semibold text-[var(--text-high-3)]">
                Contribution badges
              </h2>
              <p className="mt-1 text-xs text-[var(--text-muted-1)]">
                Earned per cause from your donation totals (Bronze &lt; 1 ETH, Silver ≥ 1 ETH, Gold ≥ 5 ETH).
              </p>
              {badges.length === 0 ? (
                <p className="mt-4 text-sm text-[var(--text-muted-1)]">No badges yet — donate to a cause to earn your first badge.</p>
              ) : (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {badges.map((b) => (
                    <li key={`${b.causeId ?? 'general'}-${b.tier}`} className="vtx-glass-inset px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <TierBadgeMedal tier={b.tier} />
                          <p className="truncate text-sm font-semibold text-[var(--text-high-3)]">{b.causeName}</p>
                        </div>
                        <span className="shrink-0 rounded-full border border-[var(--glass-border)] bg-[var(--overlay-surface-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted-1)]">
                          {b.tier}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-[var(--text-muted-1)]">
                        {b.donations} donation{b.donations === 1 ? '' : 's'} ·{' '}
                        <span className="font-mono text-[var(--text-high-2)]">{b.totalEth.toFixed(4)} ETH</span>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6" aria-labelledby="acct-history">
            <h2 id="acct-history" className="text-lg font-semibold text-[var(--text-high-3)]">
              Your activity
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted-1)]">
              Transfers where your wallet is the sender or recipient (from the app ledger).
            </p>
            {historyErr && <p className="mt-3 text-sm text-rose-400">{historyErr}</p>}
            {!historyErr && history && history.entries.length === 0 && (
              <p className="mt-6 text-center text-sm text-[var(--text-muted-1)]">No recorded transfers yet.</p>
            )}
            {history && history.entries.length > 0 && (
              <ul className="mt-4 divide-y divide-white/[0.04]">
                {history.entries.map((e) => (
                  <HistoryRow key={e.id} e={e} />
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}

      {user.role === 'admin' && (
        <>
        <form
          id="disburse-cause"
          onSubmit={(e) => void disburseForCause(e)}
          className="mt-8 scroll-mt-24 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6"
        >
          <h2 className="text-lg font-semibold text-amber-200">Disburse for cause</h2>
          <p className="mt-1 text-xs text-[var(--text-muted-1)]">
            Sends ETH from the Vaultex vault directly to the selected cause treasury wallet.
          </p>
          <div className="mt-4 space-y-3">
            <select
              value={causeId}
              onChange={(e) => setCauseId(e.target.value)}
              required
              className="vtx-input w-full px-4 py-3"
            >
              <option value="">Select cause</option>
              {causes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={causeDisburseAmount}
              onChange={(e) => setCauseDisburseAmount(e.target.value)}
              placeholder="ETH amount"
              className="vtx-input w-full px-4 py-3 font-mono"
            />
            <input
              type="text"
              value={causeDisburseMessage}
              onChange={(e) => setCauseDisburseMessage(e.target.value.slice(0, 40))}
              maxLength={40}
              placeholder="Message (optional, max 40 chars)"
              className="vtx-input w-full px-4 py-3"
            />
          </div>
          <PrimaryButton type="submit" disabled={busyCause || !causeId} className="mt-4 px-6 py-2">
            {busyCause ? 'Sending…' : 'Disburse to cause'}
          </PrimaryButton>
          {causeDisburseMsg && <p className="mt-3 text-sm text-amber-200">{causeDisburseMsg}</p>}
        </form>

        <form onSubmit={(e) => void disburseToBeneficiary(e)} className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold text-[var(--text-high-3)]">Disburse to beneficiary</h2>
          <p className="mt-1 text-xs text-[var(--text-muted-1)]">
            Pays a beneficiary organization directly from the vault (separate from cause treasury).
          </p>
          <div className="mt-4 space-y-3">
            <select
              value={beneficiaryId}
              onChange={(e) => setBeneficiaryId(e.target.value)}
              required
              className="vtx-input w-full px-4 py-3"
            >
              <option value="">Select beneficiary</option>
              {beneficiaries.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={beneficiaryDisburseAmount}
              onChange={(e) => setBeneficiaryDisburseAmount(e.target.value)}
              placeholder="ETH amount"
              className="vtx-input w-full px-4 py-3 font-mono"
            />
            <input
              type="text"
              value={beneficiaryDisburseMessage}
              onChange={(e) => setBeneficiaryDisburseMessage(e.target.value.slice(0, 40))}
              maxLength={40}
              placeholder="Message (optional, max 40 chars)"
              className="vtx-input w-full px-4 py-3"
            />
          </div>
          {beneficiaryDisburseMsg && <p className="mt-3 text-sm text-amber-200">{beneficiaryDisburseMsg}</p>}
          <PrimaryButton type="submit" disabled={busyBeneficiary || !beneficiaryId} className="mt-4 px-6 py-2">
            {busyBeneficiary ? 'Sending…' : 'Send to beneficiary'}
          </PrimaryButton>
        </form>
        </>
      )}
    </div>
  );
}
