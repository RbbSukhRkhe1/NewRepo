import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadDonationLedger, type DonationLedgerEntry } from '../lib/donationLedger';
import {
  EyebrowLabel,
  PrimaryLinkButton,
  SecondaryLinkButton,
  SectionHeader,
  SurfaceCard,
} from '../components/ui';

type Overview = {
  vault: { addressMasked: string; balanceEth: string | null };
  stats: {
    activeCauses: number;
    ledgerEntries: number;
    totalRaisedEth: number;
    totalDonatedEth: number;
    totalDisbursedEth: number;
  };
};

type JourneyStep = 0 | 1 | 2;

const startSteps = [
  {
    title: '1) Register or sign in',
    body: 'Create a donor or beneficiary account, or sign in with an existing one.',
    to: '/register',
    cta: 'Register',
  },
  {
    title: '2) Donate',
    body: 'Pick a cause and send ETH from your assigned Anvil wallet.',
    to: '/causes',
    cta: 'Go to causes',
  },
  {
    title: '3) Verify',
    body: 'Track each movement in the ledger and user history pages.',
    to: '/ledger',
    cta: 'Open ledger',
  },
];

function shortHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

function formatEth(v: string): string {
  const n = Number.parseFloat(v);
  if (!Number.isFinite(n)) return v;
  return n.toFixed(4);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.max(0, Math.floor(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function HomePage() {
  const [vault, setVault] = useState<string | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [ledger, setLedger] = useState<DonationLedgerEntry[] | null>(null);
  const [journeyStep, setJourneyStep] = useState<JourneyStep>(0);

  useEffect(() => {
    fetch('/api/config', { credentials: 'include' })
      .then((r) => r.json())
      .then((c: { superRichMasked?: string }) => setVault(c.superRichMasked ?? null))
      .catch(() => setVault(null));
  }, []);

  useEffect(() => {
    fetch('/api/overview', { credentials: 'include' })
      .then((r) => r.json())
      .then((o: Overview) => setOverview(o))
      .catch(() => setOverview(null));
  }, []);

  useEffect(() => {
    loadDonationLedger()
      .then((rows) => setLedger(rows))
      .catch(() => setLedger(null));
  }, []);

  const latestDonation = useMemo(() => {
    if (!ledger?.length) return null;
    for (let i = ledger.length - 1; i >= 0; i--) {
      if (ledger[i]?.kind === 'donation_in') return ledger[i];
    }
    return null;
  }, [ledger]);

  const latestDisbursement = useMemo(() => {
    if (!ledger?.length) return null;
    for (let i = ledger.length - 1; i >= 0; i--) {
      if (ledger[i]?.kind === 'disbursement_out') return ledger[i];
    }
    return null;
  }, [ledger]);

  const journeyPreview = useMemo(() => {
    if (journeyStep === 0) return latestDonation;
    if (journeyStep === 2) return latestDisbursement;
    return null;
  }, [journeyStep, latestDonation, latestDisbursement]);

  return (
    <div className="relative w-full overflow-x-hidden bg-black">
      <div className="absolute inset-0 z-0 min-h-full bg-black" />

      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-16 pt-12 text-center sm:pb-20 sm:pt-16 md:pt-20">
        <SectionHeader
          eyebrow="Transparent giving"
          title="Donate transparently with Vaultex"
          body="Pick a cause, send ETH from your assigned test wallet on Anvil, and watch every transfer hit the public ledger. Built for a capstone: real txs, SQLite records, and a clear trail from donors to the vault and out to beneficiary organisations."
        />
        <div className="mt-10 flex w-full flex-col items-center justify-center gap-3 sm:mx-auto sm:w-auto sm:flex-row sm:flex-wrap sm:gap-4">
          <PrimaryLinkButton to="/causes" className="px-8">
            Donate now
          </PrimaryLinkButton>
          <SecondaryLinkButton to="/ledger" className="px-8">
            View the ledger
          </SecondaryLinkButton>
        </div>
        {latestDonation && (
          <p className="mt-4 text-xs text-[var(--text-muted-1)]">
            Live ledger updates every {Math.round(6000 / 1000)}s · Last donation {formatEth(latestDonation.amountEth)} ETH ·{' '}
            {shortHash(latestDonation.txHash)} · {timeAgo(latestDonation.recordedAt)}
          </p>
        )}
        {vault && (
          <p className="mt-12 break-all font-mono text-xs text-[var(--text-muted-2)] sm:break-normal">
            Main vault (masked): <span className="text-[var(--text-muted-1)]">{vault}</span>
          </p>
        )}

        <div className="mt-12 text-left">
          <SurfaceCard className="rounded-3xl border-[var(--border-chrome-2)] shadow-[0_0_60px_var(--fx-glow-accent-low)]">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <EyebrowLabel>Donation journey</EyebrowLabel>
                <h2 className="mt-2 text-balance text-xl font-semibold text-[var(--text-high-3)] sm:text-2xl">
                  Follow a donation end-to-end
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted-1)]">
                  This is the story users care about: <span className="text-[var(--text-high-3)]">who sent</span>,{' '}
                  <span className="text-[var(--text-high-3)]">where it landed</span>, and{' '}
                  <span className="text-[var(--text-high-3)]">when it reached a beneficiary</span>.
                </p>
              </div>

              <div className="flex w-full flex-wrap items-center justify-start gap-2 md:w-auto md:justify-end">
                {(
                  [
                    { id: 0, label: 'Donor → Vault' },
                    { id: 1, label: 'In the Vault' },
                    { id: 2, label: 'Vault → Beneficiary' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setJourneyStep(t.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      journeyStep === t.id
                        ? 'border-[var(--border-accent-soft)] bg-[color:rgb(34_197_94_/_0.14)] text-[var(--text-high-2)]'
                        : 'border-[var(--border-chrome-1)] bg-[var(--overlay-surface-soft)] text-[var(--text-muted-1)] hover:bg-[color:rgb(255_255_255_/_0.08)]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Flow</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Step {journeyStep + 1}/3
                  </p>
                </div>

                <div className="relative mt-5">
                  <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 bg-gradient-to-r from-cyan-400/0 via-cyan-400/40 to-cyan-400/0 blur-[6px]" />

                  <div className="relative grid grid-cols-3 items-center">
                    {(['Donor', 'Vault', 'Beneficiary'] as const).map((label, idx) => {
                      const active =
                        (journeyStep === 0 && idx <= 1) ||
                        (journeyStep === 1 && idx === 1) ||
                        (journeyStep === 2 && idx >= 1);
                      const dot =
                        (journeyStep === 0 && idx === 0) ||
                        (journeyStep === 1 && idx === 1) ||
                        (journeyStep === 2 && idx === 2);
                      return (
                        <div key={label} className="flex flex-col items-center">
                          <div
                            className={`grid h-10 w-10 place-items-center rounded-full border transition-colors ${
                              active ? 'border-cyan-400/60 bg-cyan-400/10' : 'border-white/10 bg-white/[0.02]'
                            }`}
                          >
                            <div
                              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                                dot ? 'bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.7)]' : 'bg-white/15'
                              }`}
                            />
                          </div>
                          <p className={`mt-2 text-xs font-semibold ${active ? 'text-white' : 'text-zinc-500'}`}>
                            {label}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pointer-events-none absolute left-0 top-1/2 h-8 w-full -translate-y-1/2">
                    <div
                      className="absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.8)] transition-transform duration-500 ease-out"
                      style={{
                        transform:
                          journeyStep === 0
                            ? 'translateX(16%)'
                            : journeyStep === 1
                              ? 'translateX(50%)'
                              : 'translateX(84%)',
                      }}
                    />
                  </div>
                </div>

                <div className="mt-5 grid gap-2 text-sm text-zinc-400 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Donor</p>
                    <p className="mt-1 text-zinc-200">Sends ETH</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Vault</p>
                    <p className="mt-1 text-zinc-200">Receives + holds</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Beneficiary</p>
                    <p className="mt-1 text-zinc-200">Gets disbursed</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Ledger preview</p>
                <p className="mt-2 text-sm text-zinc-400">
                  {journeyStep === 1
                    ? 'The vault accumulates incoming donations and later disburses out.'
                    : 'A real entry from the ledger, tied to this step.'}
                </p>

                {journeyStep === 1 ? (
                  <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                    <p className="text-sm font-semibold text-white">Vault status</p>
                    <p className="mt-2 font-mono text-xs text-zinc-300">
                      {overview?.vault.addressMasked ?? vault ?? '—'}
                    </p>
                    <p className="mt-2 text-xs text-zinc-500">Balance</p>
                    <p className="mt-1 font-mono text-lg text-cyan-200">
                      {overview?.vault.balanceEth ? `${parseFloat(overview.vault.balanceEth).toFixed(4)} ETH` : '—'}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        to="/account"
                        className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white hover:bg-white/[0.06]"
                      >
                        View your wallet
                      </Link>
                      <Link
                        to="/ledger"
                        className="rounded-lg px-3 py-2 text-xs font-semibold text-black"
                        style={{ backgroundColor: 'var(--accent-core)' }}
                      >
                        Open ledger
                      </Link>
                    </div>
                  </div>
                ) : journeyPreview ? (
                  <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {journeyPreview.fromDisplayName} → {journeyPreview.toDisplayName}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">{new Date(journeyPreview.recordedAt).toLocaleString()}</p>
                      </div>
                      <p className="whitespace-nowrap font-mono text-base font-bold text-amber-100">
                        {formatEth(journeyPreview.amountEth)} ETH
                      </p>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">{journeyPreview.causeName ? `Cause: ${journeyPreview.causeName}` : ' '}</p>
                    <p className="mt-2 font-mono text-xs text-zinc-600">{shortHash(journeyPreview.txHash)}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        to="/ledger"
                        className="rounded-lg px-3 py-2 text-xs font-semibold text-black"
                        style={{ backgroundColor: 'var(--accent-core)' }}
                      >
                        See in ledger
                      </Link>
                      <Link
                        to="/account"
                        className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white hover:bg-white/[0.06]"
                      >
                        Your history
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm text-zinc-500">
                    No matching ledger entries yet. Make a donation, then come back.
                  </div>
                )}
              </div>
            </div>
          </SurfaceCard>
        </div>
      </div>

      <section className="relative z-10 border-t border-[var(--border-chrome-1)] bg-black px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-lg font-semibold text-[var(--text-high-3)] sm:text-xl">How it works</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-[var(--text-muted-1)]">
            Follow this flow for the fastest first-time experience.
          </p>
          <ul className="mt-8 grid list-none gap-4 md:grid-cols-3">
            {startSteps.map((step) => (
              <li
                key={step.title}
                className="vtx-surface reveal reveal--visible rounded-2xl p-5 text-left transition-transform duration-150 hover:-translate-y-0.5 hover:border-[var(--border-accent-soft)]"
              >
                <p className="text-sm font-semibold text-[var(--text-high-3)]">{step.title}</p>
                <p className="mt-2 text-sm text-[var(--text-muted-1)]">{step.body}</p>
                <Link
                  to={step.to}
                  className="mt-4 inline-block text-sm font-medium text-[var(--accent-bright-2)] hover:text-[var(--accent-bright-3)]"
                >
                  {step.cta} →
                </Link>
              </li>
            ))}
          </ul>

          {/* Live overview + How this demo works removed per request */}
        </div>
      </section>
    </div>
  );
}
