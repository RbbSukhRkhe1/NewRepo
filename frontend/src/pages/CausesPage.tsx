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
      className={`vtx-surface rounded-3xl border p-6 md:p-7 ${tagStyle(cause.accent, 'frame', isLightMode)}`}
    >
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:items-start">
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border-chrome-2)] bg-black/20">
          <img
            src={displayHero}
            alt=""
            referrerPolicy="no-referrer"
            className="aspect-[4/3] w-full object-cover"
            onError={() => setFailedHeroKey(heroFailureKey)}
          />
          <span
            className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
              isLightMode ? 'bg-white/90 text-emerald-900' : 'bg-black/55 text-emerald-200'
            }`}
          >
            {cause.sectionLabel}
          </span>
        </div>

        <div className={`vtx-glass-inset p-5 ${tagStyle(cause.accent, 'story', isLightMode)}`}>
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
                  ? 'border border-[var(--glass-border)] bg-white/60 text-[var(--text-muted-1)]'
                  : 'border border-[var(--glass-border)] bg-[var(--overlay-surface-soft)] text-[var(--text-muted-2)]'
              }`}
            >
              {cause.donors} donor{cause.donors === 1 ? '' : 's'}
            </span>
            {cause.daysLeft != null ? (
              <span
                className={`rounded-full px-2.5 py-1 ${
                  isLightMode
                    ? 'border border-[var(--glass-border)] bg-white/60 text-[var(--text-muted-1)]'
                    : 'border border-[var(--glass-border)] bg-[var(--overlay-surface-soft)] text-[var(--text-muted-2)]'
                }`}
              >
                {cause.daysLeft} days left
              </span>
            ) : null}
            <span
              className={`rounded-full px-2.5 py-1 ${
                isLightMode
                  ? 'border border-[var(--glass-border)] bg-white/60 text-[var(--text-muted-1)]'
                  : 'border border-[var(--glass-border)] bg-[var(--overlay-surface-soft)] text-[var(--text-muted-2)]'
              }`}
            >
              {cause.locationTag}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 ${
                isLightMode
                  ? 'border border-[var(--glass-border)] bg-white/60 text-[var(--text-muted-1)]'
                  : 'border border-[var(--glass-border)] bg-[var(--overlay-surface-soft)] text-[var(--text-muted-2)]'
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

          {hasUtil ? (
            <div className="mt-4 max-w-[14rem]">
              <CauseFundingDonut
                raisedEth={disbursedEth as number}
                goalEth={Math.max(donatedEth ?? 0, 0.0001)}
                isLightMode={isLightMode}
                compact
              />
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              to={actionHref}
              className="inline-flex min-h-11 items-center rounded-full border border-emerald-300/70 bg-[linear-gradient(180deg,#3dffc4,#23d78f)] px-6 py-2 text-sm font-semibold text-[#032316] shadow-[0_0_22px_rgba(51,255,178,0.28)]"
            >
              {actionLabel}
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
              Goal {goalEth?.toFixed(2) ?? '0.00'} ETH
            </span>
            {fundsMatched ? (
              <span
                className={`rounded-full px-2 py-1 ${
                  isLightMode
                    ? 'border border-cyan-600/30 bg-cyan-600/10 text-cyan-800'
                    : 'border border-cyan-400/30 bg-cyan-500/10 text-cyan-200'
                }`}
              >
                Funds matched on-chain
              </span>
            ) : null}
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
      className={`flex min-h-[18rem] flex-col items-center justify-center rounded-3xl border border-dashed p-8 text-center transition-[border-color,background-color,box-shadow] duration-200 ${
        isLightMode
          ? 'border-emerald-500/45 bg-emerald-50/40 hover:border-emerald-600/55 hover:bg-emerald-50/70'
          : 'border-emerald-400/35 bg-emerald-500/[0.04] hover:border-emerald-400/55 hover:bg-emerald-500/[0.08]'
      }`}
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
        {activeCauses.length === 0 ? (
          <div
            className={`rounded-2xl border p-6 text-sm ${
              isLightMode
                ? 'border-[rgba(164,184,207,0.45)] bg-white/80 text-[var(--text-muted-1)]'
                : 'border-white/20 bg-black/25 text-[var(--text-muted-1)]'
            }`}
          >
            <p>No active campaigns right now — every listed cause has reached its funding goal.</p>
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
