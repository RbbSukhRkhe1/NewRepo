import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { CauseFundingDonut } from '../components/CauseFundingDonut';

const SAMPLE_HERO_PLACEHOLDER = '/samples/placeholder.svg';

type ShowcaseCause = {
  /** Must equal `causes.title` in the DB so View Details resolves the correct `/causes/:id` */
  apiTitle: string;
  section: 'urgent' | 'completed';
  sectionLabel: string;
  storyTitle: string;
  storyBody: string;
  title: string;
  subtitle: string;
  donors: number;
  daysLeft: number;
  locationTag: string;
  categoryTag: string;
  progressPct: number;
  progressLabel: string;
  amountLabel: string;
  accent: 'orange' | 'green';
};

const causes: ShowcaseCause[] = [
  {
    apiTitle: 'LGBTQs',
    section: 'urgent',
    sectionLabel: 'Urgent',
    storyTitle: 'Community first',
    storyBody: 'Local partners provide safe shelter and trauma-informed counseling while every disbursement stays visible on-chain for community oversight.',
    title: 'LGBTQs',
    subtitle: 'Safe housing, counselling, and mutual aid for queer and trans communities.',
    donors: 174,
    daysLeft: 5,
    locationTag: 'Sydney, AU',
    categoryTag: 'Community',
    progressPct: 0,
    progressLabel: '0%',
    amountLabel: '0.00 ETH raised of 25.00 ETH goal',
    accent: 'orange',
  },
  {
    apiTitle: 'War',
    section: 'urgent',
    sectionLabel: 'Urgent',
    storyTitle: 'Relief corridors',
    storyBody: 'Donations route to vetted frontline responders delivering medical kits, evacuation transport, and essential family support in active conflict zones.',
    title: 'War',
    subtitle: 'Emergency relief, medical supplies, and resettlement support for conflict-affected families.',
    donors: 228,
    daysLeft: 4,
    locationTag: 'Regional',
    categoryTag: 'Humanitarian',
    progressPct: 0,
    progressLabel: '0%',
    amountLabel: '0.00 ETH raised of 50.00 ETH goal',
    accent: 'green',
  },
  {
    apiTitle: 'Disaster',
    section: 'urgent',
    sectionLabel: 'Urgent',
    storyTitle: 'Rapid response',
    storyBody: 'Emergency wallets release rapid aid for shelter, food, and clean water after floods and storms, with proof-backed spending published in real time.',
    title: 'Disaster',
    subtitle: 'Shelters, food, and rebuilding after earthquakes, floods, and climate shocks.',
    donors: 341,
    daysLeft: 8,
    locationTag: 'Pacific region',
    categoryTag: 'Disaster Relief',
    progressPct: 0,
    progressLabel: '0%',
    amountLabel: '0.00 ETH raised of 40.00 ETH goal',
    accent: 'orange',
  },
  {
    apiTitle: 'Hospital',
    section: 'completed',
    sectionLabel: 'Completed',
    storyTitle: 'Care networks',
    storyBody: 'This completed pool equipped public wards with critical devices and patient-care supplies, then continued funding overflow treatment capacity.',
    title: 'Hospital',
    subtitle: 'Medical equipment and patient care funds for overstretched public hospitals.',
    donors: 512,
    daysLeft: 0,
    locationTag: 'National',
    categoryTag: 'Healthcare',
    progressPct: 100,
    progressLabel: '100%',
    amountLabel: 'GOAL REACHED - EXPANDING IMPACT',
    accent: 'green',
  },
  {
    apiTitle: 'Education',
    section: 'urgent',
    sectionLabel: 'Active',
    storyTitle: 'Every learner',
    storyBody: 'Funds cover tuition gaps, learning kits, and connected devices so students in underserved regions can stay in class and finish terms.',
    title: 'Education',
    subtitle: 'Scholarships, supplies, and digital access where school budgets fall short.',
    donors: 198,
    daysLeft: 14,
    locationTag: 'Remote AU',
    categoryTag: 'Education',
    progressPct: 30,
    progressLabel: '30%',
    amountLabel: '9.00 ETH raised of 30.00 ETH goal',
    accent: 'green',
  },
];

function tagStyle(accent: ShowcaseCause['accent'], kind: 'frame' | 'story' | 'progress', isLightMode: boolean) {
  if (accent === 'orange') {
    if (kind === 'frame') {
      return isLightMode
        ? 'border-amber-500/35 shadow-[0_14px_28px_rgba(180,120,40,0.12)]'
        : 'border-amber-400/45 shadow-[0_0_28px_rgba(251,146,60,0.25)]';
    }
    if (kind === 'story') return isLightMode ? 'border-amber-500/45 bg-amber-500/10' : 'border-amber-400/70 bg-amber-500/8';
    return 'from-amber-400 to-orange-400';
  }
  if (kind === 'frame') {
    return isLightMode
      ? 'border-emerald-500/35 shadow-[0_14px_28px_rgba(49,129,104,0.12)]'
      : 'border-emerald-400/45 shadow-[0_0_28px_rgba(16,185,129,0.24)]';
  }
  if (kind === 'story') return isLightMode ? 'border-emerald-500/45 bg-emerald-500/10' : 'border-emerald-400/70 bg-emerald-500/8';
  return 'from-emerald-400 to-cyan-400';
}

