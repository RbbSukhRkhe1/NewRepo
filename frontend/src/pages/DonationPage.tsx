import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiJson } from '../lib/api';
import { loadDonationLedger, type DonationLedgerEntry } from '../lib/donationLedger';
import { PrimaryButton, SectionHeader, SurfaceCard } from '../components/ui';

type Cause = {
  id: number;
  title: string;
  description: string;
  goal_eth: number;
  raised_eth: number;
};

const QUICK_AMOUNTS = ['0.01', '0.05', '0.1', '0.5', '1'] as const;

function shortHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

export function DonationPage() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [causes, setCauses] = useState<Cause[]>([]);
  const [selectedCauseId, setSelectedCauseId] = useState<number | null>(null);
  const [amountEth, setAmountEth] = useState('0.1');
  const [note, setNote] = useState('');
  const [recent, setRecent] = useState<DonationLedgerEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user?.role === 'admin') {
      nav('/causes', { replace: true });
    }
  }, [loading, user, nav]);

  useEffect(() => {
    apiJson<Cause[]>('/causes')
      .then((rows) => {
        setCauses(rows);
        if (rows.length > 0) setSelectedCauseId(rows[0].id);
      })
      .catch((e: unknown) => {
        setErr(e instanceof Error ? e.message : 'Failed to load causes');
      });
  }, []);

  useEffect(() => {
    loadDonationLedger()
      .then((rows) => setRecent(rows.filter((r) => r.kind === 'donation_in').slice(-5).reverse()))
      .catch(() => setRecent([]));
  }, []);

  const selectedCause = useMemo(
    () => causes.find((c) => c.id === selectedCauseId) ?? null,
    [causes, selectedCauseId],
  );

  const [isLightMode, setIsLightMode] = useState(
    () => typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light',
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const syncTheme = () => setIsLightMode(root.getAttribute('data-theme') === 'light');
    syncTheme();
    const obs = new MutationObserver(syncTheme);
    obs.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  const parsedAmount = Number.parseFloat(amountEth || '0');
  const validAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const impactPeople = Math.max(1, Math.round((validAmount ? parsedAmount : 0.01) * 12));
  const canSubmit = Boolean(
    user?.role === 'donor' && user.anvilIndex != null && selectedCause && validAmount && !busy,
  );

  async function onConfirmDonation(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCause || !canSubmit) return;
    setMsg(null);
    setErr(null);
    setBusy(true);
    try {
      const result = await apiJson<{ txHash: string }>('/donate', {
        method: 'POST',
        body: JSON.stringify({ causeId: selectedCause.id, amountEth }),
      });
      setMsg(`Donation confirmed · ${shortHash(result.txHash)}`);
      const rows = await loadDonationLedger();
      setRecent(rows.filter((r) => r.kind === 'donation_in').slice(-5).reverse());
    } catch (error: unknown) {
      setErr(error instanceof Error ? error.message : 'Donation failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading || user?.role === 'admin') {
    return <div className="p-12 text-center text-[var(--text-muted-1)]">Loading…</div>;
  }

  return (
    <div className="relative mx-auto w-full max-w-5xl px-4 py-3 text-left sm:px-5 sm:py-4">
      {isLightMode ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute -left-24 top-0 h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.16)_0%,transparent_68%)] blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 top-32 h-[18rem] w-[18rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.12)_0%,transparent_70%)] blur-3xl"
          />
        </>
      ) : null}
      <div className="relative z-[1]">
        <div className="relative">
          <button
            type="button"
            onClick={() => nav(-1)}
            className="absolute left-0 top-0 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-muted-1)] hover:text-[var(--text-high-1)]"
          >
            ← Back
          </button>
          <div className="pt-9">
            <SectionHeader title="Make a Donation" />
          </div>
        </div>

        <SurfaceCard
          className={`mt-3 p-3.5 sm:p-4 ${
            isLightMode
              ? 'relative isolate overflow-hidden rounded-2xl ring-1 ring-emerald-500/12'
              : ''
          }`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--text-high-3)]">Wallet Connection Status</p>
            <p className="mt-1 text-sm text-[var(--text-muted-1)]">
              {user?.anvilIndex != null
                ? `Connected as ${user.name} (${user.addressMasked ?? 'wallet assigned'})`
                : 'Connect your wallet to start donating on-chain.'}
            </p>
          </div>
          {user?.anvilIndex == null && (
            <PrimaryButton onClick={() => nav('/login')} className="px-8">
              Connect Wallet
            </PrimaryButton>
          )}
        </div>
      </SurfaceCard>

      <section className="mt-4 sm:mt-5">
        <h2 className="text-xl font-semibold text-[var(--text-high-3)]">Featured Causes</h2>
        <div className="mt-2.5 grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
          {causes.slice(0, 4).map((cause) => {
            const pct = Math.min(100, (cause.raised_eth / cause.goal_eth) * 100);
            const active = selectedCauseId === cause.id;
            return (
              <button
                key={cause.id}
                type="button"
                onClick={() => setSelectedCauseId(cause.id)}
                className={`vtx-glass-inset p-3 text-left transition ${
                  active
                    ? isLightMode
                      ? 'ring-2 ring-emerald-500/25'
                      : 'border-[var(--border-accent-soft)] bg-[color:rgb(34_197_94_/_0.12)]'
                    : 'hover:border-[var(--border-chrome-4)]'
                }`}
              >
                <p className="line-clamp-1 font-semibold text-[var(--text-high-3)]">{cause.title}</p>
                <p className="mt-1 line-clamp-1 text-sm text-[var(--text-muted-1)]">{cause.description}</p>
                <p className="mt-1.5 text-xs text-[var(--text-muted-2)]">
                  {cause.raised_eth.toFixed(2)} / {cause.goal_eth.toFixed(2)} ETH
                </p>
                <div className="mt-1 h-1.5 rounded-full bg-[var(--bg-depth-1)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent-core)] opacity-90"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            );
          })}
          {user?.role === 'admin' ? (
          <button
            type="button"
            onClick={() => nav('/admin/causes/new')}
            className={`group rounded-2xl border border-dashed p-3 text-left transition ${
              isLightMode
                ? 'border-emerald-300/55 bg-white/70 hover:border-emerald-400/70 hover:bg-emerald-50/65'
                : 'border-[var(--border-chrome-3)] bg-[var(--overlay-surface-soft)] hover:border-[var(--border-accent-soft)] hover:bg-[color:rgb(34_197_94_/_0.08)]'
            }`}
          >
            <div className="flex h-full min-h-[98px] flex-col items-center justify-center text-center">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-chrome-3)] text-2xl font-semibold text-[var(--text-high-3)] transition group-hover:border-[var(--border-accent-soft)]">
                +
              </span>
              <p className="mt-2 text-sm font-semibold text-[var(--text-high-3)]">Add cause</p>
              <p className="mt-0.5 text-xs text-[var(--text-muted-1)]">Create a new fundraising cause</p>
            </div>
          </button>
          ) : null}
        </div>
      </section>

      <section className="mt-4 grid gap-3 sm:mt-5 lg:grid-cols-[1.2fr_0.8fr]">
        <SurfaceCard
          className={`rounded-3xl p-4 sm:p-5 ${
            isLightMode
              ? 'relative isolate overflow-hidden ring-1 ring-slate-200/50'
              : ''
          }`}
        >
          <form onSubmit={(e) => void onConfirmDonation(e)}>
            <h3 className="text-lg font-semibold text-[var(--text-high-3)]">Donation Form</h3>
            {user?.role === 'admin' ? (
              <p className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                Admins disburse vault funds from a cause detail page or Account — not through donor donations.
              </p>
            ) : (
            <>
            <p className="mt-1 text-sm text-[var(--text-muted-1)]">
              {selectedCause
                ? `${selectedCause.title} — ${selectedCause.description}`
                : 'Select a cause to begin your donation.'}
            </p>

            <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted-1)]">
              Amount (ETH)
            </label>
            <input
              value={amountEth}
              onChange={(e) => setAmountEth(e.target.value)}
              className="vtx-input mt-2 w-full px-4 py-3 font-mono"
              placeholder="0.10"
            />

            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAmountEth(value)}
                  className={
                    isLightMode
                      ? 'rounded-full border border-emerald-200/80 bg-white/90 px-3 py-1.5 text-xs font-semibold text-emerald-950/90 shadow-[0_2px_8px_-4px_rgba(15,118,110,0.35)] hover:border-emerald-400/70 hover:bg-emerald-50/90 hover:shadow-[0_6px_16px_-8px_rgba(5,100,75,0.22)]'
                      : 'rounded-full border border-[var(--border-chrome-2)] bg-[var(--surface-panel-overlay)] px-3 py-1.5 text-xs font-semibold text-[var(--text-high-3)] hover:border-[var(--border-chrome-4)]'
                  }
                >
                  {value} ETH
                </button>
              ))}
            </div>

            <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted-1)]">
              Optional Message / Note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={1}
              className="vtx-input mt-2 w-full resize-none px-4 py-2.5 focus:min-h-[88px]"
              placeholder="Add a message of support"
            />

            <p className="mt-3 text-xs text-[var(--text-muted-2)]">
              All donations are on-chain and publicly verifiable.
            </p>

            {err && <p className="mt-3 text-sm text-rose-400">{err}</p>}
            {msg && <p className="mt-3 text-sm text-emerald-400">{msg}</p>}

            <PrimaryButton
              type="submit"
              disabled={!canSubmit}
              className="mt-3.5 w-full py-2.5 text-base shadow-[0_10px_36px_-12px_rgba(34,197,94,0.58)] hover:shadow-[0_14px_44px_-12px_rgba(45,245,173,0.72)]"
            >
              {busy ? 'Processing…' : 'Confirm Donation'}
            </PrimaryButton>
            <p className="mt-2 text-center text-[11px] text-[var(--text-muted-2)]">
              On-chain confirmation appears after submit.
            </p>
            </>
            )}
          </form>
        </SurfaceCard>

        <div className="space-y-3">
          <SurfaceCard
            className={`p-3.5 sm:p-4 ${
              isLightMode
                ? 'rounded-2xl border-slate-200/80 bg-[linear-gradient(160deg,#ffffff_0%,#f8fafc_48%,#f0fdf4_100%)] shadow-[0_16px_40px_-34px_rgba(15,23,42,0.28)] ring-1 ring-emerald-500/12'
                : ''
            }`}
          >
            <h4 className="text-base font-semibold text-[var(--text-high-3)]">Total Impact</h4>
            <p className="mt-2 text-sm text-[var(--text-muted-1)]">
              Your donation will help approximately{' '}
              <span
                className={
                  isLightMode ? 'font-semibold text-emerald-800' : 'font-semibold text-[var(--text-high-3)]'
                }
              >
                {impactPeople} people
              </span>
              .
            </p>
          </SurfaceCard>

          <SurfaceCard
            className={`p-3.5 sm:p-4 ${
              isLightMode
                ? 'rounded-2xl border-slate-200/80 bg-white/90 shadow-[0_14px_36px_-32px_rgba(15,23,42,0.26)] ring-1 ring-slate-200/60'
                : ''
            }`}
          >
            <h4 className="text-base font-semibold text-[var(--text-high-3)]">Transaction Preview</h4>
            <div className="mt-3 space-y-2 text-sm">
              <p className="text-[var(--text-muted-1)]">
                Cause: <span className="text-[var(--text-high-3)]">{selectedCause?.title ?? '—'}</span>
              </p>
              <p className="text-[var(--text-muted-1)]">
                Amount: <span className="font-mono text-[var(--text-high-3)]">{validAmount ? parsedAmount.toFixed(4) : '0.0000'} ETH</span>
              </p>
              {note ? (
                <p className="text-[var(--text-muted-1)]">
                  Note: <span className="text-[var(--text-high-3)]">{note}</span>
                </p>
              ) : null}
            </div>
          </SurfaceCard>

          <SurfaceCard
            className={`p-3 sm:p-3.5 ${
              isLightMode
                ? 'rounded-2xl border-slate-200/75 bg-[linear-gradient(175deg,#fafbfc_0%,#f1f5f9_100%)] ring-1 ring-slate-200/50'
                : ''
            }`}
          >
            <h4 className="text-base font-semibold text-[var(--text-high-3)]">Recent Donations</h4>
            <ul className="mt-2 space-y-1.5">
              {recent.length === 0 ? (
                <li className="text-sm text-[var(--text-muted-1)]">No recent donations yet.</li>
              ) : (
                recent.slice(0, 3).map((entry) => (
                  <li
                    key={entry.id}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      isLightMode
                        ? 'border-slate-200/90 bg-white/80 shadow-[0_4px_14px_-12px_rgba(15,23,42,0.2)]'
                        : 'border-[var(--border-chrome-1)]'
                    }`}
                  >
                    <p className="text-[var(--text-high-3)]">
                      {entry.fromDisplayName} donated {entry.amountEth} ETH
                    </p>
                    <p className="text-xs text-[var(--text-muted-1)]">
                      {entry.causeName || 'General'} · {shortHash(entry.txHash)}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </SurfaceCard>
        </div>
      </section>
      </div>
    </div>
  );
}

