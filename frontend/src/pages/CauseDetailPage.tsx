import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { resolveCauseHeroUrl } from '../lib/causeHeroImages';
import { useIsLightMode } from '../lib/useIsLightMode';
import { useAuth } from '../context/AuthContext';
import { PrimaryButton, SectionHeader, SurfaceCard } from '../components/ui';
import { CauseFundingDonut } from '../components/CauseFundingDonut';

type Cause = {
  id: number;
  title: string;
  description: string;
  goal_eth: number;
  raised_eth: number;
  disbursed_eth: number;
  donated_eth: number;
  remaining_eth: number;
  utilization_pct: number;
  funds_matched?: boolean;
  image_url?: string | null;
};

type CauseDetailCopy = {
  about: string;
  whatFundsCover: string[];
  milestones: string[];
  verification: string[];
};

const QUICK_AMOUNTS = ['0.05', '0.1', '0.25', '0.5'] as const;

function toSpendTitle(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('scholarship')) return 'Scholarships';
  if (t.includes('school supplies') || t.includes('books') || t.includes('uniform') || t.includes('stationery')) return 'Supplies';
  if (t.includes('connectivity') || t.includes('data plan') || t.includes('hotspot') || t.includes('learning lab')) return 'Connectivity';
  if (t.includes('mentor') || t.includes('tutor')) return 'Mentorship';
  if (t.includes('housing') || t.includes('shelter') || t.includes('accommodation')) return 'Housing';
  if (t.includes('counselling') || t.includes('counsel')) return 'Counselling';
  if (t.includes('medical') || t.includes('clinic') || t.includes('care')) return 'Medical';
  if (t.includes('food') || t.includes('water') || t.includes('hygiene')) return 'Essentials';
  if (t.includes('transport') || t.includes('evacuation')) return 'Transport';
  if (t.includes('repair') || t.includes('rebuilding') || t.includes('tools')) return 'Recovery';
  if (t.includes('equipment') || t.includes('monitor') || t.includes('pump')) return 'Equipment';
  if (t.includes('maintenance') || t.includes('compliance') || t.includes('calibration')) return 'Maintenance';
  if (t.includes('mutual-aid') || t.includes('mutual aid') || t.includes('grant')) return 'Mutual Aid';
  if (t.includes('legal') || t.includes('identity') || t.includes('admin')) return 'Legal Aid';
  return 'Program';
}

