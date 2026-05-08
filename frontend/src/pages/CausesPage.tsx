import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

type ShowcaseCause = {
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
    section: 'urgent',
    sectionLabel: 'Urgent',
    storyTitle: 'Students First',
    storyBody: 'Verified beneficiaries and transparent fund flow powered by on-chain records.',
    title: 'Students First',
    subtitle: 'Providing mental health support for students under pressure and burnout.',
    donors: 174,
    daysLeft: 5,
    locationTag: 'Sydney, AU',
    categoryTag: 'Mental Health',
    progressPct: 0,
    progressLabel: '0%',
    amountLabel: '0.00 ETH raised of 10.00 ETH goal',
    accent: 'orange',
  },
  {
    section: 'completed',
    sectionLabel: 'Completed',
    storyTitle: 'Children & Education',
    storyBody: 'Verified beneficiaries and transparent fund flow powered by on-chain records.',
    title: 'Heart Break',
    subtitle: 'Supporting children with safe learning spaces and daily essentials.',
    donors: 180,
    daysLeft: 6,
    locationTag: 'Brisbane, AU',
    categoryTag: 'Education',
    progressPct: 100,
    progressLabel: '100%',
    amountLabel: 'GOAL REACHED - EXPANDING IMPACT',
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

function CauseCard({ cause, isLightMode }: { cause: ShowcaseCause; isLightMode: boolean }) {
  const accentText =
    cause.accent === 'orange'
      ? isLightMode
        ? 'text-amber-700'
        : 'text-amber-300'
      : isLightMode
        ? 'text-emerald-700'
        : 'text-emerald-300';

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

      <div className="grid gap-4 md:grid-cols-[230px_1fr] md:gap-6">
        <div className={`rounded-2xl border p-5 ${tagStyle(cause.accent, 'story', isLightMode)}`}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted-1)]">Impact story</p>
          <h3 className="mt-2 text-xl font-semibold leading-tight text-[var(--text-high-3)]">{cause.storyTitle}</h3>
          <p className="mt-2 text-sm leading-7 text-[var(--text-muted-1)]">{cause.storyBody}</p>
        </div>

        <div>
          <h2 className="text-3xl font-bold leading-tight tracking-[-0.01em] text-[var(--text-high-3)] md:text-[2.1rem]">{cause.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-muted-1)] md:text-base">{cause.subtitle}</p>

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
            <p className={`font-semibold ${accentText}`}>{cause.progressLabel}</p>
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted-2)]">{cause.amountLabel}</p>
          </div>
          <div className={`mt-2 h-2 rounded-full ${isLightMode ? 'bg-slate-200' : 'bg-black/40'}`}>
            <div
              className={`h-full rounded-full bg-gradient-to-r ${tagStyle(cause.accent, 'progress', isLightMode)}`}
              style={{ width: `${cause.progressPct}%` }}
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              to="/donate"
              className="inline-flex min-h-11 items-center rounded-full border border-emerald-300/70 bg-[linear-gradient(180deg,#3dffc4,#23d78f)] px-6 py-2 text-sm font-semibold text-[#032316] shadow-[0_0_22px_rgba(51,255,178,0.28)]"
            >
              DONATE NOW
            </Link>
            <Link
              to="/donate"
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

export function CausesPage() {
  const [isLightMode, setIsLightMode] = useState(
    () => typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light',
  );

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => setIsLightMode(root.getAttribute('data-theme') === 'light');
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
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
        {causes.map((cause) => (
          <CauseCard key={`${cause.section}-${cause.title}`} cause={cause} isLightMode={isLightMode} />
        ))}
      </div>
    </div>
  );
}
