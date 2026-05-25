import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { resolveCauseHeroUrl } from '../lib/causeHeroImages';
import { useIsLightMode } from '../lib/useIsLightMode';
import { useAuth } from '../context/AuthContext';
import { CauseFundingDonut } from '../components/CauseFundingDonut';

const SAMPLE_HERO_PLACEHOLDER = '/samples/placeholder.svg';

type ShowcaseCause = {
  apiTitle: string;
  sectionLabel: string;
  storyTitle: string;
  storyBody: string;
  title: string;
  subtitle: string;
  donors: number;
  daysLeft: number | null;
  locationTag: string;
  categoryTag: string;
  accent: 'orange' | 'green';
};

function tagStyle(accent: ShowcaseCause['accent'], kind: 'frame' | 'progress', isLightMode: boolean) {
  if (accent === 'orange') {
    if (kind === 'frame') {
      return isLightMode
        ? 'border-amber-400/45 shadow-[0_36px_80px_-42px_rgba(146,64,14,0.12),0_0_80px_-38px_rgba(251,191,36,0.16)] ring-1 ring-amber-500/22'
        : 'border-amber-400/45 shadow-[0_0_28px_rgba(251,146,60,0.25)]';
    }
    return 'from-amber-400 to-orange-400';
  }
  if (kind === 'frame') {
    return isLightMode
      ? 'border-emerald-400/45 shadow-[0_36px_80px_-42px_rgba(6,78,59,0.14),0_0_80px_-38px_rgba(16,185,129,0.18)] ring-1 ring-emerald-500/25'
      : 'border-emerald-400/45 shadow-[0_0_28px_rgba(16,185,129,0.24)]';
  }
  return 'from-emerald-400 to-cyan-400';
}