function CauseCard({
  cause,
  isLightMode,
  detailCauseId,
  imageUrl,
  raisedEth,
  goalEth,
}: {
  cause: ShowcaseCause;
  isLightMode: boolean;
  /** Backend cause id — links to Cause detail when present; otherwise buttons fall back to /donate */
  detailCauseId?: number;
  imageUrl?: string | null;
  raisedEth?: number;
  goalEth?: number;
}) {
  const [heroFailed, setHeroFailed] = useState(false);
  useEffect(() => {
    setHeroFailed(false);
  }, [imageUrl]);

  const hasLiveStats = raisedEth != null && goalEth != null && goalEth > 0;
  const livePct = hasLiveStats ? Math.min(100, ((raisedEth as number) / (goalEth as number)) * 100) : null;
  const progressPct = livePct ?? cause.progressPct;
  const progressLabel =
    livePct != null ? `${livePct.toFixed(0)}%` : cause.progressLabel;
  const amountLabel =
    hasLiveStats
      ? `${(raisedEth as number).toFixed(2)} ETH raised of ${(goalEth as number).toFixed(2)} ETH goal`
      : cause.amountLabel;

  const accentText =
    cause.accent === 'orange'
      ? isLightMode
        ? 'text-amber-700'
        : 'text-amber-300'
      : isLightMode
        ? 'text-emerald-700'
        : 'text-emerald-300';

  const detailHref = detailCauseId != null ? `/causes/${detailCauseId}` : '/causes';
  const showHero = Boolean(imageUrl) && !heroFailed;

  return (
    <article
      className={`rounded-3xl border p-6 backdrop-blur-xl md:p-7 ${
        isLightMode
          ? 'bg-[linear-gradient(165deg,rgba(252,254,255,0.98),rgba(241,247,253,0.92))]'
          : 'bg-[linear-gradient(165deg,rgba(16,29,48,0.9),rgba(10,20,34,0.88))]'
      } ${tagStyle(cause.accent, 'frame', isLightMode)}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <p className={`text-[10px] font-semibold uppercase tracking-[0.25em] ${accentText}`}>{cause.sectionLabel}</p>
        {cause.section === 'completed' ? (
          <button type="button" className="text-xs text-[var(--text-muted-2)] hover:text-[var(--text-high-1)]">
            Delete
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,11rem)_minmax(0,230px)_1fr] md:gap-6">
        <div
          className={`relative aspect-[4/3] w-full overflow-hidden rounded-2xl border md:aspect-auto md:min-h-[11rem] ${
            isLightMode ? 'border-slate-200/80 bg-slate-100' : 'border-white/10 bg-slate-950/60'
          }`}
        >
          {showHero ? (
            <img
              src={imageUrl!}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setHeroFailed(true)}
            />
          ) : (
            <img
              src={SAMPLE_HERO_PLACEHOLDER}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <div className={`rounded-2xl border p-5 ${tagStyle(cause.accent, 'story', isLightMode)}`}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted-1)]">Impact story</p>
          <h3 className="mt-2 text-xl font-semibold leading-tight text-[var(--text-high-3)]">{cause.storyTitle}</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--text-muted-1)]">{cause.storyBody}</p>
        </div>

        <div>
          <h2 className="text-3xl font-bold leading-tight tracking-[-0.01em] text-[var(--text-high-3)] md:text-[2.1rem]">{cause.title}</h2>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`rounded-full px-2.5 py-1 ${
                isLightMode
                  ? 'border border-[rgba(164,184,207,0.42)] bg-white/80 text-[var(--text-muted-1)]'
                  : 'border border-white/10 bg-white/[0.03] text-[var(--text-muted-2)]'
              }`}
            >
              {cause.donors} donors
            </span>
            <span
              className={`rounded-full px-2.5 py-1 ${
                isLightMode
                  ? 'border border-[rgba(164,184,207,0.42)] bg-white/80 text-[var(--text-muted-1)]'
                  : 'border border-white/10 bg-white/[0.03] text-[var(--text-muted-2)]'
              }`}
            >
              {cause.daysLeft} days left
            </span>
            <span
              className={`rounded-full px-2.5 py-1 ${
                isLightMode
                  ? 'border border-[rgba(164,184,207,0.42)] bg-white/80 text-[var(--text-muted-1)]'
                  : 'border border-white/10 bg-white/[0.03] text-[var(--text-muted-2)]'
              }`}
            >
              {cause.locationTag}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 ${
                isLightMode
                  ? 'border border-[rgba(164,184,207,0.42)] bg-white/80 text-[var(--text-muted-1)]'
                  : 'border border-white/10 bg-white/[0.03] text-[var(--text-muted-2)]'
              }`}
            >
              {cause.categoryTag}
            </span>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 text-sm">
            <p className={`font-semibold ${accentText}`}>{progressLabel}</p>
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted-2)]">{amountLabel}</p>
          </div>
          <div className={`mt-2 h-2 rounded-full ${isLightMode ? 'bg-slate-200' : 'bg-black/40'}`}>
            <div
              className={`h-full rounded-full bg-gradient-to-r ${tagStyle(cause.accent, 'progress', isLightMode)}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {hasLiveStats ? (
            <div className="mt-4 max-w-[14rem]">
              <CauseFundingDonut
                raisedEth={raisedEth as number}
                goalEth={goalEth as number}
                isLightMode={isLightMode}
                compact
              />
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              to="/donate"
              className="inline-flex min-h-11 items-center rounded-full border border-emerald-300/70 bg-[linear-gradient(180deg,#3dffc4,#23d78f)] px-6 py-2 text-sm font-semibold text-[#032316] shadow-[0_0_22px_rgba(51,255,178,0.28)]"
            >
              DONATE NOW
            </Link>
            <Link
              to={detailHref}
              className={`inline-flex min-h-11 items-center rounded-full px-6 py-2 text-sm font-semibold text-[var(--text-high-3)] ${
                isLightMode
                  ? 'border border-[rgba(164,184,207,0.5)] bg-white/80 hover:bg-white'
                  : 'border border-white/20 bg-black/25 hover:bg-black/35'
              }`}
            >
              VIEW DETAILS
            </Link>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`rounded-full px-2 py-1 ${
                isLightMode
                  ? 'border border-emerald-600/30 bg-emerald-600/10 text-emerald-700'
                  : 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
              }`}
            >
              Verified
            </span>
            <span className="text-[var(--text-muted-2)]">Secure donation via blockchain</span>
          </div>
        </div>
      </div>
    </article>
  );
}

function AddCauseCard({ isLightMode }: { isLightMode: boolean }) {
  return (
    <Link
      to="/causes/new"
      className={`group flex w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-14 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:brightness-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] ${
        isLightMode
          ? 'border-emerald-600/45 bg-[linear-gradient(162deg,rgba(236,252,246,0.95),rgba(220,246,236,0.88))] shadow-[0_10px_32px_rgba(16,120,90,0.12)] hover:border-emerald-600/58 hover:shadow-[0_14px_40px_rgba(16,120,90,0.16)]'
          : 'border-emerald-500/28 bg-[linear-gradient(168deg,rgba(6,24,18,0.72),rgba(4,14,22,0.68))] shadow-[0_0_40px_rgba(16,185,129,0.12),inset_0_0_0_1px_rgba(52,211,153,0.08)] hover:border-emerald-400/42 hover:shadow-[0_0_48px_rgba(45,245,180,0.18)]'
      }`}
      aria-label="Add cause — Create a new fundraising cause"
    >
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-full border-2 text-3xl font-light leading-none ${
          isLightMode ? 'border-emerald-600/55 text-emerald-900' : 'border-emerald-400/55 text-white'
        }`}
        aria-hidden
      >
        +
      </span>
      <p className={`mt-5 text-lg font-bold tracking-[-0.02em] ${isLightMode ? 'text-emerald-950' : 'text-white'}`}>Add cause</p>
      <p className={`mt-2 max-w-[13rem] text-sm leading-snug ${isLightMode ? 'text-emerald-900/72' : 'text-slate-400'}`}>
        Create a new fundraising cause
      </p>
    </Link>
  );
}

