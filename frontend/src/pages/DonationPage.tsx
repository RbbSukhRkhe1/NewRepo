import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiJson } from '../lib/api';
import { PrimaryButton, SectionHeader } from '../components/ui';

/** Public (always same origin as the app) + bundled URL — avoids broken <img src> from bad import resolution */
const LGBT_DONATION_HERO_PUBLIC = `${import.meta.env.BASE_URL}samples/causes/lgbtqs.jpg`;
const LGBT_DONATION_HERO_BUNDLED = new URL('../assets/causes/lgbtqs.jpg', import.meta.url).href;

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
  /** Extra hero URLs rotated by cause id for richer showcases */
  gallery?: readonly string[];
  heading: string;
  narrative: (amount: string) => string;
  /** Softer scrim so darker hero photos (e.g. local LGBTQs art) stay visible */
  heroBackdrop?: 'light' | 'standard';
};

const DEFAULT_SHOWCASE_VISUAL: CauseVisual = {
  match: /^$/u,
  image:
    'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=1400&q=80',
  heading: 'See Your Gift in Action',
  narrative: (amount: string) =>
    `Your gift of ${amount} ETH powers transparent, verifiable support from donor to beneficiary.`,
};

const CAUSE_VISUALS: CauseVisual[] = [
  {
    // Before generic "housing" matches — seed copy includes "Safe housing" for LGBTQs.
    match: /lgbtq|lgbt|queer|trans communities|pride|non-?binary|mutual aid for queer/i,
    image: LGBT_DONATION_HERO_PUBLIC,
    heroBackdrop: 'light',
    gallery: [
      LGBT_DONATION_HERO_PUBLIC,
      LGBT_DONATION_HERO_BUNDLED,
      'https://images.unsplash.com/photo-1562600869-0cceedeedf68?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=1400&q=80',
    ],
    heading: 'Stand With LGBTQ+ Communities',
    narrative: (amount) =>
      `Your ${amount} ETH backs safe housing, affirming care, and mutual aid for queer and trans neighbors.`,
  },
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
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [causes, setCauses] = useState<Cause[]>([]);
  const [activeCauseId, setActiveCauseId] = useState<number | null>(null);
  const [amountEth, setAmountEth] = useState('0.1');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const preferredCauseId = useMemo(() => {
    const raw = searchParams.get('causeId');
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [searchParams]);

  useEffect(() => {
    apiJson<Cause[]>('/causes')
      .then((rows) => {
        setCauses(rows);
        setActiveCauseId((prev) => {
          if (rows.length === 0) return null;
          if (preferredCauseId != null && rows.some((c) => c.id === preferredCauseId)) return preferredCauseId;
          if (prev != null && rows.some((c) => c.id === prev)) return prev;
          return rows[0].id;
        });
      })
      .catch((e: unknown) => {
        setErr(e instanceof Error ? e.message : 'Failed to load causes');
      });
  }, [preferredCauseId]);

  const activeCause = useMemo(
    () => causes.find((c) => c.id === activeCauseId) ?? null,
    [causes, activeCauseId],
  );

  /** Causes shown in the 2×2 grid — excludes the one currently in the Impact panel */
  const inactiveCauses = useMemo(
    () => (activeCauseId == null ? [] : causes.filter((c) => c.id !== activeCauseId)),
    [causes, activeCauseId],
  );

  const { activeVisual, showcaseImageUrl } = useMemo(() => {
    const text = `${activeCause?.title ?? ''} ${activeCause?.description ?? ''}`;
    const visual = CAUSE_VISUALS.find((item) => item.match.test(text)) ?? DEFAULT_SHOWCASE_VISUAL;
    const g = visual.gallery;
    const causeId = activeCause?.id;
    const url = g?.length && causeId != null ? g[causeId % g.length] : visual.image;
    return { activeVisual: visual, showcaseImageUrl: url };
  }, [activeCause]);

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
  const canSubmit = Boolean(user?.anvilIndex != null && activeCause && validAmount && !busy);

  async function onConfirmDonation(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCause || !canSubmit) return;
    setMsg(null);
    setErr(null);
    setBusy(true);
    try {
      const result = await apiJson<{ txHash: string }>('/donate', {
        method: 'POST',
        body: JSON.stringify({ causeId: activeCause.id, amountEth }),
      });
      setMsg(`Donation confirmed · ${shortHash(result.txHash)}`);
    } catch (error: unknown) {
      setErr(error instanceof Error ? error.message : 'Donation failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-4 py-2 text-left sm:px-5 sm:py-2.5">
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
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => nav(-1)}
            className="absolute left-0 top-0 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-muted-1)] hover:text-[var(--text-high-1)]"
          >
            ← Back
          </button>
          <div className="pt-6 sm:pt-7">
            <SectionHeader title="Make a Donation" />
          </div>
        </div>

        <section className="mt-2 flex min-h-0 flex-1 flex-col sm:mt-2.5">
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-12 lg:items-stretch">
            <div className="flex h-full min-h-0 flex-col gap-2.5 lg:col-span-7">
              <article className="relative min-h-0 flex-1 overflow-hidden rounded-[2rem]">
                <img
                  key={showcaseImageUrl}
                  src={showcaseImageUrl}
                  alt=""
                  className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover"
                  loading="eager"
                  decoding="async"
                  onError={(e) => {
                    const el = e.currentTarget;
                    if (el.dataset.heroFallback === '1') return;
                    el.dataset.heroFallback = '1';
                    if (el.src !== activeVisual.image) {
                      el.src = activeVisual.image;
                      return;
                    }
                    el.src = DEFAULT_SHOWCASE_VISUAL.image;
                  }}
                />
                <div
                  aria-hidden
                  className={`pointer-events-none absolute inset-0 ${
                    activeVisual.heroBackdrop === 'light'
                      ? 'bg-[linear-gradient(145deg,rgba(8,14,24,0.48),rgba(4,10,20,0.32)_42%,rgba(3,8,18,0.58))]'
                      : 'bg-[linear-gradient(145deg,rgba(6,12,24,0.78),rgba(3,8,20,0.52)_45%,rgba(3,8,20,0.82))]'
                  }`}
                />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(45,245,173,0.24),transparent_50%),radial-gradient(circle_at_18%_80%,rgba(96,165,250,0.2),transparent_45%)]"
              />
              <div className="relative z-[1] h-full min-h-0 p-4 sm:p-5">
                {/* Copy stays in the top band; padding reserves space so stats never cover text */}
                <div className="h-full min-h-0 overflow-hidden pb-[6.75rem] sm:pb-[7.25rem]">
                  <p className="inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/90 backdrop-blur-md">
                    {activeCause?.title ?? 'Selected Cause'}
                  </p>
                  <h3 className="mt-2.5 max-w-md text-lg font-extrabold leading-[1.2] tracking-[-0.02em] text-white sm:mt-3 sm:text-xl lg:text-2xl">
                    {activeVisual.heading}
                  </h3>
                  <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/90 sm:text-[0.9375rem]">
                    {activeVisual.narrative(validAmount ? parsedAmount.toFixed(2) : '0.10')}
                  </p>
                </div>

                <div className="absolute bottom-4 left-4 right-4 z-[2] sm:bottom-5 sm:left-5 sm:right-5 sm:max-w-[25rem]">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-white/20 bg-black/40 px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md sm:px-4 sm:py-3">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-white/70 sm:text-xs">Estimated Reach</p>
                      <p className="mt-0.5 text-lg font-bold leading-none text-white sm:mt-1 sm:text-2xl">{impactPeople} people</p>
                    </div>
                    <div className="rounded-2xl border border-white/20 bg-black/40 px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md sm:px-4 sm:py-3">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-white/70 sm:text-xs">Selected Amount</p>
                      <p className="mt-0.5 text-lg font-bold leading-none text-white sm:mt-1 sm:text-2xl">
                        {validAmount ? parsedAmount.toFixed(2) : '0.10'} ETH
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              </article>

              <div
                className={`shrink-0 rounded-2xl border p-3 sm:p-3.5 ${
                  isLightMode
                    ? 'border-slate-200/85 bg-[linear-gradient(180deg,#f8fbff_0%,#f2f7ff_100%)] shadow-[0_16px_42px_-32px_rgba(15,23,42,0.35)]'
                    : 'border-white/10 bg-[linear-gradient(160deg,rgba(8,18,33,0.72),rgba(4,10,22,0.84))]'
                }`}
              >
                <h2 className="text-base font-semibold text-[var(--text-high-3)] sm:text-lg">Featured Causes</h2>
                <p className="mt-1 text-[11px] leading-snug text-[var(--text-muted-2)] sm:text-xs">
                  Tap a card to show that cause above; the previous one returns here.
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {inactiveCauses.length === 0 ? (
                    <p className="col-span-2 text-sm text-[var(--text-muted-1)]">
                      {causes.length === 0
                        ? 'No causes loaded yet.'
                        : activeCauseId == null
                          ? 'Loading…'
                          : 'Only one cause is available — it is shown in the impact panel above.'}
                    </p>
                  ) : (
                    inactiveCauses.map((cause) => {
                    const pct = Math.min(100, (cause.raised_eth / cause.goal_eth) * 100);
                    return (
                      <button
                        key={cause.id}
                        type="button"
                        onClick={() => setActiveCauseId(cause.id)}
                        className={`vtx-glass-inset p-2.5 text-left transition duration-300 hover:-translate-y-0.5 hover:border-[var(--border-chrome-4)] hover:shadow-[0_10px_22px_-16px_rgba(0,0,0,0.5)] ${
                          isLightMode
                            ? 'border-transparent bg-white/40'
                            : 'border-transparent bg-black/15'
                        }`}
                      >
                        <p className="line-clamp-1 font-semibold text-[var(--text-high-3)]">{cause.title}</p>
                        <p className="mt-1 line-clamp-1 text-xs sm:text-sm text-[var(--text-muted-1)]">{cause.description}</p>
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
                  })
                  )}
                </div>
              </div>
            </div>

            <div className="flex h-full min-h-0 flex-col gap-2.5 overflow-y-auto pr-2 lg:col-span-5">
            <div
              className={`shrink-0 rounded-[2rem] border p-3.5 backdrop-blur-xl sm:p-4 ${
                isLightMode
                  ? 'border-slate-200/85 bg-[linear-gradient(180deg,#f8fbff_0%,#f2f7ff_100%)] shadow-[0_16px_42px_-32px_rgba(15,23,42,0.35)]'
                  : 'border-white/10 bg-[linear-gradient(160deg,rgba(8,18,33,0.72),rgba(4,10,22,0.84))]'
              }`}
            >
            <form onSubmit={(e) => void onConfirmDonation(e)}>
              <h3 className="text-lg font-semibold text-[var(--text-high-3)]">Donation Form</h3>
              <p className="mt-1 text-sm text-[var(--text-muted-1)]">
                {activeCause
                  ? `${activeCause.title} — ${activeCause.description}`
                  : 'Select a cause to begin your donation.'}
              </p>

              <label className="mt-2.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted-1)]">
                Amount (ETH)
              </label>
              <input
                value={amountEth}
                onChange={(e) => setAmountEth(e.target.value)}
                className={`mt-1.5 w-full rounded-xl border px-4 py-2.5 font-mono text-[var(--text-high-3)] outline-none transition ${
                  isLightMode
                    ? 'border-slate-200/90 bg-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-300/35'
                    : 'border-[var(--border-chrome-2)] bg-[var(--surface-panel-overlay)] focus:border-emerald-300/45 focus:ring-2 focus:ring-emerald-300/20'
                }`}
                placeholder="0.10"
              />

              <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {QUICK_AMOUNTS.map((value) => {
                  const activeAmount = amountEth === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAmountEth(value)}
                      className={`rounded-xl border px-2.5 py-1.5 text-left text-sm font-semibold transition duration-300 hover:scale-[1.02] ${
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

              <label className="mt-2.5 block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted-1)]">
                Optional Message / Note
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className={`mt-1.5 w-full resize-none rounded-xl border px-4 py-2.5 text-[var(--text-high-3)] outline-none transition ${
                  isLightMode
                    ? 'border-slate-200/90 bg-white/88 focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-300/35'
                    : 'border-[var(--border-chrome-2)] bg-[var(--surface-panel-overlay)] focus:border-emerald-300/45 focus:ring-2 focus:ring-emerald-300/20'
                }`}
                placeholder="Add a message of support"
              />

              <p className="mt-2 text-xs text-[var(--text-muted-2)]">All donations are on-chain and publicly verifiable.</p>

              {err && <p className="mt-3 text-sm text-rose-400">{err}</p>}
              {msg && <p className="mt-3 text-sm text-emerald-400">{msg}</p>}

              <PrimaryButton
                type="submit"
                disabled={!canSubmit}
                className="group relative mt-3 w-full overflow-hidden border-0 py-2.5 text-base font-bold text-white shadow-[0_16px_45px_-16px_rgba(16,185,129,0.75)]"
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
              <p className="mt-1 text-center text-[11px] text-[var(--text-muted-2)]">On-chain confirmation appears after submit.</p>
            </form>

            <div className="mt-2.5 rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-sm backdrop-blur-sm">
              <p className="text-[var(--text-muted-1)]">
                Cause: <span className="font-semibold text-[var(--text-high-3)]">{activeCause?.title ?? '—'}</span>
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
      </div>
    </div>
  );
}

