import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreationHandsThree } from '../components/CreationHandsThree';

const ACCENT = '#22c55e';
const WARM = '#fbbf24';

export function HomePage() {
  const [vault, setVault] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/config', { credentials: 'include' })
      .then((r) => r.json())
      .then((c: { superRichMasked?: string }) => setVault(c.superRichMasked ?? null))
      .catch(() => setVault(null));
  }, []);

  return (
    <>
      <section className="relative min-h-[92svh]">
        <div
          className="absolute inset-0 z-0 bg-gradient-to-b from-[#0a1628] via-[#070a12] to-[#070a12]"
          aria-hidden
        />

        <CreationHandsThree />

        <div className="relative z-10 mx-auto flex min-h-[92svh] max-w-4xl flex-col justify-start px-4 pb-24 pt-20 sm:pt-24">
          <div
            className="glass-panel mx-auto w-full max-w-2xl reveal rounded-3xl px-6 py-10 sm:px-10 sm:py-12"
            data-reveal
          >
            <p
              className="font-display text-center text-xs font-semibold uppercase tracking-[0.3em]"
              style={{ color: WARM }}
            >
              Give with clarity
            </p>
            <h1 className="font-display mt-5 text-center text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl">
              <span className="glitch" data-text="Donate on-chain.">
                Donate on-chain.
              </span>{' '}
              <span className="bg-gradient-to-r from-emerald-300 via-lime-200 to-amber-200 bg-clip-text text-transparent">
                Help for real.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-center text-base leading-relaxed text-zinc-400">
              Choose a cause you care about. Donate ETH and follow your gift in a live ledger — clear
              from your wallet to the vault and beyond.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/causes"
                className="font-display rounded-full px-8 py-3.5 text-sm font-semibold text-[#041214] shadow-[0_0_28px_-6px_rgba(34,197,94,0.65)] transition hover:brightness-110"
                style={{ background: `linear-gradient(135deg, ${ACCENT}, #5eead4)` }}
              >
                Explore causes
              </Link>
              <Link
                to="/ledger"
                className="rounded-full border border-white/15 px-8 py-3.5 text-sm font-medium text-zinc-200 transition hover:border-emerald-400/40 hover:bg-emerald-500/10 hover:text-white"
              >
                View the ledger
              </Link>
            </div>
            {vault && (
              <p className="mt-10 text-center font-mono text-xs text-zinc-600">
                Community vault <span className="text-zinc-500">{vault}</span>
              </p>
            )}
          </div>
          <p className="mt-16 text-center text-sm text-zinc-600">Scroll for more</p>
          <div className="mx-auto mt-2 h-8 w-px animate-pulse bg-gradient-to-b from-emerald-400/50 to-transparent" aria-hidden />
        </div>
      </section>

      <section className="relative border-t border-white/[0.07] bg-gradient-to-b from-[#070a12] via-[#0a1018] to-[#070a12] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center reveal" data-reveal>
            <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400/90">
              Why Web3 × giving
            </p>
            <h2 className="font-display mt-4 text-3xl font-bold text-white sm:text-4xl">
              Designed for donors who want proof, not promises
            </h2>
            <p className="mt-4 text-zinc-500">
              Every contribution leaves a trace you can inspect — the same transparency nonprofits dream
              of, with the openness blockchains are good at.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3" data-reveal>
            {[
              {
                n: '01',
                t: 'Choose a cause',
                d: 'Read real goals in plain language. No clutter — just what you’re funding.',
              },
              {
                n: '02',
                t: 'Send in ETH',
                d: 'One flow from your connected experience to the vault, with receipts you can keep.',
              },
              {
                n: '03',
                t: 'Watch the ledger',
                d: 'See donations and payouts in a live feed. Accountability as a feature.',
              },
            ].map((item) => (
              <div
                key={item.n}
                className="glass-panel group relative overflow-hidden reveal rounded-2xl p-8 transition hover:border-emerald-400/20"
                data-reveal
              >
                <span className="font-display text-4xl font-bold tabular-nums text-white/[0.06] transition group-hover:text-emerald-400/15">
                  {item.n}
                </span>
                <h3 className="font-display mt-2 text-lg font-semibold text-white">{item.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-500">{item.d}</p>
              </div>
            ))}
          </div>

          <div
            className="mx-auto mt-16 max-w-3xl reveal rounded-2xl border border-amber-400/15 bg-gradient-to-br from-amber-500/[0.07] to-transparent px-8 py-10 text-center"
            data-reveal
          >
            <p className="font-display text-sm font-semibold uppercase tracking-widest text-amber-200/80">
              Ready when you are
            </p>
            <p className="mt-3 text-zinc-400">
              Start with a cause that matters to you — the rest of the journey is spelled out step by
              step.
            </p>
            <Link
              to="/causes"
              className="mt-6 inline-flex rounded-full border border-amber-400/30 bg-amber-500/10 px-6 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/20"
            >
              Browse all causes →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
