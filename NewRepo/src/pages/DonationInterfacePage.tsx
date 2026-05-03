import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRightLeft, Eye, ShieldCheck } from 'lucide-react';
import { apiJson } from '../lib/api';

type Cause = {
  id: number;
  title: string;
  description: string;
  goal_eth: number;
  raised_eth: number;
};

const OUTLINE = [
  {
    title: 'Connect & Confirm',
    description: 'Use your assigned wallet account and choose an ETH amount before signing.',
    Icon: ArrowRightLeft,
  },
  {
    title: 'Direct Wallet to Cause',
    description: 'Funds route directly from your wallet to the selected cause vault contract.',
    Icon: ShieldCheck,
  },
  {
    title: 'On-chain Proof',
    description: 'A transaction hash is generated instantly so the transfer is always verifiable.',
    Icon: Eye,
  },
  {
    title: 'Live Impact Tracking',
    description: 'Progress and ledger events update in real time after successful donation.',
    Icon: Activity,
  },
] as const;

export function DonationInterfacePage() {
  const [causes, setCauses] = useState<Cause[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void apiJson<Cause[]>('/causes')
      .then(setCauses)
      .catch((e: Error) => setErr(e.message));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <section className="glass-panel reveal overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/[0.09] via-transparent to-cyan-500/[0.06] p-7 sm:p-10" data-reveal>
        <p className="font-display text-xs font-semibold uppercase tracking-[0.26em] text-emerald-300/90">
          Donation Interface
        </p>
        <h1 className="font-display mt-3 max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Secure donation flow, built for trust
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-zinc-300">
          This page shows the donation process donors can expect. It highlights transparent steps and
          verification details, not private donor-only information.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            to="/causes"
            className="rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 px-6 py-3 text-sm font-semibold text-[#041214] shadow-[0_0_28px_-10px_rgba(34,197,94,0.6)] transition hover:brightness-105"
          >
            Choose a cause
          </Link>
          <Link
            to="/ledger"
            className="rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-zinc-200 transition hover:border-emerald-300/40 hover:bg-emerald-500/10"
          >
            View live ledger
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {OUTLINE.map((item) => {
          const Icon = item.Icon;
          return (
            <article
              key={item.title}
              className="reveal rounded-2xl border border-white/10 bg-gradient-to-br from-[#0d1722]/92 to-[#0a1018]/92 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
              data-reveal
            >
              <div className="flex items-center gap-3">
                <span className="rounded-lg border border-emerald-300/25 bg-emerald-400/10 p-2 text-emerald-300">
                  <Icon className="h-4 w-4" />
                </span>
                <h2 className="font-display text-lg font-semibold text-white">{item.title}</h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{item.description}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-10 reveal rounded-3xl border border-white/[0.08] bg-[#0a111a]/90 p-6 sm:p-8" data-reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300/85">
              Ready to donate
            </p>
            <h2 className="font-display mt-2 text-2xl font-bold text-white sm:text-3xl">
              Pick a cause and open its donate form
            </h2>
          </div>
          <Link
            to="/causes"
            className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-5 py-2.5 text-sm font-medium text-emerald-200 transition hover:border-emerald-300/50 hover:bg-emerald-400/15"
          >
            Browse all causes <span aria-hidden>→</span>
          </Link>
        </div>

        {err ? (
          <p className="mt-5 text-sm text-rose-300">{err}</p>
        ) : (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {causes.slice(0, 6).map((cause) => (
              <li key={cause.id}>
                <Link
                  to={`/causes/${cause.id}`}
                  className="group block rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-emerald-300/35 hover:bg-emerald-500/[0.06]"
                >
                  <p className="font-display text-lg font-semibold text-white">{cause.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{cause.description}</p>
                  <p className="mt-3 inline-flex items-center text-sm font-medium text-emerald-300">
                    Open donation form
                    <span className="ml-1 transition group-hover:translate-x-1" aria-hidden>
                      →
                    </span>
                  </p>
                </Link>
              </li>
            ))}
            {causes.length === 0 && (
              <li className="rounded-xl border border-white/10 p-4 text-sm text-zinc-500">No causes available yet.</li>
            )}
          </ul>
        )}
      </section>
    </div>
  );
}