function impactUnitForCause(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('education')) return 'learning packs';
  if (t.includes('hospital')) return 'care kits';
  if (t.includes('disaster')) return 'relief packs';
  if (t.includes('war')) return 'aid bundles';
  if (t.includes('lgbt')) return 'support sessions';
  return 'support units';
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function pieSlicePath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polarToCartesian(cx, cy, r, startDeg);
  const end = polarToCartesian(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

const URGENCY_BY_SLICE = ['Peak priority', 'Core route', 'Stable lane', 'Support layer'] as const;

function truncateChip(text: string, max = 30) {
  const t = text.trim();
  if (t.length <= max) return t;
  let cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  if (sp > 14) cut = cut.slice(0, sp);
  return `${cut}…`;
}

function IconZapTiny({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden>
      <path
        d="M9 1.5 4.5 9h4l-.5 6L13 8H9z"
        fill="currentColor"
        opacity={0.9}
      />
    </svg>
  );
}

function IconShieldCheckTiny({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden>
      <path
        d="M8 1.75 13 4v4c0 3.25-2.12 6.06-5 7-2.88-.94-5-3.75-5-7V4z"
        stroke="currentColor"
        strokeWidth="1.125"
        strokeLinejoin="round"
      />
      <path d="m5 8 2 2 3.5-3.75" stroke="currentColor" strokeWidth="1.125" strokeLinecap="round" />
    </svg>
  );
}

function IconTargetTiny({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.75" stroke="currentColor" strokeWidth="1.125" />
      <circle cx="8" cy="8" r="2.75" stroke="currentColor" strokeWidth="1.125" />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
    </svg>
  );
}

function IconEthDiamondTiny({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden>
      <path
        d="M3 8 8 2.75 13 8 8 13z"
        stroke="currentColor"
        strokeWidth="1.125"
        strokeLinejoin="round"
      />
      <path d="M3 8h10M8 2.75V13" stroke="currentColor" strokeWidth="1.125" strokeOpacity={0.5} />
    </svg>
  );
}

function IconPieTiny({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden>
      <path
        d="M14 9A7 7 0 1 1 7 2v7z"
        stroke="currentColor"
        strokeWidth="1.125"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const DETAIL_COPY_BY_TITLE: Record<string, CauseDetailCopy> = {
  LGBTQs: {
    about:
      'Queer and trans communities deserve fast, practical relief: safe housing, trauma-informed counselling, crisis support, and community mutual aid. Vaultex routes every gift on-chain—so you can trace funding from wallet to outcome, not guesswork.',
    whatFundsCover: [
      'Emergency accommodation vouchers and short-term housing support',
      'Trauma-informed counselling sessions and crisis hotlines',
      'Legal/admin support for safety planning and identity documentation',
      'Community mutual-aid grants for food, transport, and essentials',
    ],
    milestones: [
      '50 emergency nights of safe housing funded',
      '120 counselling sessions with vetted providers',
      '200 mutual-aid microgrants to verified recipients',
    ],
    verification: [
      'Beneficiary verification before disbursement',
      'Every donation and payout recorded in the ledger',
      'Clear monthly recap of allocations and remaining budget',
    ],
  },
  War: {
    about:
      'Emergency relief for families under conflict: medical supplies, evacuation help, shelter, and essentials. Aid moves with transparent records—so “black box” logistics give way to accountable, donor-visible support.',
    whatFundsCover: [
      'Medical kits, trauma care supplies, and local clinic support',
      'Shelter and temporary accommodation for displaced families',
      'Evacuation/transport assistance and family reunification support',
      'Essential goods: food, water, hygiene, and winter supplies',
    ],
    milestones: [
      'Deliver 500 family relief packs through verified partners',
      'Support 3 clinics with critical medical restocks',
      'Provide 200 safe-transport vouchers for displacement routes',
    ],
    verification: [
      'Partner vetting and documented distribution plans',
      'Ledger-linked disbursements with recipient category labels',
      'Post-disbursement updates with proof artifacts where safe',
    ],
  },
  Disaster: {
    about:
      'When climate and disasters strike, speed matters—shelter, food and water, power where it counts, and early rebuilding. Every deployment pairs rapid assistance with a public ledger you can actually audit.',
    whatFundsCover: [
      'Emergency shelter materials and short-term housing support',
      'Food, clean water, and sanitation supplies',
      'Power/communications: charging stations, generators, and fuel',
      'Early recovery: repairs, tools, and rebuilding essentials',
    ],
    milestones: [
      'Deploy a 72-hour rapid-response kit for 1,000 people',
      'Restore clean water access for 3 affected communities',
      'Fund 100 home-repair microgrants for immediate recovery',
    ],
    verification: [
      'Pre-approved vendor list and price caps where possible',
      'Ledger entries tagged by disaster event and category',
      'Receipts and delivery confirmations attached to updates',
    ],
  },
  Hospital: {
    about:
      'Strengthens frontline hospitals: critical equipment, patient transport and care support, and compliance-safe maintenance. Purchasing and payouts stay visible—so donors see shortages addressed with receipts, not rhetoric.',
    whatFundsCover: [
      'Critical equipment: monitors, infusion pumps, and consumables',
      'Patient support funds for essential care and transport',
      'Staff support resources during surge periods',
      'Maintenance, calibration, and safety compliance costs',
    ],
    milestones: [
      'Purchase and deploy essential equipment bundles for one ward',
      'Fund 150 patient transport/support vouchers',
      'Publish an outcomes recap with procurement list and totals',
    ],
    verification: [
      'Procurement list with unit pricing and supplier details',
      'Disbursements tied to specific purchase batches',
      'Quarterly audit-friendly summary (totals + remaining budget)',
    ],
  },
  Education: {
    about:
      'Widens access to learning: scholarships, supplies, devices, and connectivity for students who need it most. Budget lines stay explicit—see what was funded, for whom, and when—straight from the ledger.',
    whatFundsCover: [
      'Scholarships and fee support for underserved students',
      'School supplies: books, uniforms, stationery, and devices',
      'Connectivity: data plans, hotspots, and shared learning labs',
      'Mentorship and tutoring programs with verified providers',
    ],
    milestones: [
      'Fund 50 school supply bundles for the next term',
      'Provide 30 devices + connectivity for remote learners',
      'Sponsor 100 hours of tutoring and mentorship sessions',
    ],
    verification: [
      'Eligibility checks and documented distribution criteria',
      'Ledger-tracked disbursements by category',
      'Term-by-term impact recap (recipients served + spend breakdown)',
    ],
  },
};

export function CauseDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const isLightMode = useIsLightMode();
  const [cause, setCause] = useState<Cause | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [amount, setAmount] = useState('0.1');
  const [disburseMessage, setDisburseMessage] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeSlice, setActiveSlice] = useState<number | null>(null);
  // Browser timeout ids are numbers; keep it explicit to avoid Node Timeout typing.
  const dashboardHoverLeaveRef = useRef<number | null>(null);
  /** Track which hero URL failed; when `cause`/`heroSrc` changes, key mismatch clears failure without an effect. */
  const [failedHeroKey, setFailedHeroKey] = useState<string | null>(null);

  function cancelImpactSliceDeferClear() {
    if (dashboardHoverLeaveRef.current != null) {
      window.clearTimeout(dashboardHoverLeaveRef.current);
      dashboardHoverLeaveRef.current = null;
    }
  }

  function focusImpactSlice(next: number) {
    cancelImpactSliceDeferClear();
    setActiveSlice(next);
  }

  function deferClearImpactSlice() {
    cancelImpactSliceDeferClear();
    dashboardHoverLeaveRef.current = window.setTimeout(() => {
      dashboardHoverLeaveRef.current = null;
      setActiveSlice(null);
    }, 220);
  }

  function clearImpactSliceNow() {
    cancelImpactSliceDeferClear();
    setActiveSlice(null);
  }

  useEffect(() => {
    return () => {
      if (dashboardHoverLeaveRef.current != null) window.clearTimeout(dashboardHoverLeaveRef.current);
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    apiJson<Cause>(`/causes/${id}`)
      .then(setCause)
      .catch((e: Error) => setErr(e.message));
  }, [id]);

  const isAdmin = user?.role === 'admin';
  const canDonate = user?.role === 'donor' && user.anvilIndex != null;

  async function donate(e: React.FormEvent) {
    e.preventDefault();
    if (!cause) return;
    setMsg(null);
    setBusy(true);
    try {
      const r = await apiJson<{ txHash: string }>('/donate', {
        method: 'POST',
        body: JSON.stringify({ causeId: cause.id, amountEth: amount }),
      });
      setMsg(`Sent · ${r.txHash.slice(0, 14)}…`);
      const updated = await apiJson<Cause>(`/causes/${cause.id}`);
      setCause(updated);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function disburse(e: React.FormEvent) {
    e.preventDefault();
    if (!cause || !validAmount) return;
    setMsg(null);
    setBusy(true);
    try {
      const r = await apiJson<{ txHash: string }>(`/causes/${cause.id}/disburse`, {
        method: 'POST',
        body: JSON.stringify({ amountEth: amount, message: disburseMessage }),
      });
      setMsg(`Disbursed · ${r.txHash.slice(0, 14)}…`);
      const updated = await apiJson<Cause>(`/causes/${cause.id}`);
      setCause(updated);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  if (err || !cause) {
    return (
      <div className="px-4 py-12 text-center text-[var(--text-muted-2)]">
        {err || 'Loading…'}{' '}
        <Link to="/causes" className="text-cyan-400">
          Back
        </Link>
      </div>
    );
  }

  const pct = Math.min(100, Math.max(0, cause.utilization_pct ?? 0));
  const heroSrc = resolveCauseHeroUrl(cause.title, cause.image_url);
  const heroFailureKey = `${cause.id}:${heroSrc ?? ''}`;
  const heroFailed = failedHeroKey === heroFailureKey;
  const detailCopy = DETAIL_COPY_BY_TITLE[cause.title];
  const remainingEth = Math.max(0, cause.remaining_eth ?? 0);
  const donatedEth = cause.donated_eth ?? cause.raised_eth ?? 0;
  const parsedAmount = Number.parseFloat(amount || '0');
  const validAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const unitLabel = impactUnitForCause(cause.title);
  const estUnits = Math.max(1, Math.round((validAmount ? parsedAmount : 0.1) * 12));
  const estPeople = Math.max(1, Math.round((validAmount ? parsedAmount : 0.1) * 8));
  const estGas = validAmount ? 0.0012 + parsedAmount * 0.002 : 0.0012;
  const strokeLength = 283;
  const progressStroke = (pct / 100) * strokeLength;

  const chartWeights = [38, 27, 21, 14];
  const allocationRows = (detailCopy?.whatFundsCover ?? []).map((label, idx) => ({
    label,
    pct: chartWeights[idx] ?? 10,
  }));
  const slicePalette = ['#22c55e', '#06b6d4', '#14b8a6', '#84cc16'];
  const dashboardRows = allocationRows.map((item, i) => {
    const title = toSpendTitle(item.label);
    const allocationEth = (cause.goal_eth * item.pct) / 100;
    const impactMetric =
      i === 0
        ? `${Math.max(10, Math.round(allocationEth * 35))} families supported`
        : i === 1
          ? `${Math.max(20, Math.round(allocationEth * 90))} sessions funded`
          : i === 2
            ? `${Math.max(12, Math.round(allocationEth * 45))} cases covered`
            : `${Math.max(60, Math.round(allocationEth * 140))} kits delivered`;
    return {
      ...item,
      title,
      allocationEth,
      impactMetric,
    };
  });
  const pieHoleCategory =
    activeSlice != null ? toSpendTitle(allocationRows[activeSlice]?.label ?? '') : '';
  const pieHoleSubtitle =
    activeSlice == null ? 'Pick a slice' : pieHoleCategory.length > 16 ? `${pieHoleCategory.slice(0, 14)}…` : pieHoleCategory;

  return (
    <div className="relative mx-auto w-full max-w-6xl px-4 py-3 sm:px-5 sm:py-4 md:py-5">
      {isLightMode ? (
        <>
          <div
            className="pointer-events-none absolute -left-[22%] top-[-6rem] z-0 h-[26rem] w-[26rem] rounded-full bg-emerald-600/[0.38] blur-[115px]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-[20%] top-[12%] z-0 h-[30rem] w-[30rem] rounded-full bg-cyan-600/[0.32] blur-[115px]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute bottom-[-10rem] left-1/2 z-0 h-[22rem] w-[min(100%,44rem)] -translate-x-1/2 rounded-full bg-teal-600/[0.28] blur-[100px]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute left-[38%] top-[32%] z-0 h-[18rem] w-[18rem] -translate-x-1/2 rounded-full bg-emerald-500/[0.2] blur-[90px]"
            aria-hidden
          />
        </>
      ) : null}
      <div className="relative z-[1]">
      <Link
        to="/causes"
        className={`inline-flex items-center gap-2 font-medium ${
          isLightMode
            ? 'text-[14px] text-[var(--text-muted-1)] tracking-tight hover:text-emerald-900/90'
            : 'text-sm text-[var(--accent-bright-2)]'
        }`}
      >
        ← All causes
      </Link>
      <div
        className={`mt-2 sm:mt-3 ${isLightMode ? '[&_h1]:text-[clamp(1.5rem,0.9rem+1.8vw,1.875rem)] [&_h1]:font-semibold [&_h1]:tracking-[-0.03em]' : '[&_h1]:text-[1.65rem] [&_h1]:font-bold [&_h1]:leading-tight sm:[&_h1]:text-3xl'}`}
      >
        <SectionHeader title={cause.title} />
      </div>

      <div
        className={`relative z-[1] mt-4 overflow-hidden rounded-2xl border sm:mt-5 ${
          isLightMode ? 'border-emerald-400/35 bg-slate-100' : 'border-cyan-500/20 bg-slate-950/70'
        } aspect-[2.2/1] max-h-[min(42vh,24rem)] min-h-[11rem] w-full`}
      >
        {heroSrc && !heroFailed ? (
          <img
            src={heroSrc}
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
            onError={() => setFailedHeroKey(heroFailureKey)}
          />
        ) : (
          <>
            <img
              src="/samples/placeholder.svg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 z-[1] border-t border-white/10 bg-black/55 px-4 py-3 backdrop-blur-sm">
              <p className="mx-auto max-w-lg text-center text-sm text-slate-200">
                {heroFailed
                  ? 'Image could not be loaded. Edit the cause hero URL or try another link.'
                  : 'No hero image for this cause yet. Admins can set an image URL when creating a cause.'}
              </p>
            </div>
          </>
        )}
      </div>
      <p className="sr-only">Funding goal visuals and donation actions for {cause.title}</p>

      {detailCopy ? (
        <div
          className={`relative mt-4 min-w-0 overflow-hidden rounded-2xl border sm:mt-5 ${
            isLightMode
              ? 'border-emerald-400/45 bg-[linear-gradient(180deg,#ecfdf5_0%,#d1fae5_46%,#a7f3d0_100%)] shadow-[0_36px_80px_-42px_rgba(6,78,59,0.38),0_0_140px_-42px_rgba(16,185,129,0.42),0_0_0_1px_rgba(255,255,255,0.45)_inset,0_1px_0_rgba(255,255,255,0.65)_inset] ring-1 ring-emerald-500/35 backdrop-blur-[3px]'
              : 'border-cyan-500/25 bg-[linear-gradient(165deg,rgba(10,28,46,0.98)_0%,rgba(6,14,26,1)_52%,rgba(8,36,54,0.92)_100%)] shadow-[inset_0_1px_0_rgba(34,211,238,0.12)]'
          }`}
        >
          <div
            className={`border-b px-3 py-3 sm:px-4 sm:py-3.5 ${isLightMode ? 'border-emerald-400/35 bg-white/30 backdrop-blur-sm' : 'border-cyan-400/14'}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
              <div className="min-w-0">
                <p
                  className={`font-semibold uppercase ${
                    isLightMode
                      ? 'text-[10px] tracking-[0.2em] text-emerald-800/82 sm:text-[11px] sm:tracking-[0.22em]'
                      : 'text-[9px] tracking-[0.18em] text-emerald-300/85 sm:text-[10px] sm:tracking-[0.2em]'
                  }`}
                >
                  Impact snapshot
                </p>
                <h2
                  className={`font-semibold tracking-tight ${isLightMode ? 'mt-0.5 text-lg text-neutral-900/92 sm:text-xl' : 'mt-0.5 text-base text-white sm:text-lg'}`}
                >
                  Your Impact Dashboard
                </h2>
                <p
                  className={`mt-1 max-w-2xl ${isLightMode ? 'text-[11px] leading-snug text-[var(--text-muted-1)] sm:text-[12px]' : 'text-[10px] leading-snug text-cyan-50/58 sm:text-[11px]'}`}
                >
                  How this goal is earmarked across programs—pie and cards highlight together when you hover or keyboard-focus.
                </p>
              </div>
              <span
                className={`shrink-0 self-start rounded-md px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] sm:rounded-lg sm:px-[0.6875rem] sm:py-2 sm:text-[10px] sm:tracking-[0.14em] ${
                  isLightMode
                    ? 'border border-emerald-900/14 bg-emerald-50 text-emerald-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] ring-1 ring-emerald-500/18'
                    : 'border border-cyan-400/35 bg-white/[0.06] text-cyan-50'
                }`}
              >
                Donor view
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4 px-3 py-3 sm:gap-5 sm:px-4 sm:py-4 md:py-5">
            <div
              className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,420px),minmax(0,1fr)] lg:gap-7 lg:items-start"
              onMouseEnter={cancelImpactSliceDeferClear}
              onMouseLeave={deferClearImpactSlice}
            >
              <aside
                className={`relative flex min-h-0 min-w-0 flex-col rounded-xl px-4 py-4 sm:rounded-2xl sm:px-5 sm:py-5 ${
                  isLightMode
                    ? 'border border-emerald-400/40 bg-gradient-to-br from-emerald-50/90 via-teal-50/80 to-cyan-50/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_18px_52px_-28px_rgba(6,95,70,0.22),0_0_72px_-28px_rgba(45,212,191,0.28)] ring-1 ring-emerald-300/45'
                    : 'border border-cyan-500/40 bg-black/25 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.08)]'
                }`}
              >
                {isLightMode ? (
                  <div
                    className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-[0.55]"
                    style={{
                      background:
                        'radial-gradient(ellipse 92% 70% at 50% -15%,rgba(16,185,129,0.38),transparent 58%), radial-gradient(ellipse 70% 55% at 80% 100%,rgba(6,182,212,0.28),transparent 62%)',
                    }}
                    aria-hidden
                  />
                ) : (
                  <div
                    className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-[0.22]"
                    style={{
                      background:
                        'radial-gradient(ellipse 92% 80% at 50% -10%,rgba(52,233,241,0.28),transparent 68%), radial-gradient(ellipse 70% 60% at 50% 100%,rgba(16,185,129,0.16),transparent 72%)',
                    }}
                    aria-hidden
                  />
                )}
                <div className="relative z-[1] flex min-h-0 min-w-0 w-full flex-col items-stretch gap-4 lg:flex-row lg:gap-5">
                  <div className="contain-layout flex shrink-0 justify-center lg:flex-[0_0_auto] lg:items-center lg:justify-start lg:self-start lg:py-0">
                    <div
                      className={
                        isLightMode
                          ? 'relative mx-auto flex max-w-[200px] justify-center drop-shadow-[0_24px_50px_-14px_rgba(5,100,80,0.45)] sm:max-w-[220px]'
                          : undefined
                      }
                    >
                      {isLightMode ? (
                        <div
                          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[125%] w-[125%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(13,148,136,0.55)_0%,rgba(20,184,166,0.35)_38%,rgba(255,255,255,0)_72%)] opacity-95 blur-2xl"
                          aria-hidden
                        />
                      ) : null}
                    <svg
                      viewBox="0 0 200 200"
                      className="block h-40 w-full max-w-[200px] flex-none sm:h-44 sm:max-w-[220px]"
                      aria-label="Fund allocation pie chart"
                      style={{ contain: 'paint' }}
                    >
                      {allocationRows.map((item, i) => {
                        const start = -90 + allocationRows.slice(0, i).reduce((sum, row) => sum + row.pct, 0) * 3.6;
                        const end = start + item.pct * 3.6;
                        return (
                          <path
                            key={`slice-${item.label}`}
                            d={pieSlicePath(100, 100, 78, start, end)}
                            fill={slicePalette[i % slicePalette.length]}
                            className="cursor-pointer transition-opacity duration-150 ease-out motion-reduce:transition-none"
                            style={{
                              opacity: activeSlice !== null && activeSlice !== i ? 0.42 : 1,
                            }}
                            onMouseEnter={() => focusImpactSlice(i)}
                            onFocus={() => focusImpactSlice(i)}
                            onBlur={clearImpactSliceNow}
                            tabIndex={0}
                            role="img"
                            aria-label={`${toSpendTitle(item.label)} ${item.pct}%`}
                          />
                        );
                      })}
                      <circle cx="100" cy="100" r="41" fill="var(--surface-panel-overlay)" />
                      <text x="100" y="92" textAnchor="middle" className="fill-[var(--text-high-3)] text-[0.8rem] font-bold">
                        {activeSlice != null ? `${allocationRows[activeSlice]?.pct}%` : 'Goal'}
                      </text>
                      <text x="100" y="111" textAnchor="middle" className="fill-[var(--text-muted-1)] text-[10px]">
                        {activeSlice != null ? pieHoleSubtitle : 'allocation'}
                      </text>
                    </svg>
                    </div>
                  </div>

                  <div
                    className={`contain-layout relative flex min-h-0 min-w-0 w-full flex-col justify-start gap-2 overflow-hidden rounded-lg border px-3 py-2.5 backdrop-blur-md sm:gap-2.5 sm:rounded-xl sm:px-3.5 sm:py-3 lg:flex-1 lg:self-start ${
                      isLightMode
                        ? 'border-emerald-400/45 bg-gradient-to-br from-white/95 to-emerald-100/85 shadow-[0_12px_40px_-16px_rgba(6,95,72,0.22),0_0_56px_-20px_rgba(20,184,166,0.32),inset_0_1px_0_rgba(255,255,255,0.85)] ring-1 ring-emerald-400/30'
                        : 'border-white/18 bg-gradient-to-br from-white/[0.13] via-cyan-500/[0.04] to-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_42px_-12px_rgba(34,211,238,0.32)] ring-1 ring-cyan-400/40'
                    }`}
                  >
                    {!isLightMode ? (
                      <div
                        className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-cyan-400/25 blur-2xl"
                        aria-hidden
                      />
                    ) : (
                      <div
                        className="pointer-events-none absolute -bottom-8 -left-8 h-[5.5rem] w-[5.5rem] rounded-full bg-emerald-500/50 blur-3xl"
                        aria-hidden
                      />
                    )}
                    <div
                      className={`relative z-[1] flex flex-wrap items-center justify-between gap-1.5 border-b pb-2 sm:pb-2.5 ${
                        isLightMode ? 'border-emerald-200/65' : 'border-white/24'
                      }`}
                    >
                      <p
                        className={`font-semibold uppercase tracking-[0.16em] ${
                          isLightMode ? 'text-[11px] text-emerald-900/82' : 'text-[10px] text-cyan-200'
                        }`}
                      >
                        Selected budget line
                      </p>
                      {activeSlice != null ? (
                        <span
                          className={`truncate font-semibold tracking-tight ${isLightMode ? 'max-w-[10rem] text-[13px] text-neutral-900/90 sm:max-w-[14rem]' : 'text-xs text-white'}`}
                          title={toSpendTitle(allocationRows[activeSlice]?.label ?? '')}
                        >
                          {toSpendTitle(allocationRows[activeSlice]?.label ?? '')}
                        </span>
                      ) : null}
                    </div>

                    <div
                      className={`relative z-[1] flex flex-col ${
                        isLightMode
                          ? 'min-h-[6.75rem] sm:min-h-[7.25rem] lg:min-h-[7.5rem]'
                          : 'min-h-[8.5rem] sm:min-h-[9rem] lg:min-h-[9.25rem]'
                      } ${activeSlice != null && dashboardRows[activeSlice] != null ? 'justify-start' : 'justify-center'}`}
                    >
                    {activeSlice != null && dashboardRows[activeSlice] != null ? (
                      <div className="flex flex-col gap-1.5 motion-reduce:transition-none sm:gap-2">
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ring-1 ${
                              isLightMode
                                ? 'bg-amber-500/15 text-amber-900 ring-amber-400/25'
                                : 'bg-amber-400/15 text-amber-100 ring-amber-400/25 shadow-[0_0_16px_-3px_rgba(251,191,36,0.35)]'
                            }`}
                          >
                            <IconZapTiny className="h-3 w-3 shrink-0 text-current opacity-90" />
                            {URGENCY_BY_SLICE[activeSlice % URGENCY_BY_SLICE.length]}
                          </span>
                          <span
                            className={`inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight tracking-wide ring-1 ${
                              isLightMode
                                ? 'bg-emerald-500/15 text-emerald-900 ring-emerald-400/25'
                                : 'bg-emerald-400/15 text-emerald-100 ring-emerald-400/25 shadow-[0_0_14px_-3px_rgba(52,211,153,0.28)]'
                            }`}
                          >
                            <IconShieldCheckTiny className="h-3 w-3 shrink-0 text-current opacity-90" />
                            <span className="min-w-0 truncate">
                              {truncateChip(detailCopy.verification[activeSlice % detailCopy.verification.length], 30)}
                            </span>
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div
                            className={`relative flex items-center gap-2 overflow-hidden rounded-lg border px-2.5 py-2 ring-1 ${
                              isLightMode
                                ? 'border-[var(--border-chrome-2)] bg-white/95 shadow-sm ring-black/10'
                                : 'border-white/14 bg-black/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-cyan-400/25'
                            }`}
                          >
                            {!isLightMode ? (
                              <div
                                className="pointer-events-none absolute inset-0 bg-cyan-500/10 opacity-100"
                                aria-hidden
                              />
                            ) : null}
                            <IconEthDiamondTiny
                              className={`relative z-[1] h-4 w-4 shrink-0 ${isLightMode ? 'text-emerald-950' : 'text-cyan-400'}`}
                            />
                            <div className="relative z-[1] min-w-0">
                              <p
                                className={`text-[9px] font-semibold uppercase tracking-[0.1em] ${
                                  isLightMode ? 'text-[var(--text-muted-2)]' : 'text-cyan-200/92'
                                }`}
                              >
                                Allocated ETH
                              </p>
                              <p
                                className={`font-mono text-sm font-semibold tabular-nums tracking-tight ${
                                  isLightMode ? 'text-[var(--text-high-3)]' : 'text-white'
                                }`}
                              >
                                {dashboardRows[activeSlice].allocationEth.toFixed(3)}
                              </p>
                            </div>
                          </div>

                          <div
                            className={`relative flex items-center gap-2 overflow-hidden rounded-lg border px-2.5 py-2 ring-1 ${
                              isLightMode
                                ? 'border-[var(--border-chrome-2)] bg-white/95 ring-black/10'
                                : 'border-white/14 bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-cyan-400/20'
                            }`}
                          >
                            {!isLightMode ? (
                              <div
                                className="pointer-events-none absolute inset-0 bg-emerald-500/8"
                                aria-hidden
                              />
                            ) : null}
                            <IconPieTiny
                              className={`relative z-[1] h-4 w-4 shrink-0 ${isLightMode ? 'text-emerald-950' : 'text-cyan-400'}`}
                            />
                            <div className="relative z-[1] min-w-0">
                              <p
                                className={`text-[9px] font-semibold uppercase tracking-[0.1em] ${
                                  isLightMode ? 'text-[var(--text-muted-2)]' : 'text-cyan-200/88'
                                }`}
                              >
                                Slice share
                              </p>
                              <p
                                className={`text-sm font-bold tabular-nums ${isLightMode ? 'text-[var(--text-high-3)]' : 'text-white'}`}
                              >
                                {allocationRows[activeSlice].pct}%
                              </p>
                            </div>
                          </div>
                        </div>

                        <div
                          className={`relative flex items-start gap-2 overflow-hidden rounded-lg border px-2.5 py-2 ring-1 ${
                            isLightMode
                              ? 'border-emerald-200/80 bg-emerald-50/70 ring-emerald-500/20'
                              : 'border-cyan-400/30 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(34,211,238,0.12)] ring-cyan-400/25'
                          }`}
                        >
                          {!isLightMode ? (
                            <div
                              className="pointer-events-none absolute -right-4 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full bg-emerald-400/20 blur-2xl"
                              aria-hidden
                            />
                          ) : null}
                          <IconTargetTiny
                            className={`relative z-[1] mt-0.5 h-4 w-4 shrink-0 ${isLightMode ? 'text-emerald-700' : 'text-cyan-400'}`}
                          />
                          <div className="relative z-[1] min-w-0">
                            <p
                              className={`text-[9px] font-semibold uppercase tracking-[0.1em] ${
                                isLightMode ? 'text-[var(--text-muted-2)]' : 'text-cyan-200/90'
                              }`}
                            >
                              Impact
                            </p>
                            <p
                              className={`text-xs font-semibold leading-snug ${
                                isLightMode ? 'text-[var(--text-high-3)]' : 'text-cyan-50'
                              }`}
                            >
                              {dashboardRows[activeSlice].impactMetric}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`relative z-[1] rounded-lg border border-dashed px-3 py-2.5 ${
                          isLightMode
                            ? 'border-emerald-300/55 bg-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]'
                            : 'border-cyan-500/25 bg-black/25'
                        }`}
                      >
                        <p
                          className={`text-center font-medium leading-snug ${
                            isLightMode ? 'text-[12px] text-[var(--text-muted-1)]' : 'text-[11px] text-cyan-100/80'
                          }`}
                        >
                          Select slice or row · ETH · share · impact · verification
                        </p>
                      </div>
                    )}
                    </div>
                  </div>
                </div>
              </aside>

              <div className="flex min-h-0 min-w-0 flex-col gap-3.5 sm:gap-4">
                <div
                  className={`font-semibold uppercase tracking-[0.14em] ${
                    isLightMode ? 'text-[12px] text-emerald-900/78' : 'text-[11px] text-cyan-300/62'
                  }`}
                >
                  Fund allocation impact
                </div>
                <ul className="grid min-h-0 min-w-0 list-none gap-2 p-0 md:gap-2.5">
                  {dashboardRows.map((row, i) => {
                    const isActive = activeSlice === i;
                    return (
                      <li key={`alloc-row-${row.label}`}>
                        <button
                          type="button"
                          tabIndex={0}
                          aria-label={`${row.title}, ${row.pct}% of goal, ${row.allocationEth.toFixed(2)} ETH toward goal`}
                          onMouseEnter={() => focusImpactSlice(i)}
                          onFocus={() => focusImpactSlice(i)}
                          onBlur={clearImpactSliceNow}
                          className={`flex w-full min-w-0 items-start gap-2.5 rounded-xl border px-3 py-2 text-left ring-2 ring-inset transition-[border-color,background-color,opacity,box-shadow] duration-150 ease-out will-change-[background-color] motion-reduce:transition-none sm:gap-3 sm:px-3.5 sm:py-2.5 ${
                            isLightMode
                              ? isActive
                                ? 'border-emerald-500/50 bg-emerald-50/95 shadow-[0_4px_22px_-14px_rgba(16,100,72,0.18),inset_0_0_0_1px_rgba(16,185,129,0.12)] ring-emerald-700/55'
                                : 'border-emerald-400/45 bg-emerald-50/70 shadow-[0_6px_22px_-16px_rgba(5,90,70,0.14)] ring-transparent hover:border-emerald-500/55 hover:bg-emerald-100/75 hover:shadow-[0_10px_32px_-14px_rgba(4,100,78,0.22)]'
                              : isActive
                                ? 'border-cyan-300/70 bg-emerald-500/[0.11] shadow-[inset_0_0_0_1px_rgba(34,211,238,0.22)] ring-cyan-400/92'
                                : 'border-[var(--border-chrome-2)]/92 bg-black/37 ring-transparent hover:bg-white/[0.05]'
                          }`}
                        >
                          <span
                            className="mt-0.5 h-9 w-1 shrink-0 rounded-full shadow-sm"
                            style={{ backgroundColor: slicePalette[i % slicePalette.length] }}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                              <span
                                className={`font-semibold ${isLightMode ? 'text-[15px] leading-snug text-neutral-900/92' : 'text-sm text-white'}`}
                              >
                                {row.title}
                              </span>
                              <span
                                className={`rounded-md px-1.5 py-0.5 font-semibold tabular-nums ring-1 ${
                                  isLightMode
                                    ? 'bg-emerald-900/[0.05] text-[12px] text-emerald-950/90 ring-emerald-900/10'
                                    : 'bg-black/45 text-[11px] text-cyan-100 ring-white/22'
                                }`}
                              >
                                {row.pct}%
                              </span>
                            </span>
                            <span
                              className={`mt-0.5 block leading-snug ${isLightMode ? 'text-[13px] text-[var(--text-muted-1)]' : 'text-xs text-cyan-100/68'}`}
                            >
                              {row.impactMetric}
                            </span>
                          </span>
                          <span className={`shrink-0 text-right`}>
                            <span
                              className={`block uppercase tracking-wide ${isLightMode ? 'text-[10px] text-[var(--text-muted-2)]' : 'text-[10px] text-cyan-200/62'}`}
                            >
                              ETH <span className="sr-only">toward goal</span>
                            </span>
                            <span
                              className={`font-mono font-semibold tabular-nums tracking-tight ${
                                isLightMode ? 'text-[0.95rem] text-neutral-900/90' : 'text-[0.9rem] text-cyan-50'
                              }`}
                            >
                              {row.allocationEth.toFixed(2)}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>

          <footer
            className={`relative border-t ${
              isLightMode
                ? 'border-emerald-400/35 bg-[linear-gradient(180deg,#d1fae5_0%,#ecfdf5_45%,#f0fdfa_100%)] px-4 pb-4 pt-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_-40px_72px_-44px_rgba(16,185,129,0.28)] sm:px-5 sm:pb-5 sm:pt-5'
                : 'border-white/26 bg-black/28 px-4 pb-5 pt-4 sm:px-5'
            }`}
          >
            <div
              className={`flex flex-wrap items-end justify-between gap-3 ${isLightMode ? 'pb-3 sm:pb-3.5' : 'pb-2.5'}`}
            >
              <h3
                className={`font-semibold uppercase tracking-[0.18em] ${
                  isLightMode ? 'text-[12px] tracking-[0.2em] text-emerald-950/88' : 'text-[11px] text-cyan-100/94'
                }`}
              >
                Cause overview
              </h3>
              <span
                className={`${
                  isLightMode
                    ? 'rounded-full bg-emerald-100/90 px-3.5 py-1.5 text-[11px] font-medium leading-none text-emerald-950/75 shadow-[0_4px_18px_-8px_rgba(5,120,90,0.22)] ring-1 ring-emerald-400/40'
                    : 'text-[10px] leading-none text-cyan-200/76'
                }`}
              >
                Plain-language brief
              </span>
            </div>
            <div
              className={`overflow-hidden rounded-2xl border backdrop-blur-md ${
                isLightMode
                  ? 'border-emerald-400/40 bg-[linear-gradient(180deg,#ecfdf5_0%,#d1fae5_40%,#a7f3d0_100%)] shadow-[0_28px_68px_-42px_rgba(6,78,59,0.3),0_0_80px_-38px_rgba(16,185,129,0.38),0_0_0_1px_rgba(255,255,255,0.38)_inset] ring-1 ring-emerald-500/35'
                  : 'rounded-xl border-white/14 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] ring-1 ring-cyan-400/15'
              }`}
            >
              <div className={isLightMode ? 'px-4 py-5 sm:px-7 sm:py-6' : 'px-3.5 py-4 sm:px-5 sm:py-5'}>
                <p
                  className={
                    isLightMode
                      ? 'max-w-[42rem] text-[15px] leading-[1.74] tracking-[-0.01em] text-neutral-700 sm:text-[15.5px]'
                      : 'text-[15px] leading-[1.7] text-cyan-50/[0.94]'
                  }
                >
                  {detailCopy.about}
                </p>
              </div>
              {detailCopy.milestones.length > 0 ? (
                <div
                  className={`border-t ${
                    isLightMode
                      ? 'relative border-emerald-400/35 bg-[linear-gradient(165deg,#bbf7d0_0%,#d1fae5_38%,#ecfdf5_100%)] px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] sm:px-7 sm:py-6'
                      : 'border-white/[0.08] bg-black/25 px-3.5 py-4 sm:px-5 sm:py-4'
                  }`}
                >
                  <p
                    className={`font-semibold uppercase tracking-[0.12em] ${
                      isLightMode ? 'text-[11px] tracking-[0.14em] text-emerald-950/82' : 'text-[10px] text-cyan-200/90'
                    }`}
                  >
                    Outcomes this pool is built for
                  </p>
                  <ul className="mt-3.5 list-none space-y-2 p-0 sm:space-y-2.5">
                    {detailCopy.milestones.map((line, idx) => (
                      <li
                        key={line}
                        className={`group flex items-start gap-2.5 rounded-xl px-2.5 py-2 transition-[background-color,box-shadow,border-color] duration-200 ${
                          isLightMode
                            ? 'border border-emerald-400/20 bg-white/40 text-[14px] leading-[1.45] text-neutral-800/95 hover:bg-white/70 hover:shadow-[0_8px_22px_-16px_rgba(5,100,75,0.22)]'
                            : 'border border-cyan-400/12 bg-white/[0.02] text-[13.5px] leading-[1.45] text-white/[0.92] hover:border-cyan-300/30 hover:bg-cyan-400/[0.04] hover:shadow-[0_0_22px_-12px_rgba(34,211,238,0.52)]'
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-semibold tabular-nums tracking-tight transition-[box-shadow,transform,background-color,border-color] duration-200 group-hover:scale-[1.04] ${
                            isLightMode
                              ? 'border border-emerald-500/32 bg-gradient-to-b from-white to-emerald-200/85 text-[11px] text-emerald-950 shadow-[0_4px_12px_-8px_rgba(5,100,75,0.24),inset_0_1px_0_rgba(255,255,255,0.82)] group-hover:shadow-[0_8px_16px_-10px_rgba(5,100,75,0.36)]'
                              : 'border border-cyan-400/30 bg-[linear-gradient(180deg,rgba(34,211,238,0.14),rgba(8,145,178,0.1))] text-[10px] text-cyan-100 shadow-[0_0_10px_-4px_rgba(34,211,238,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] group-hover:shadow-[0_0_16px_-4px_rgba(34,211,238,0.7)]'
                          }`}
                          aria-hidden
                        >
                          {idx + 1}
                        </span>
                        <span className="min-w-0 pt-[0.12rem]">{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </footer>
        </div>
      ) : null}

      <div className="mt-5 sm:mt-6">
        <div className="relative">
          <SurfaceCard
            className={
              isLightMode
                ? 'relative isolate overflow-hidden rounded-2xl border-cyan-400/40 bg-[linear-gradient(165deg,#ecfeff_0%,#cffafe_45%,#d1fae5_100%)] shadow-[0_32px_72px_-44px_rgba(8,100,95,0.28),0_0_100px_-38px_rgba(6,182,212,0.32),inset_0_1px_0_rgba(255,255,255,0.45)] ring-1 ring-cyan-500/30 backdrop-blur-[3px] before:pointer-events-none before:absolute before:-left-[15%] before:top-[-40%] before:z-0 before:h-[19rem] before:w-[19rem] before:rounded-full before:bg-cyan-500/30 before:blur-3xl before:content-[\'\'] after:pointer-events-none after:absolute after:-bottom-14 after:right-[-12%] after:z-0 after:h-[17rem] after:w-[18rem] after:rounded-full after:bg-emerald-500/25 after:blur-3xl after:content-[\'\'] p-4 sm:p-5 lg:pr-[20rem]'
                : 'p-4 sm:p-5 lg:pr-[19rem]'
            }
          >
            <p
              className={`relative z-[1] font-semibold uppercase tracking-[0.2em] ${
                isLightMode ? 'text-[11px] text-emerald-900/72' : 'text-xs text-[var(--text-muted-2)]'
              }`}
            >
              {isAdmin ? 'Admin action' : 'Donor action'}
            </p>
            {isAdmin ? (
              <form onSubmit={(e) => void disburse(e)} className="relative z-[1] mt-3 sm:mt-3.5">
                <h2
                  className={`font-semibold text-[var(--text-high-3)] ${isLightMode ? 'text-xl tracking-tight text-amber-950' : 'text-lg text-amber-100'}`}
                >
                  Disburse for {cause.title}
                </h2>
                <p
                  className={`mt-1.5 text-[var(--text-muted-1)] ${isLightMode ? 'max-w-xl text-[13px] leading-relaxed text-amber-950/80' : 'text-xs text-amber-100/75'}`}
                >
                  Sends ETH from the Vaultex vault directly to this cause&apos;s treasury wallet. Logged as a disbursement.
                </p>
                <div className="mt-3.5 space-y-2.5">
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`vtx-input w-full px-4 py-2 font-mono sm:w-40 ${isLightMode ? 'border-amber-300/50 bg-amber-50/60' : ''}`}
                    placeholder="Amount"
                  />
                  <input
                    type="text"
                    value={disburseMessage}
                    onChange={(e) => setDisburseMessage(e.target.value.slice(0, 40))}
                    maxLength={40}
                    className={`vtx-input w-full px-4 py-2 ${isLightMode ? 'border-amber-300/50 bg-amber-50/60' : ''}`}
                    placeholder="Message (optional, max 40 chars)"
                  />
                  <PrimaryButton
                    type="submit"
                    disabled={busy || !validAmount}
                    className={
                      isLightMode
                        ? 'min-w-[7.5rem] bg-amber-600 px-6 py-2.5 shadow-[0_12px_44px_-10px_rgba(180,83,9,0.45)] hover:bg-amber-700'
                        : 'min-w-[7.5rem] bg-amber-600 px-6 py-2.5 hover:bg-amber-500'
                    }
                  >
                    {busy ? 'Sending…' : 'Disburse'}
                  </PrimaryButton>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {QUICK_AMOUNTS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAmount(v)}
                      className={`rounded-full border px-3 py-1.5 font-semibold transition-[border-color,box-shadow,background-color] duration-150 ${
                        isLightMode
                          ? 'border-amber-400/50 bg-amber-100/90 text-[13px] text-amber-950 hover:border-amber-500/60 hover:bg-amber-200/80'
                          : 'border-amber-500/30 bg-amber-500/10 text-xs text-amber-100 hover:border-amber-400/45'
                      }`}
                    >
                      {v} ETH
                    </button>
                  ))}
                </div>
                {msg && (
                  <p className={`mt-3 text-sm ${isLightMode ? 'text-amber-900' : 'text-amber-200'}`}>{msg}</p>
                )}
              </form>
            ) : canDonate ? (
              <form onSubmit={(e) => void donate(e)} className="relative z-[1] mt-3 sm:mt-3.5">
                <h2
                  className={`font-semibold text-[var(--text-high-3)] ${isLightMode ? 'text-xl tracking-tight' : 'text-lg'}`}
                >
                  Donate ETH
                </h2>
                <p
                  className={`mt-1.5 text-[var(--text-muted-1)] ${isLightMode ? 'max-w-xl text-[13px] leading-relaxed' : 'text-xs'}`}
                >
                  Fast contribution from your assigned wallet.
                </p>

                <div className="mt-3.5 flex flex-wrap items-center gap-2.5 sm:gap-3">
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`vtx-input w-40 px-4 py-2 font-mono ${isLightMode ? 'border-emerald-300/60 bg-emerald-50/50 ring-1 ring-emerald-400/40 shadow-[inset_0_2px_12px_rgba(15,80,60,0.1),0_8px_32px_-14px_rgba(34,211,153,0.28)]' : ''}`}
                    placeholder="Amount"
                  />
                  <PrimaryButton
                    type="submit"
                    disabled={busy}
                    className={
                      isLightMode
                        ? 'min-w-[7.5rem] px-6 py-2.5 shadow-[0_12px_44px_-10px_rgba(5,120,95,0.55),0_0_56px_2px_rgba(16,185,129,0.45)]'
                        : 'min-w-[7.5rem] px-6 py-2.5'
                    }
                  >
                    {busy ? 'Sending…' : 'Donate'}
                  </PrimaryButton>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {QUICK_AMOUNTS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAmount(v)}
                      className={`rounded-full border px-3 py-1.5 font-semibold text-[var(--text-high-3)] transition-[border-color,box-shadow,background-color] duration-150 ${
                        isLightMode
                          ? 'border-emerald-400/50 bg-emerald-100/90 text-[13px] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_8px_26px_-12px_rgba(5,100,75,0.28)] ring-1 ring-emerald-400/35 hover:border-emerald-500/60 hover:bg-emerald-200/80 hover:shadow-[0_10px_32px_-10px_rgba(4,120,95,0.32)]'
                          : 'border-[var(--border-chrome-2)] bg-[var(--surface-panel-overlay)] text-xs hover:border-[var(--border-chrome-4)]'
                      }`}
                    >
                      {v} ETH
                    </button>
                  ))}
                </div>

                <ul className="mt-4 flex flex-wrap gap-2.5">
                  <li
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${
                      isLightMode
                        ? 'border-emerald-400/35 bg-emerald-100/85 text-emerald-950/80'
                        : 'border-white/14 bg-white/[0.04] text-cyan-100/88'
                    }`}
                  >
                    <span className="text-[10px] uppercase tracking-[0.1em] opacity-75">Impact</span>
                    <span className="text-sm font-semibold">{estUnits} {unitLabel}</span>
                  </li>
                  <li
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${
                      isLightMode
                        ? 'border-emerald-400/35 bg-emerald-100/85 text-emerald-950/80'
                        : 'border-white/14 bg-white/[0.04] text-cyan-100/88'
                    }`}
                  >
                    <span className="text-[10px] uppercase tracking-[0.1em] opacity-75">People</span>
                    <span className="text-sm font-semibold">{estPeople}</span>
                  </li>
                  <li
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${
                      isLightMode
                        ? 'border-emerald-400/35 bg-emerald-100/85 text-emerald-950/80'
                        : 'border-white/14 bg-white/[0.04] text-cyan-100/88'
                    }`}
                  >
                    <span className="text-[10px] uppercase tracking-[0.1em] opacity-75">Fee</span>
                    <span className="font-mono text-sm font-semibold">{estGas.toFixed(4)} ETH</span>
                  </li>
                </ul>
                {msg && <p className={`mt-3 text-sm ${isLightMode ? 'text-emerald-700' : 'text-emerald-400'}`}>{msg}</p>}
              </form>
            ) : (
              <div
                className={`relative z-[1] mt-3 rounded-xl border p-4 text-sm ${
                  isLightMode
                    ? 'border-amber-700/20 bg-amber-500/10 text-amber-900'
                    : 'border-amber-500/20 bg-amber-500/10 text-amber-200'
                }`}
              >
                {user
                  ? 'Only accounts with an Anvil wallet can donate from UI.'
                  : 'Sign in to donate from your assigned Anvil wallet.'}{' '}
                <Link to="/login" className={isLightMode ? 'text-amber-950 underline' : 'text-cyan-300 underline'}>
                  Sign in
                </Link>
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard
            className={`${
              isLightMode
                ? 'relative isolate overflow-hidden rounded-2xl border-emerald-400/45 bg-[linear-gradient(165deg,#ecfdf5_0%,#d1fae5_48%,#ccfbf1_100%)] shadow-[0_28px_66px_-40px_rgba(6,78,59,0.32),0_0_80px_-34px_rgba(16,185,129,0.28),inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-emerald-500/35 backdrop-blur-[3px] before:pointer-events-none before:absolute before:-right-16 before:top-[-40%] before:z-0 before:h-[13rem] before:w-[13rem] before:rounded-full before:bg-emerald-500/26 before:blur-3xl before:content-[""]'
                : 'group relative isolate overflow-hidden rounded-2xl border border-cyan-400/28 bg-[linear-gradient(162deg,rgba(7,22,38,0.96)_0%,rgba(4,14,28,0.98)_48%,rgba(6,24,42,0.95)_100%)] shadow-[0_16px_36px_rgba(2,8,20,0.62),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_0_0_1px_rgba(34,211,238,0.12)] ring-1 ring-cyan-400/22 before:pointer-events-none before:absolute before:-right-10 before:top-[-25%] before:z-0 before:h-[12rem] before:w-[12rem] before:rounded-full before:bg-cyan-400/22 before:blur-3xl before:content-[""] after:pointer-events-none after:absolute after:-left-10 after:bottom-[-30%] after:z-0 after:h-[10rem] after:w-[10rem] after:rounded-full after:bg-emerald-400/18 after:blur-3xl after:content-[""]'
            } mt-3 p-4 sm:p-4.5 lg:absolute lg:right-4 lg:top-4 lg:mt-0 lg:w-[18rem] transition-transform duration-300 ease-out transform-gpu will-change-transform hover:-translate-x-3 hover:-translate-y-1 hover:scale-[1.02]`}
          >
            <p
              className={`relative z-[1] font-semibold uppercase tracking-[0.18em] ${
                isLightMode ? 'text-[10px] text-emerald-900/72' : 'text-[10px] text-[var(--text-muted-2)]'
              }`}
            >
              Campaign health
            </p>
            <div className="relative z-[1] mt-2.5 flex items-center gap-3">
              <div className={`shrink-0 ${isLightMode ? 'relative' : 'relative'}`}>
                {isLightMode ? (
                  <div
                    className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(5,150,105,0.42)_0%,rgba(20,184,166,0.2)_45%,rgba(255,255,255,0)_68%)] blur-xl"
                    aria-hidden
                  />
                ) : (
                  <div
                    className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[145%] w-[145%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.26)_0%,rgba(16,185,129,0.18)_45%,rgba(2,6,23,0)_72%)] blur-xl transition-opacity duration-300 group-hover:opacity-100"
                    aria-hidden
                  />
                )}
                <svg viewBox="0 0 110 110" className={`relative h-[5.75rem] w-[5.75rem] transition-transform duration-300 ${isLightMode ? '' : 'drop-shadow-[0_0_22px_rgba(34,211,238,0.26)] group-hover:scale-[1.02]'}`} aria-label="Funding progress chart">
                  <circle cx="55" cy="55" r="45" fill="none" stroke="var(--bg-depth-1)" strokeWidth="10" />
                  <circle
                    cx="55"
                    cy="55"
                    r="45"
                    fill="none"
                    stroke="url(#causeProgress)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${progressStroke} ${strokeLength}`}
                    transform="rotate(-90 55 55)"
                  />
                  <text x="55" y="52" textAnchor="middle" className="fill-[var(--text-high-3)] text-[0.92rem] font-bold">
                    {pct.toFixed(0)}%
                  </text>
                  <text x="55" y="66" textAnchor="middle" className="fill-[var(--text-muted-1)] text-[0.45rem]">
                    utilized
                  </text>
                </svg>
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className={`text-[10px] uppercase tracking-[0.1em] ${isLightMode ? 'text-emerald-950/70' : 'text-cyan-200/78'}`}>
                  Disbursed
                </p>
                <p className={`font-mono text-[0.95rem] font-semibold ${isLightMode ? 'text-[var(--text-high-3)]' : 'text-cyan-50'}`}>{cause.disbursed_eth.toFixed(4)} ETH</p>
                <p className={`pt-0.5 text-[10px] uppercase tracking-[0.1em] ${isLightMode ? 'text-emerald-950/70' : 'text-cyan-200/78'}`}>
                  Remaining
                </p>
                <p className={`font-mono text-[0.95rem] font-semibold ${isLightMode ? 'text-[var(--text-high-3)]' : 'text-cyan-50'}`}>{remainingEth.toFixed(4)} ETH</p>
              </div>
            </div>
            <div className={`relative z-[1] mt-3 h-2 overflow-hidden rounded-full ${isLightMode ? 'bg-emerald-200/55' : 'bg-cyan-950/70 ring-1 ring-cyan-400/20'}`}>
              <div
                className={`h-full rounded-full bg-gradient-to-r from-[var(--accent-deep-1)] to-[var(--accent-bright-2)] ${isLightMode ? 'shadow-[0_0_20px_rgba(16,185,129,0.55)]' : 'shadow-[0_0_18px_rgba(34,211,238,0.55)]'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="relative z-[1] mt-4 w-full max-w-[17rem] sm:max-w-none">
              <p className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${isLightMode ? 'text-emerald-950/65' : 'text-cyan-200/72'}`}>
                Disbursed vs donated
              </p>
              <CauseFundingDonut raisedEth={cause.disbursed_eth} goalEth={donatedEth || 1} isLightMode={isLightMode} />
            </div>
            <p className={`relative z-[1] mt-2 text-[12px] ${isLightMode ? 'text-[var(--text-muted-1)]' : 'text-[var(--text-muted-1)]'}`}>
              Goal: {cause.goal_eth.toFixed(4)} ETH
            </p>
          </SurfaceCard>
        </div>
      </div>
      </div>
    </div>
  );
}