function CauseCard({
  cause,
  isLightMode,
  isAdmin,
  detailCauseId,
  imageUrl,
  disbursedEth,
  donatedEth,
  remainingEth,
  goalEth,
  utilizationPct,
  fundsMatched,
}: {
  cause: ShowcaseCause;
  isLightMode: boolean;
  isAdmin?: boolean;
  detailCauseId?: number;
  imageUrl?: string | null;
  disbursedEth?: number;
  donatedEth?: number;
  remainingEth?: number;
  goalEth?: number;
  utilizationPct?: number;
  fundsMatched?: boolean;
}) {
  const [failedHeroKey, setFailedHeroKey] = useState<string | null>(null);

  const hasUtil = utilizationPct != null && donatedEth != null;
  const progressPct = hasUtil
    ? Math.min(100, Math.max(0, utilizationPct))
    : 0;
  const progressLabel = hasUtil ? `${progressPct.toFixed(0)}% utilized` : '0% utilized';
  const amountLabel = hasUtil
    ? `${(disbursedEth ?? 0).toFixed(2)} ETH disbursed of ${(donatedEth ?? 0).toFixed(2)} ETH donated · ${(remainingEth ?? 0).toFixed(2)} ETH remaining`
    : `${(goalEth ?? 0).toFixed(2)} ETH goal`;

  const accentText =
    cause.accent === 'orange'
      ? isLightMode
        ? 'text-amber-700'
        : 'text-amber-300'
      : isLightMode
        ? 'text-emerald-700'
        : 'text-emerald-300';

  const detailHref = detailCauseId != null ? `/causes/${detailCauseId}` : '/causes';
  const actionHref = isAdmin
    ? detailCauseId != null
      ? `/causes/${detailCauseId}#disburse`
      : '/causes'
    : detailCauseId != null
      ? `/donate?causeId=${detailCauseId}`
      : '/donate';
  const actionLabel = isAdmin ? 'DISBURSE FUND' : 'DONATE NOW';
  const heroSrc = resolveCauseHeroUrl(cause.apiTitle, imageUrl);
  const heroFailureKey = `${detailCauseId ?? ''}:${cause.title}:${heroSrc ?? ''}`;
  const heroFailed = failedHeroKey === heroFailureKey;
  const displayHero =
    heroSrc && !heroFailed ? heroSrc : SAMPLE_HERO_PLACEHOLDER;

  return (
    <article
      data-accent={cause.accent}
      className={`vtx-cause-card vtx-surface rounded-2xl border p-3.5 sm:p-4 ${tagStyle(cause.accent, 'frame', isLightMode)}`}
    >
      <div className="grid gap-2.5 sm:grid-cols-[7.25rem_minmax(0,1fr)] sm:items-start md:grid-cols-[8.75rem_minmax(0,1fr)] md:gap-3">
        <div className="vtx-cause-hero relative max-h-[8.5rem] overflow-hidden sm:max-h-[9.25rem]">
          <img
            src={displayHero}
            alt=""
            referrerPolicy="no-referrer"
            className="aspect-[16/10] h-full max-h-[8.5rem] w-full object-cover sm:aspect-[4/3] sm:max-h-[9.25rem]"
            onError={() => setFailedHeroKey(heroFailureKey)}
          />
          <span
            className={`absolute left-2 top-2 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${
              isLightMode
                ? 'border-[var(--cause-accent-border-soft)] bg-white/95 text-emerald-900 shadow-[inset_0_1px_0_rgba(255,255,255,1)]'
                : 'border-[var(--cause-accent-border-soft)] bg-black/60 text-emerald-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm'
            }`}
          >
            {cause.sectionLabel}
          </span>
        </div>

        <div className="flex min-w-0 flex-col gap-2.5 sm:col-start-2">
          <section className="vtx-cause-section vtx-cause-story" aria-labelledby={`cause-story-${detailCauseId ?? cause.title}`}>
            <p
              id={`cause-story-${detailCauseId ?? cause.title}`}
              className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted-1)]"
            >
              Impact story
            </p>
            <h3 className="mt-1 text-base font-semibold leading-snug text-[var(--text-high-3)]">{cause.storyTitle}</h3>
            <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-[var(--text-muted-1)]">{cause.storyBody}</p>
          </section>

          <section className="vtx-cause-section vtx-cause-head">
            <h2 className="text-xl font-bold leading-tight tracking-[-0.02em] text-[var(--text-high-3)] sm:text-[1.35rem]">
              {cause.title}
            </h2>
          </section>

          <section className="vtx-cause-section vtx-cause-stats" aria-label="Campaign stats">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="vtx-cause-chip px-2 py-0.5">
                {cause.donors} donor{cause.donors === 1 ? '' : 's'}
              </span>
              {cause.daysLeft != null ? (
                <span className="vtx-cause-chip px-2 py-0.5">{cause.daysLeft} days left</span>
              ) : null}
              <span className="vtx-cause-chip px-2 py-0.5">{cause.locationTag}</span>
              <span className="vtx-cause-chip px-2 py-0.5">{cause.categoryTag}</span>
            </div>
          </section>

          <section className="vtx-cause-section vtx-cause-funding" aria-label="Funding progress">
            <div className="flex items-center justify-between gap-2 text-xs">
              <p className={`font-semibold ${accentText}`}>{progressLabel}</p>
              <p className="max-w-[58%] text-right text-[10px] uppercase leading-snug tracking-wide text-[var(--text-muted-2)]">
                {amountLabel}
              </p>
            </div>
            <div className="vtx-cause-progress-track mt-1.5 h-2 overflow-hidden p-px">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${tagStyle(cause.accent, 'progress', isLightMode)}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {hasUtil ? (
              <div className="mt-2 flex justify-center">
                <div className="w-full max-w-[9.5rem]">
                  <CauseFundingDonut
                    raisedEth={disbursedEth as number}
                    goalEth={Math.max(donatedEth ?? 0, 0.0001)}
                    isLightMode={isLightMode}
                    mini
                  />
                </div>
              </div>
            ) : null}
          </section>

          <section className="vtx-cause-section vtx-cause-actions" aria-label="Campaign actions">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Link
                to={actionHref}
                className="inline-flex min-h-9 items-center rounded-full border border-emerald-300/70 bg-[linear-gradient(180deg,#3dffc4,#23d78f)] px-4 py-1.5 text-xs font-semibold text-[#032316] shadow-[0_0_18px_rgba(51,255,178,0.22)]"
              >
                {actionLabel}
              </Link>
              <Link
                to={detailHref}
                className="vtx-cause-btn-secondary inline-flex min-h-9 items-center px-4 py-1.5 text-xs font-semibold text-[var(--text-high-3)]"
              >
                VIEW DETAILS
              </Link>
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-[11px]">
              <span className="vtx-cause-chip vtx-cause-chip--goal px-2 py-0.5 font-medium">
                Goal {goalEth?.toFixed(2) ?? '0.00'} ETH
              </span>
              {fundsMatched ? (
                <span className="vtx-cause-chip vtx-cause-chip--matched px-2 py-0.5 font-medium">Funds matched on-chain</span>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </article>
  );
}