type ApiCauseRow = {
  id: number;
  title: string;
  goal_eth: number;
  raised_eth: number;
  image_url: string | null;
};

export function CausesPage() {
  const [isLightMode, setIsLightMode] = useState(
    () => typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light',
  );
  const [apiCauses, setApiCauses] = useState<ApiCauseRow[]>([]);

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => setIsLightMode(root.getAttribute('data-theme') === 'light');
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiJson<ApiCauseRow[]>('/causes')
      .then((rows) => {
        if (cancelled) return;
        setApiCauses(rows);
      })
      .catch(() => {
        if (!cancelled) setApiCauses([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="vtx-page max-w-6xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-[var(--text-high-3)]">Causes</h1>
        <div className="hidden items-center gap-2 sm:flex">
          <button
            type="button"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-high-2)] ${
              isLightMode
                ? 'border border-[rgba(164,184,207,0.45)] bg-white/80 hover:bg-white'
                : 'border border-white/15 bg-white/[0.03] hover:bg-white/[0.08]'
            }`}
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            type="button"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-high-2)] ${
              isLightMode
                ? 'border border-[rgba(164,184,207,0.45)] bg-white/80 hover:bg-white'
                : 'border border-white/15 bg-white/[0.03] hover:bg-white/[0.08]'
            }`}
            aria-label="Next"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {causes.map((cause) => {
          const match = apiCauses.find((r) => r.title === cause.apiTitle);
          return (
          <CauseCard
            key={`${cause.section}-${cause.apiTitle}`}
            cause={cause}
            isLightMode={isLightMode}
            detailCauseId={match?.id}
            imageUrl={match?.image_url}
            raisedEth={match?.raised_eth}
            goalEth={match?.goal_eth}
          />
          );
        })}
        <AddCauseCard isLightMode={isLightMode} />
      </div>
    </div>
  );
}
