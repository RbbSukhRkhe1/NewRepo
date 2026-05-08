import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const { user } = useAuth();
  const [causes, setCauses] = useState<Cause[]>([]);
  const [selectedCauseId, setSelectedCauseId] = useState<number | null>(null);
  const [amountEth, setAmountEth] = useState('0.1');
  const [note, setNote] = useState('');
  const [recent, setRecent] = useState<DonationLedgerEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

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

  const parsedAmount = Number.parseFloat(amountEth || '0');
  const validAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const gasFeeEth = validAmount ? 0.0012 + parsedAmount * 0.002 : 0.0012;
  const impactPeople = Math.max(1, Math.round((validAmount ? parsedAmount : 0.01) * 12));
  const canSubmit = Boolean(user?.anvilIndex != null && selectedCause && validAmount && !busy);

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

  return (
    <div className="vtx-page max-w-5xl">
      <div className="mb-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-muted-1)] hover:text-[var(--text-high-1)]">
          <span aria-hidden="true">←</span> Back
        </Link>
      </div>

      <SectionHeader title="Make a Donation" />

      <SurfaceCard className="mt-6">
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

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-[var(--text-high-3)]">Featured Causes</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {causes.slice(0, 4).map((cause) => {
            const pct = Math.min(100, (cause.raised_eth / cause.goal_eth) * 100);
            const active = selectedCauseId === cause.id;
            return (
              <button
                key={cause.id}
                type="button"
                onClick={() => setSelectedCauseId(cause.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  active
                    ? 'border-[var(--border-accent-soft)] bg-[color:rgb(34_197_94_/_0.14)]'
                    : 'border-[var(--border-chrome-1)] bg-[var(--overlay-surface-soft)] hover:border-[var(--border-chrome-3)]'
                }`}
              >
                <p className="line-clamp-1 font-semibold text-[var(--text-high-3)]">{cause.title}</p>
                <p className="mt-2 line-clamp-2 text-sm text-[var(--text-muted-1)]">{cause.description}</p>
                <p className="mt-3 text-xs text-[var(--text-muted-2)]">
                  {cause.raised_eth.toFixed(2)} / {cause.goal_eth.toFixed(2)} ETH
                </p>
                <div className="mt-2 h-2 rounded-full bg-[var(--bg-depth-1)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--accent-deep-1)] to-[var(--accent-bright-2)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => nav('/admin/causes/new')}
            className="group rounded-2xl border border-dashed border-[var(--border-chrome-3)] bg-[var(--overlay-surface-soft)] p-4 text-left transition hover:border-[var(--border-accent-soft)] hover:bg-[color:rgb(34_197_94_/_0.08)]"
          >
            <div className="flex h-full min-h-[140px] flex-col items-center justify-center text-center">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-chrome-3)] text-2xl font-semibold text-[var(--text-high-3)] transition group-hover:border-[var(--border-accent-soft)]">
                +
              </span>
              <p className="mt-3 text-sm font-semibold text-[var(--text-high-3)]">Add cause</p>
              <p className="mt-1 text-xs text-[var(--text-muted-1)]">Create a new fundraising cause</p>
            </div>
          </button>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <SurfaceCard className="rounded-3xl p-6 sm:p-7">
          <form onSubmit={(e) => void onConfirmDonation(e)}>
            <h3 className="text-lg font-semibold text-[var(--text-high-3)]">Donation Form</h3>
            <p className="mt-1 text-sm text-[var(--text-muted-1)]">
              {selectedCause
                ? `${selectedCause.title} — ${selectedCause.description}`
                : 'Select a cause to begin your donation.'}
            </p>

            <label className="mt-5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted-1)]">
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
                  className="rounded-full border border-[var(--border-chrome-2)] bg-[var(--surface-panel-overlay)] px-3 py-1.5 text-xs font-semibold text-[var(--text-high-3)] hover:border-[var(--border-chrome-4)]"
                >
                  {value} ETH
                </button>
              ))}
            </div>

            <label className="mt-5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted-1)]">
              Optional Message / Note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="vtx-input mt-2 w-full px-4 py-3"
              placeholder="Add a message of support"
            />

            <div className="mt-5 rounded-xl border border-[var(--border-chrome-2)] bg-[var(--overlay-surface-soft)] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-muted-1)]">Estimated gas fee</span>
                <span className="font-mono text-[var(--text-high-3)]">{gasFeeEth.toFixed(4)} ETH</span>
              </div>
              <p className="mt-2 text-xs text-[var(--text-muted-1)]">
                All donations are on-chain and publicly verifiable
              </p>
            </div>

            {err && <p className="mt-3 text-sm text-rose-400">{err}</p>}
            {msg && <p className="mt-3 text-sm text-emerald-400">{msg}</p>}

            <PrimaryButton type="submit" disabled={!canSubmit} className="mt-5 w-full py-3 text-base">
              {busy ? 'Processing…' : 'Confirm Donation'}
            </PrimaryButton>
          </form>
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard>
            <h4 className="text-base font-semibold text-[var(--text-high-3)]">Total Impact</h4>
            <p className="mt-2 text-sm text-[var(--text-muted-1)]">
              Your donation will help approximately <span className="font-semibold text-[var(--text-high-3)]">{impactPeople} people</span>.
            </p>
          </SurfaceCard>

          <SurfaceCard>
            <h4 className="text-base font-semibold text-[var(--text-high-3)]">Transaction Preview</h4>
            <div className="mt-3 space-y-2 text-sm">
              <p className="text-[var(--text-muted-1)]">
                Cause: <span className="text-[var(--text-high-3)]">{selectedCause?.title ?? '—'}</span>
              </p>
              <p className="text-[var(--text-muted-1)]">
                Amount: <span className="font-mono text-[var(--text-high-3)]">{validAmount ? parsedAmount.toFixed(4) : '0.0000'} ETH</span>
              </p>
              <p className="text-[var(--text-muted-1)]">
                Total est: <span className="font-mono text-[var(--text-high-3)]">{(Math.max(parsedAmount, 0) + gasFeeEth).toFixed(4)} ETH</span>
              </p>
              {note ? (
                <p className="text-[var(--text-muted-1)]">
                  Note: <span className="text-[var(--text-high-3)]">{note}</span>
                </p>
              ) : null}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <h4 className="text-base font-semibold text-[var(--text-high-3)]">Recent Donations</h4>
            <ul className="mt-3 space-y-2">
              {recent.length === 0 ? (
                <li className="text-sm text-[var(--text-muted-1)]">No recent donations yet.</li>
              ) : (
                recent.map((entry) => (
                  <li key={entry.id} className="rounded-lg border border-[var(--border-chrome-1)] px-3 py-2 text-sm">
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
  );
}