function AddCauseCard({ isLightMode }: { isLightMode: boolean }) {
  return (
    <Link
      to="/causes/new"
      className={`flex min-h-[10rem] flex-col items-center justify-center rounded-2xl border border-dashed p-5 text-center transition-[border-color,background-color,box-shadow] duration-200 ${
        isLightMode
          ? 'border-emerald-400/45 bg-[linear-gradient(180deg,#ffffff_0%,#ecfdf5_55%,#d1fae5_100%)] shadow-[0_24px_56px_-36px_rgba(6,78,59,0.12)] ring-1 ring-emerald-500/20 hover:border-emerald-500/55 hover:shadow-[0_28px_64px_-34px_rgba(6,78,59,0.16)]'
          : 'border-emerald-400/35 bg-emerald-500/[0.04] hover:border-emerald-400/55 hover:bg-emerald-500/[0.08]'
      }`}
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-2xl font-light leading-none ${
          isLightMode ? 'border-emerald-600/55 text-emerald-900' : 'border-emerald-400/55 text-white'
        }`}
        aria-hidden
      >
        +
      </span>
      <p className={`mt-3 text-base font-bold tracking-[-0.02em] ${isLightMode ? 'text-emerald-950' : 'text-white'}`}>Add cause</p>
      <p className={`mt-1.5 max-w-[13rem] text-xs leading-snug ${isLightMode ? 'text-emerald-900/72' : 'text-slate-400'}`}>
        Create a new fundraising cause
      </p>
    </Link>
  );
}

type ApiCauseRow = {
  id: number;
  title: string;
  description: string;
  goal_eth: number;
  raised_eth: number;
  disbursed_eth: number;
  donated_eth: number;
  remaining_eth: number;
  utilization_pct: number;
  funds_matched: boolean;
  image_url: string | null;
  beneficiary_user_id: number | null;
  beneficiary_name: string | null;
  impact_story_title: string;
  impact_story_body: string;
  category_tag: string;
  location_tag: string;
  days_left: number | null;
  donor_count: number;
};

/** Prefer the canonical (lowest-id) row when duplicate titles exist in the API. */
function dedupeActiveCauses(rows: ApiCauseRow[]): ApiCauseRow[] {
  const byTitle = new Map<string, ApiCauseRow>();
  for (const row of rows) {
    const existing = byTitle.get(row.title);
    if (!existing || row.id < existing.id) byTitle.set(row.title, row);
  }
  return [...byTitle.values()].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
}

function apiRowToShowcaseCause(row: ApiCauseRow, index: number): ShowcaseCause {
  const urgent = row.days_left != null && row.days_left <= 7;
  return {
    apiTitle: row.title,
    sectionLabel: urgent ? 'Urgent' : 'Active',
    storyTitle: row.impact_story_title,
    storyBody: row.impact_story_body,
    title: row.title,
    subtitle: row.description.trim(),
    donors: row.donor_count,
    daysLeft: row.days_left,
    locationTag: row.location_tag,
    categoryTag: row.category_tag,
    accent: index % 2 === 0 ? 'green' : 'orange',
  };
}

export function CausesPage() {
  const isLightMode = useIsLightMode();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const location = useLocation();
  const [apiCauses, setApiCauses] = useState<ApiCauseRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiJson<ApiCauseRow[]>('/causes?status=active')
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
  }, [location.pathname]);

  const activeCauses = useMemo(() => dedupeActiveCauses(apiCauses), [apiCauses]);

  return (
    <div className="vtx-page max-w-6xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-[var(--text-high-3)]">Causes</h1>
        <div className="hidden items-center gap-2 sm:flex">
          <button
            type="button"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-high-2)] ${
              isLightMode
                ? 'vtx-chip transition-colors'
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
                ? 'vtx-chip transition-colors'
                : 'border border-white/15 bg-white/[0.03] hover:bg-white/[0.08]'
            }`}
            aria-label="Next"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {activeCauses.length === 0 ? (
          <div
            className={`rounded-2xl border p-6 text-sm ${
              isLightMode
                ? 'vtx-empty-panel text-[var(--text-muted-1)]'
                : 'border-white/20 bg-black/25 text-[var(--text-muted-1)]'
            }`}
          >
            <p>No active campaigns right now. Every listed cause has reached its funding goal.</p>
            <Link
              to="/causes/completed"
              className="mt-4 inline-flex min-h-10 items-center rounded-full border border-emerald-300/70 bg-[linear-gradient(180deg,#3dffc4,#23d78f)] px-4 py-2 text-xs font-semibold text-[#032316] shadow-[0_0_22px_rgba(51,255,178,0.28)]"
            >
              View completed campaigns
            </Link>
          </div>
        ) : null}
        {activeCauses.map((match, index) => {
          const cause = apiRowToShowcaseCause(match, index);
          return (
            <CauseCard
              key={match.id}
              cause={cause}
              isLightMode={isLightMode}
              isAdmin={isAdmin}
              detailCauseId={match.id}
              imageUrl={match.image_url}
              disbursedEth={match.disbursed_eth}
              donatedEth={match.donated_eth}
              remainingEth={match.remaining_eth}
              goalEth={match.goal_eth}
              utilizationPct={match.utilization_pct}
              fundsMatched={match.funds_matched}
            />
          );
        })}
        {isAdmin ? <AddCauseCard isLightMode={isLightMode} /> : null}
      </div>
    </div>
  );
}
