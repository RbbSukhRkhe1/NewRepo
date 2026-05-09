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
  const [cause, setCause] = useState<Cause | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [amount, setAmount] = useState('0.1');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiJson<Cause>(`/causes/${id}`)
      .then(setCause)
      .catch((e: Error) => setErr(e.message));
  }, [id]);

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

  return (
    <div className="vtx-page max-w-2xl">
      <Link to="/causes" className="text-sm text-[var(--accent-bright-2)]">
        ← All causes
      </Link>
      <div className="mt-4">
        <SectionHeader title={cause.title} />
      </div>
      <p className="mt-4 leading-relaxed text-[var(--text-muted-1)]">{cause.description}</p>

      <div className="mt-8 space-y-4">
        <SurfaceCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted-2)]">
                Progress
              </p>
              <p className="mt-1 text-2xl font-bold tracking-[-0.02em] text-[var(--text-high-3)]">
                {pct.toFixed(0)}%
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-[var(--border-chrome-3)] bg-[var(--surface-panel-overlay)] px-3 py-1 text-[var(--text-muted-1)]">
                Raised: {cause.raised_eth.toFixed(4)} ETH
              </span>
              <span className="rounded-full border border-[var(--border-chrome-3)] bg-[var(--surface-panel-overlay)] px-3 py-1 text-[var(--text-muted-1)]">
                Goal: {cause.goal_eth} ETH
              </span>
            </div>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-[var(--bg-depth-1)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--accent-deep-1)] to-[var(--accent-bright-2)]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </SurfaceCard>

        {detailCopy ? (
          <>
            <SurfaceCard>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-high-3)]">In 60 seconds</h2>
                  <p className="mt-1 text-sm text-[var(--text-muted-1)]">
                    What this cause does and how funds are used.
                  </p>
                </div>
                <span className="rounded-full border border-[var(--border-chrome-3)] bg-[var(--surface-panel-overlay)] px-3 py-1 text-xs font-semibold text-[var(--text-high-2)]">
                  Verified
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[var(--border-chrome-2)] bg-[var(--surface-panel-overlay)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted-2)]">
                    Purpose
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted-1)]">{detailCopy.about}</p>
                </div>
                <div className="rounded-2xl border border-[var(--border-chrome-2)] bg-[var(--surface-panel-overlay)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted-2)]">
                    Covers
                  </p>
                  <ul className="mt-2 space-y-2 text-sm text-[var(--text-muted-1)]">
                    {detailCopy.whatFundsCover.slice(0, 2).map((t) => (
                      <li key={t} className="flex gap-2">
                        <span className="mt-[3px] h-2 w-2 shrink-0 rounded-full bg-[var(--accent-bright-2)]" aria-hidden />
                        <span className="leading-relaxed">{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-[var(--border-chrome-2)] bg-[var(--surface-panel-overlay)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted-2)]">
                    Next milestones
                  </p>
                  <ul className="mt-2 space-y-2 text-sm text-[var(--text-muted-1)]">
                    {detailCopy.milestones.slice(0, 2).map((t) => (
                      <li key={t} className="flex gap-2">
                        <span className="mt-[3px] h-2 w-2 shrink-0 rounded-full bg-emerald-400" aria-hidden />
                        <span className="leading-relaxed">{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </SurfaceCard>

            <div className="grid gap-4 md:grid-cols-2">
              <SurfaceCard>
                <h2 className="text-lg font-semibold text-[var(--text-high-3)]">What your donation covers</h2>
                <div className="mt-4 grid gap-3">
                  {detailCopy.whatFundsCover.map((t) => (
                    <div
                      key={t}
                      className="flex items-start gap-3 rounded-2xl border border-[var(--border-chrome-2)] bg-[var(--surface-panel-overlay)] p-4"
                    >
                      <span
                        className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                        aria-hidden
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                          <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
                        </svg>
                      </span>
                      <p className="text-sm leading-relaxed text-[var(--text-muted-1)]">{t}</p>
                    </div>
                  ))}
                </div>
              </SurfaceCard>

              <SurfaceCard>
                <h2 className="text-lg font-semibold text-[var(--text-high-3)]">Milestones & accountability</h2>
                <ol className="mt-4 space-y-3">
                  {detailCopy.milestones.map((t, i) => (
                    <li
                      key={t}
                      className="flex gap-3 rounded-2xl border border-[var(--border-chrome-2)] bg-[var(--surface-panel-overlay)] p-4"
                    >
                      <span
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border-chrome-3)] bg-[var(--bg-depth-1)] text-xs font-semibold text-[var(--text-high-2)]"
                        aria-hidden
                      >
                        {i + 1}
                      </span>
                      <p className="text-sm leading-relaxed text-[var(--text-muted-1)]">{t}</p>
                    </li>
                  ))}
                </ol>

                <div className="mt-4 rounded-2xl border border-[var(--border-chrome-2)] bg-[var(--surface-panel-overlay)] p-4">
                  <h3 className="text-sm font-semibold text-[var(--text-high-3)]">Transparency & verification</h3>
                  <ul className="mt-3 space-y-2 text-sm text-[var(--text-muted-1)]">
                    {detailCopy.verification.map((t) => (
                      <li key={t} className="flex gap-2">
                        <span className="mt-[3px] h-2 w-2 shrink-0 rounded-full bg-[var(--accent-bright-2)]" aria-hidden />
                        <span className="leading-relaxed">{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </SurfaceCard>
            </div>
          </>
        ) : null}
      </div>

      {canDonate ? (
        <SurfaceCard className="mt-10">
          <form onSubmit={(e) => void donate(e)}>
          <h2 className="text-lg font-semibold text-[var(--text-high-3)]">Donate ETH</h2>
          <p className="mt-1 text-xs text-[var(--text-muted-1)]">
            Sends from your assigned Anvil wallet to the main vault. Recorded on-chain and in the
            ledger.
          </p>
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
          {msg && <p className="mt-3 text-sm text-emerald-400">{msg}</p>}
          </form>
        </SurfaceCard>
      ) : (
        <p className="mt-10 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
          {user
            ? 'Only accounts with an Anvil wallet (indices 1–6 here) can send from the UI. Admins #1–3 can donate; create a donor for more test wallets.'
            : 'Sign in to donate from your assigned Anvil wallet.'}{' '}
          <Link to="/login" className="text-cyan-300 underline">
            Sign in
          </Link>
        </p>
      )}
    </div>
  );
}
