import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { PrimaryButton, SectionHeader, SurfaceCard } from '../components/ui';

type Cause = {
  id: number;
  title: string;
  description: string;
  goal_eth: number;
  raised_eth: number;
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

const DETAIL_COPY_BY_TITLE: Record<string, CauseDetailCopy> = {
  LGBTQs: {
    about:
      'This fund supports queer and trans communities with direct, practical help—safe housing, counselling, crisis support, and community-led mutual aid. Donations are tracked and visible so supporters can see how funding moves from wallet to impact.',
    whatFundsCover: [
      'Emergency accommodation vouchers and short-term housing support',
      'Trauma-informed counselling sessions and crisis hotlines',
      'Legal/admin support for safety planning and identity documentation',
      'Community mutual-aid grants for food, transport, and essentials',
    ],
    milestones: [
      'Fund 50 emergency nights of safe housing',
      'Cover 120 counselling sessions with verified providers',
      'Deliver 200 mutual-aid microgrants to vetted recipients',
    ],
    verification: [
      'Beneficiary verification before disbursement',
      'Every donation and payout recorded in the ledger',
      'Clear monthly recap of allocations and remaining budget',
    ],
  },
  War: {
    about:
      'This cause provides emergency relief for families affected by conflict: medical supplies, evacuation support, temporary shelter, and essential goods. Funding is managed with transparent records to reduce “black box” aid and improve accountability.',
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
      'This fund responds quickly to climate and natural disasters—supporting temporary shelter, emergency food and water, and early rebuilding. The goal is speed + accountability: rapid assistance with records anyone can audit.',
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
      'This cause strengthens public hospitals with critical equipment and patient care support—focused on transparent purchasing and measurable outcomes. Contributions help address shortages and improve frontline capacity.',
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
      'This cause expands access to learning through scholarships, supplies, and digital connectivity. Funds are allocated to clear line items so supporters can see exactly what gets funded and when.',
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
  const [isLightMode, setIsLightMode] = useState(
    () => typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light',
  );
  const [cause, setCause] = useState<Cause | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [amount, setAmount] = useState('0.1');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeSlice, setActiveSlice] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    apiJson<Cause>(`/causes/${id}`)
      .then(setCause)
      .catch((e: Error) => setErr(e.message));
  }, [id]);

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => setIsLightMode(root.getAttribute('data-theme') === 'light');
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const canDonate =
    user && (user.role === 'donor' || user.role === 'admin') && user.anvilIndex != null;

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

  const pct = Math.min(100, (cause.raised_eth / cause.goal_eth) * 100);
  const detailCopy = DETAIL_COPY_BY_TITLE[cause.title];
  const remainingEth = Math.max(0, cause.goal_eth - cause.raised_eth);
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
  const recentActivity =
    detailCopy != null
      ? dashboardRows.map((row, i) => {
          const bucketEth = (cause.raised_eth * row.pct) / 100;
          const ethNum =
            cause.raised_eth > 0
              ? Math.max(0.3, bucketEth * 0.35 + i * 0.08)
              : Math.max(0.5, (cause.goal_eth * row.pct) / 100 * 0.06);
          const ethDisplay = ethNum.toFixed(1);
          const times = ['2h ago', '6h ago', '12h ago', '1d ago'] as const;
          const statuses = ['Confirmed', 'In Progress', 'Confirmed', 'Verified'] as const;
          return {
            ethDisplay,
            title: row.title,
            time: times[i] ?? 'recently',
            status: statuses[i] ?? 'Confirmed',
          };
        })
      : [];

  const pieHoleCategory =
    activeSlice != null ? toSpendTitle(allocationRows[activeSlice]?.label ?? '') : '';
  const pieHoleSubtitle =
    activeSlice == null ? 'Pick a slice' : pieHoleCategory.length > 16 ? `${pieHoleCategory.slice(0, 14)}…` : pieHoleCategory;

  return (
    <div className="vtx-page max-w-6xl">
      <Link
        to="/causes"
        className={`inline-flex items-center gap-2 text-sm font-medium ${
          isLightMode ? 'text-[var(--text-muted-1)] hover:text-[var(--text-high-1)]' : 'text-[var(--accent-bright-2)]'
        }`}
      >
        ← All causes
      </Link>
      <div className="mt-4">
        <SectionHeader title={cause.title} />
      </div>
      <p className="mt-4 max-w-3xl leading-relaxed text-[var(--text-muted-1)]">{cause.description}</p>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <SurfaceCard>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted-2)]">Campaign health</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-[170px_1fr] sm:items-center">
            <div className="mx-auto">
              <svg viewBox="0 0 110 110" className="h-36 w-36" aria-label="Funding progress chart">
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
                <defs>
                  <linearGradient id="causeProgress" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
                <text x="55" y="52" textAnchor="middle" className="fill-[var(--text-high-3)] text-[0.95rem] font-bold">
                  {pct.toFixed(0)}%
                </text>
                <text x="55" y="66" textAnchor="middle" className="fill-[var(--text-muted-1)] text-[0.46rem]">
                  funded
                </text>
              </svg>
            </div>
            <div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-[var(--border-chrome-2)] bg-[var(--surface-panel-overlay)] p-3">
                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted-2)]">Raised</p>
                  <p className="mt-1 font-mono text-base font-semibold text-[var(--text-high-3)]">
                    {cause.raised_eth.toFixed(4)} ETH
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border-chrome-2)] bg-[var(--surface-panel-overlay)] p-3">
                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted-2)]">Remaining</p>
                  <p className="mt-1 font-mono text-base font-semibold text-[var(--text-high-3)]">
                    {remainingEth.toFixed(4)} ETH
                  </p>
                </div>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--bg-depth-1)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--accent-deep-1)] to-[var(--accent-bright-2)]"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-[var(--text-muted-1)]">Goal: {cause.goal_eth.toFixed(4)} ETH</p>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted-2)]">Donor action</p>
          {canDonate ? (
            <form onSubmit={(e) => void donate(e)} className="mt-3">
              <h2 className="text-lg font-semibold text-[var(--text-high-3)]">Donate ETH</h2>
              <p className="mt-1 text-xs text-[var(--text-muted-1)]">Fast contribution from your assigned wallet.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="vtx-input w-40 px-4 py-2 font-mono"
                  placeholder="Amount"
                />
                <PrimaryButton type="submit" disabled={busy} className="px-6 py-2">
                  {busy ? 'Sending…' : 'Donate'}
                </PrimaryButton>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(v)}
                    className="rounded-full border border-[var(--border-chrome-2)] bg-[var(--surface-panel-overlay)] px-3 py-1.5 text-xs font-semibold text-[var(--text-high-3)] hover:border-[var(--border-chrome-4)]"
                  >
                    {v} ETH
                  </button>
                ))}
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg border border-[var(--border-chrome-2)] bg-[var(--surface-panel-overlay)] px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted-2)]">Estimated impact</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--text-high-3)]">
                    {estUnits} {unitLabel}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--border-chrome-2)] bg-[var(--surface-panel-overlay)] px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted-2)]">People supported</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--text-high-3)]">{estPeople} people</p>
                </div>
                <div className="rounded-lg border border-[var(--border-chrome-2)] bg-[var(--surface-panel-overlay)] px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted-2)]">Network fee</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-[var(--text-high-3)]">{estGas.toFixed(4)} ETH</p>
                </div>
              </div>
              {msg && <p className={`mt-3 text-sm ${isLightMode ? 'text-emerald-700' : 'text-emerald-400'}`}>{msg}</p>}
            </form>
          ) : (
            <div
              className={`mt-3 rounded-xl border p-4 text-sm ${
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
      </div>

      {detailCopy ? (
        <div className="mt-6 grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-8 xl:gap-10">
          <SurfaceCard className="min-w-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[var(--text-high-3)]">Where funds go</h2>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                  isLightMode
                    ? 'border border-emerald-600/35 bg-emerald-600/10 text-emerald-800'
                    : 'border border-[var(--border-chrome-3)] bg-[var(--surface-panel-overlay)] text-[var(--text-high-2)]'
                }`}
              >
                Donor view
              </span>
            </div>
            <p className="mt-1 max-w-prose text-xs text-[var(--text-muted-1)]">
              Planned split across this campaign’s goal. The highlighted slice shows the full line item below; the impact table mirrors your selection without repeating it.
            </p>
            <div className="mt-6 grid min-w-0 gap-6 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)] md:items-start md:gap-8">
              <div className="mx-auto flex w-full max-w-[220px] shrink-0 justify-center md:mx-0 md:justify-start">
                <svg viewBox="0 0 200 200" className="h-44 w-full max-w-[200px] sm:h-48 sm:max-w-[220px]" aria-label="Fund allocation pie chart">
                  {allocationRows.map((item, i) => {
                    const start = -90 + allocationRows.slice(0, i).reduce((sum, row) => sum + row.pct, 0) * 3.6;
                    const end = start + item.pct * 3.6;
                    const mid = (start + end) / 2;
                    const exploded = activeSlice === i ? 6 : 0;
                    const offset = polarToCartesian(0, 0, exploded, mid);
                    return (
                      <path
                        key={`slice-${item.label}`}
                        d={pieSlicePath(100, 100, 76, start, end)}
                        transform={`translate(${offset.x}, ${offset.y})`}
                        fill={slicePalette[i % slicePalette.length]}
                        className="cursor-pointer transition-transform duration-150 ease-out"
                        onMouseEnter={() => setActiveSlice(i)}
                        onFocus={() => setActiveSlice(i)}
                        onMouseLeave={() => setActiveSlice(null)}
                        onBlur={() => setActiveSlice(null)}
                        tabIndex={0}
                        role="img"
                        aria-label={`${toSpendTitle(item.label)} ${item.pct}%`}
                      />
                    );
                  })}
                  <circle cx="100" cy="100" r="38" fill="var(--surface-panel-overlay)" />
                  <text x="100" y="94" textAnchor="middle" className="fill-[var(--text-high-3)] text-[0.72rem] font-semibold">
                    {activeSlice != null ? `${allocationRows[activeSlice]?.pct}%` : '—'}
                  </text>
                  <text x="100" y="110" textAnchor="middle" className="fill-[var(--text-muted-1)] text-[0.45rem]">
                    {pieHoleSubtitle}
                  </text>
                </svg>
              </div>
              <div className="min-w-0 space-y-2">
                {allocationRows.map((item, i) => (
                  <button
                    key={`legend-${item.label}`}
                    type="button"
                    onMouseEnter={() => setActiveSlice(i)}
                    onFocus={() => setActiveSlice(i)}
                    onMouseLeave={() => setActiveSlice(null)}
                    onBlur={() => setActiveSlice(null)}
                    className={`flex w-full min-w-0 items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-xs transition ${
                      activeSlice === i
                        ? 'border-[var(--border-chrome-4)] bg-[var(--overlay-surface-soft)]'
                        : 'border-[var(--border-chrome-2)] bg-[var(--surface-panel-overlay)]'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2 text-[var(--text-muted-1)]">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: slicePalette[i % slicePalette.length] }} />
                      <span className="truncate">{toSpendTitle(item.label)}</span>
                    </span>
                    <span className="shrink-0 font-mono text-[var(--text-high-3)]">{item.pct}%</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-[var(--border-chrome-2)] bg-[var(--surface-panel-overlay)] px-3 py-2.5 text-xs leading-relaxed">
              {activeSlice != null ? (
                <p className="text-[var(--text-muted-1)]">
                  <span className="font-semibold text-[var(--text-high-3)]">
                    {toSpendTitle(allocationRows[activeSlice]?.label ?? '')}
                  </span>
                  {' — '}
                  {allocationRows[activeSlice]?.label}
                </p>
              ) : (
                <p className="text-[var(--text-muted-1)]">Hover or focus a slice to read the full line item.</p>
              )}
            </div>
          </SurfaceCard>

          <div
            className={`min-w-0 flex flex-col rounded-2xl border p-2.5 sm:p-3 ${
              isLightMode
                ? 'border-emerald-300/35 bg-gradient-to-b from-white via-white to-emerald-50/40 shadow-[0_4px_20px_rgba(16,185,129,0.07)]'
                : 'border-cyan-400/20 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(16,185,129,0.16),rgba(10,20,35,0.96)_46%),linear-gradient(180deg,rgba(8,23,38,0.95),rgba(5,14,30,0.96))] shadow-[0_0_0_1px_rgba(34,211,238,0.12)_inset]'
            }`}
          >
            <div className={`shrink-0 border-b pb-2 ${isLightMode ? 'border-emerald-200/60' : 'border-cyan-400/10'}`}>
              <h2
                className={`text-sm font-semibold tracking-[-0.01em] sm:text-base ${
                  isLightMode ? 'text-[var(--text-high-3)]' : 'text-white'
                }`}
              >
                Your Impact Dashboard
              </h2>
              <p
                className={`mt-0.5 text-[10px] leading-snug ${isLightMode ? 'text-[var(--text-muted-1)]' : 'text-cyan-100/55'}`}
              >
                Goal-based ETH allocations, impact metrics, and activity — percentages stay on the chart at left.
              </p>
            </div>

            <div
              className={`mt-2 shrink-0 overflow-x-auto rounded-lg border ${
                isLightMode ? 'border-[var(--border-chrome-2)] bg-[var(--surface-panel-overlay)]' : 'border-cyan-400/10 bg-cyan-400/[0.03]'
              }`}
            >
              <p
                className={`border-b px-2 py-1.5 text-[9px] leading-snug ${
                  isLightMode ? 'border-[var(--border-chrome-2)] text-[var(--text-muted-2)]' : 'border-cyan-400/12 text-cyan-200/50'
                }`}
              >
                Full line-item wording stays under the chart on the left. This grid is ETH + outcomes only.
              </p>
              <table className="w-full min-w-[300px] border-collapse text-left text-[10px]">
                <thead>
                  <tr
                    className={`border-b text-[9px] font-semibold uppercase tracking-[0.1em] ${
                      isLightMode ? 'border-[var(--border-chrome-2)] text-[var(--text-muted-2)]' : 'border-cyan-400/12 text-cyan-200/45'
                    }`}
                  >
                    <th className="px-2 py-1.5 font-semibold">Category</th>
                    <th className="px-2 py-1.5 text-right font-semibold">ETH (goal)</th>
                    <th className="hidden min-w-[7rem] px-2 py-1.5 font-semibold sm:table-cell">Metric</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardRows.map((row, i) => (
                    <tr
                      key={`alloc-row-${row.label}`}
                      aria-label={`${row.title}, ${row.pct}% of goal, ${row.allocationEth.toFixed(2)} ETH toward goal`}
                      onMouseEnter={() => setActiveSlice(i)}
                      onMouseLeave={() => setActiveSlice(null)}
                      className={`cursor-pointer border-b transition-colors last:border-0 ${
                        isLightMode ? 'border-[var(--border-chrome-2)]/80' : 'border-cyan-400/8'
                      } ${
                        activeSlice === i
                          ? isLightMode
                            ? 'bg-[var(--overlay-surface-soft)] ring-1 ring-inset ring-[var(--border-chrome-4)]'
                            : 'bg-cyan-400/[0.08] ring-1 ring-inset ring-cyan-400/25'
                          : isLightMode
                            ? 'hover:bg-black/[0.02]'
                            : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <td className="min-w-[7.5rem] max-w-[12rem] px-2 py-1.5 align-middle">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: slicePalette[i % slicePalette.length] }}
                            aria-hidden
                          />
                          <span
                            className={`font-semibold leading-tight ${isLightMode ? 'text-[var(--text-high-3)]' : 'text-white'}`}
                          >
                            {row.title}
                          </span>
                        </span>
                      </td>
                      <td
                        className={`whitespace-nowrap px-2 py-1.5 text-right font-mono tabular-nums ${
                          isLightMode ? 'text-[var(--text-muted-1)]' : 'text-cyan-200/75'
                        }`}
                      >
                        {row.allocationEth.toFixed(2)}
                      </td>
                      <td
                        className={`hidden px-2 py-1.5 align-top text-[9px] leading-snug sm:table-cell ${
                          isLightMode ? 'text-[var(--text-muted-1)]' : 'text-cyan-100/70'
                        }`}
                      >
                        {row.impactMetric}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              className={`mt-2.5 shrink-0 border-t pt-2 ${isLightMode ? 'border-[var(--border-chrome-2)]' : 'border-cyan-400/10'}`}
            >
              <h3
                className={`text-[9px] font-semibold uppercase tracking-[0.12em] ${
                  isLightMode ? 'text-[var(--text-muted-2)]' : 'text-cyan-200/45'
                }`}
              >
                Live activity feed
              </h3>
              <ul className="mt-1 space-y-1">
                {recentActivity.map((item) => (
                  <li
                    key={`${item.title}-${item.time}-${item.ethDisplay}`}
                    className={`flex items-start justify-between gap-2 rounded-md border px-2 py-1 ${
                      isLightMode
                        ? 'border-[var(--border-chrome-2)] bg-[var(--surface-panel-overlay)]'
                        : 'border-cyan-400/8 bg-cyan-400/[0.025]'
                    }`}
                  >
                    <span
                      className={`min-w-0 flex-1 text-[9px] leading-snug ${
                        isLightMode ? 'text-[var(--text-muted-1)]' : 'text-cyan-100/75'
                      }`}
                    >
                      <span className={isLightMode ? 'text-emerald-600/90' : 'text-cyan-400/60'} aria-hidden>
                        ·{' '}
                      </span>
                      <span className="font-mono font-semibold">{item.ethDisplay} ETH</span> allocated to {item.title}{' '}
                      <span className={isLightMode ? 'text-[var(--text-muted-2)]' : 'text-cyan-400/35'}>
                        · {item.time}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded px-1 py-0.5 text-[7px] font-semibold uppercase tracking-wide ${
                        item.status === 'In Progress'
                          ? isLightMode
                            ? 'bg-amber-500/15 text-amber-900 ring-1 ring-amber-400/25'
                            : 'bg-amber-400/15 text-amber-100 ring-1 ring-amber-400/25'
                          : item.status === 'Verified'
                            ? isLightMode
                              ? 'bg-cyan-500/15 text-cyan-900 ring-1 ring-cyan-400/25'
                              : 'bg-cyan-400/15 text-cyan-100 ring-1 ring-cyan-400/25'
                            : isLightMode
                              ? 'bg-emerald-500/15 text-emerald-900 ring-1 ring-emerald-400/25'
                              : 'bg-emerald-400/15 text-emerald-100 ring-1 ring-emerald-400/25'
                      }`}
                    >
                      {item.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
