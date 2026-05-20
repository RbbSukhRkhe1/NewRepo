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

type CauseVisual = {
  match: RegExp;
  image: string;
  heading: string;
  narrative: (amount: string) => string;
};

const CAUSE_VISUALS: CauseVisual[] = [
  {
    match: /educat|school|student|learn/i,
    image:
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1400&q=80',
    heading: 'See Your Gift in Action',
    narrative: (amount) => `Your gift of ${amount} ETH helps equip classrooms with books, desks, and digital tools.`,
  },
  {
    match: /medical|health|clinic|hospital|care|cancer/i,
    image:
      'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1400&q=80',
    heading: 'Direct Impact Story',
    narrative: (amount) => `Your ${amount} ETH donation supports checkups, medicines, and urgent treatment access.`,
  },
  {
    match: /hunger|food|meal|nutrition/i,
    image:
      'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1400&q=80',
    heading: 'Feed Families Faster',
    narrative: (amount) => `With ${amount} ETH, community kitchens can serve meals and staple food packs this week.`,
  },
  {
    match: /shelter|housing|relief|war|displaced|refugee/i,
    image:
      'https://images.unsplash.com/photo-1469571486292-b53601020a54?auto=format&fit=crop&w=1400&q=80',
    heading: 'Restore Safe Spaces',
    narrative: (amount) => `Your ${amount} ETH helps secure temporary shelter, bedding, and emergency essentials.`,
  },
];

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

  const selectedCause = useMemo(
    () => causes.find((c) => c.id === selectedCauseId) ?? null,
    [causes, selectedCauseId],
  );
  const selectedVisual = useMemo(() => {
    const text = `${selectedCause?.title ?? ''} ${selectedCause?.description ?? ''}`;
    return (
      CAUSE_VISUALS.find((item) => item.match.test(text)) ?? {
        image:
          'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=1400&q=80',
        heading: 'See Your Gift in Action',
        narrative: (amount: string) =>
          `Your gift of ${amount} ETH powers transparent, verifiable support from donor to beneficiary.`,
      }
    );
  }, [selectedCause]);

  const [isLightMode, setIsLightMode] = useState(
    () => typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light',
  );

  useEffect(() => {
    loadDonationLedger()
      .then((rows) => setRecent(rows.filter((r) => r.kind === 'donation_in').slice(-5).reverse()))
      .catch(() => setRecent([]));
  }, []);

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
                className={`vtx-glass-inset p-3 text-left transition duration-300 ${
                  active
                    ? isLightMode
                      ? 'scale-[1.01] border-emerald-300/70 bg-emerald-50/75 ring-2 ring-emerald-400/55 shadow-[0_0_0_1px_rgba(16,185,129,0.2),0_0_28px_rgba(16,185,129,0.28)]'
                      : 'scale-[1.01] border-emerald-300/45 bg-[color:rgb(34_197_94_/_0.15)] ring-1 ring-emerald-300/45 shadow-[0_0_30px_rgba(45,245,173,0.28)]'
                    : 'hover:-translate-y-0.5 hover:border-[var(--border-chrome-4)] hover:shadow-[0_10px_22px_-16px_rgba(0,0,0,0.5)]'
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
          <button
            type="button"
            onClick={() => nav('/causes/new')}
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
        </div>
      </section>

      <section className="mt-4 sm:mt-5">
        <div
          className={`overflow-hidden rounded-[2rem] border ${
            isLightMode
              ? 'border-slate-200/85 bg-[linear-gradient(180deg,#f8fbff_0%,#f2f7ff_100%)] shadow-[0_16px_42px_-32px_rgba(15,23,42,0.35)]'
              : 'border-white/10 bg-[linear-gradient(160deg,rgba(8,18,33,0.72),rgba(4,10,22,0.84))]'
          }`}
        >
          <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1.08fr_0.92fr]">
          <article
            className="relative min-h-[30rem] overflow-hidden lg:min-h-[34rem]"
            style={{
              backgroundImage: `linear-gradient(145deg, rgba(6,12,24,0.78), rgba(3,8,20,0.52) 45%, rgba(3,8,20,0.82)), url(${selectedVisual.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(45,245,173,0.24),transparent_50%),radial-gradient(circle_at_18%_80%,rgba(96,165,250,0.2),transparent_45%)]"
            />
            <div className="relative z-[1] flex h-full flex-col justify-between p-6 sm:p-8">
              <div>
                <p className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/90 backdrop-blur-md">
                  {selectedCause?.title ?? 'Selected Cause'}
                </p>
                <h3 className="mt-4 max-w-md text-3xl font-extrabold leading-tight tracking-[-0.02em] text-white sm:text-4xl">
                  {selectedVisual.heading}
                </h3>
                <p className="mt-3 max-w-lg text-base leading-relaxed text-white/90">
                  {selectedVisual.narrative(validAmount ? parsedAmount.toFixed(2) : '0.10')}
                </p>
              </div>

              <div className="grid gap-2.5 sm:max-w-[25rem] sm:grid-cols-2">
                <div className="rounded-2xl border border-white/20 bg-black/25 px-4 py-3 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.12em] text-white/70">Estimated Reach</p>
                  <p className="mt-1 text-2xl font-bold text-white">{impactPeople} people</p>
                </div>
                <div className="rounded-2xl border border-white/20 bg-black/25 px-4 py-3 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-[0.12em] text-white/70">Selected Amount</p>
                  <p className="mt-1 text-2xl font-bold text-white">{validAmount ? parsedAmount.toFixed(2) : '0.10'} ETH</p>
                </div>
              </div>
            </div>
          </article>

          <div className="border-t border-slate-200/70 p-4 backdrop-blur-xl sm:p-5 lg:border-l lg:border-t-0 lg:border-slate-200/70">
            <form onSubmit={(e) => void onConfirmDonation(e)}>
              <h3 className="text-lg font-semibold text-[var(--text-high-3)]">Donation Form</h3>
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
                className={`mt-2 w-full rounded-xl border px-4 py-3 font-mono text-[var(--text-high-3)] outline-none transition ${
                  isLightMode
                    ? 'border-slate-200/90 bg-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-300/35'
                    : 'border-[var(--border-chrome-2)] bg-[var(--surface-panel-overlay)] focus:border-emerald-300/45 focus:ring-2 focus:ring-emerald-300/20'
                }`}
                placeholder="0.10"
              />

              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {QUICK_AMOUNTS.map((value) => {
                  const activeAmount = amountEth === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAmountEth(value)}
                      className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold transition duration-300 hover:scale-[1.02] ${
                        activeAmount
                          ? isLightMode
                            ? 'border-emerald-400/70 bg-emerald-100/85 text-emerald-900 shadow-[0_10px_24px_-16px_rgba(5,150,105,0.7)]'
                            : 'border-emerald-300/55 bg-emerald-400/15 text-emerald-100 shadow-[0_12px_24px_-16px_rgba(45,245,173,0.65)]'
                          : isLightMode
                            ? 'border-slate-200/90 bg-white/85 text-slate-700 hover:border-emerald-300/65 hover:bg-emerald-50/90'
                            : 'border-[var(--border-chrome-2)] bg-[var(--surface-panel-overlay)] text-[var(--text-high-3)] hover:border-emerald-300/35 hover:bg-[color:rgb(34_197_94_/_0.1)]'
                      }`}
                    >
                      <span className="block text-[10px] uppercase tracking-[0.09em] opacity-70">Quick Amount</span>
                      <span>{value} ETH</span>
                    </button>
                  );
                })}
              </div>

              <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted-1)]">
                Optional Message / Note
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className={`mt-2 w-full resize-none rounded-xl border px-4 py-3 text-[var(--text-high-3)] outline-none transition ${
                  isLightMode
                    ? 'border-slate-200/90 bg-white/88 focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-300/35'
                    : 'border-[var(--border-chrome-2)] bg-[var(--surface-panel-overlay)] focus:border-emerald-300/45 focus:ring-2 focus:ring-emerald-300/20'
                }`}
                placeholder="Add a message of support"
              />

              <p className="mt-3 text-xs text-[var(--text-muted-2)]">All donations are on-chain and publicly verifiable.</p>

              {err && <p className="mt-3 text-sm text-rose-400">{err}</p>}
              {msg && <p className="mt-3 text-sm text-emerald-400">{msg}</p>}

              <PrimaryButton
                type="submit"
                disabled={!canSubmit}
                className="group relative mt-4 w-full overflow-hidden border-0 py-3.5 text-base font-bold text-white shadow-[0_16px_45px_-16px_rgba(16,185,129,0.75)]"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,#10b981_0%,#14b8a6_40%,#3b82f6_100%)] motion-safe:animate-pulse"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.32), transparent 62%)' }}
                />
                <span className="relative z-[1]">{busy ? 'Processing…' : 'Confirm Donation'}</span>
              </PrimaryButton>
              <p className="mt-2 text-center text-[11px] text-[var(--text-muted-2)]">On-chain confirmation appears after submit.</p>
            </form>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/10 px-3.5 py-3 text-sm backdrop-blur-sm">
              <p className="text-[var(--text-muted-1)]">
                Cause: <span className="font-semibold text-[var(--text-high-3)]">{selectedCause?.title ?? '—'}</span>
              </p>
              <p className="mt-1 text-[var(--text-muted-1)]">
                Amount:{' '}
                <span className="font-mono font-semibold text-[var(--text-high-3)]">
                  {validAmount ? parsedAmount.toFixed(4) : '0.0000'} ETH
                </span>
              </p>
              {note ? (
                <p className="mt-1 text-[var(--text-muted-1)]">
                  Note: <span className="text-[var(--text-high-3)]">{note}</span>
                </p>
              ) : null}
            </div>
          </div>
        </div>
        </div>
      </section>

      <section className="mt-4 sm:mt-5">
        <SurfaceCard className="rounded-2xl p-3.5 sm:p-4">
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
      </section>
      </div>
    </div>
  );
}

