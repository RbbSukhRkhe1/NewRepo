import { Link } from 'react-router-dom';
import { CreationHandsThree } from '../components/CreationHandsThree';
import { CarouselHighlights } from '../components/CarouselHighlights';

const WARM = '#fbbf24';

export function HomePage() {
  return (
    <>
      <section className="relative min-h-[92svh]">
        {/* Light top opacity so fixed `GlobalAmbientBackdrop` glow/particles read through */}
        <div
          className="absolute inset-0 z-0 bg-gradient-to-b from-[#0a1628]/78 via-[#070a12]/96 to-[#070a12]"
          aria-hidden
        />

        <CreationHandsThree />

        {/* Tight top spacing only: keeps hands/gradient effects unchanged; bottom padding unchanged for carousel rhythm */}
        <div className="relative z-10 mx-auto flex min-h-[92svh] max-w-4xl flex-col justify-start px-4 pb-10 pt-4 sm:pb-12 sm:pt-5">
          <div
            className="glass-panel mx-auto w-full max-w-2xl reveal rounded-3xl px-6 pt-5 pb-10 sm:px-10 sm:pt-6 sm:pb-12"
            data-reveal
          >
            <p
              className="font-display text-center text-xs font-semibold uppercase tracking-[0.3em]"
              style={{ color: WARM }}
            >
              Give with clarity
            </p>
            <h1 className="font-display mt-5 text-center text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
              <span className="glitch" data-text="Donate on-chain">
                Donate on-chain
              </span>
              <br aria-hidden />
              <span className="bg-gradient-to-r from-emerald-300 via-lime-200 to-amber-200 bg-clip-text text-transparent">
                Help for real
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-center text-base leading-relaxed text-zinc-400">
              Choose a cause you care about. Donate ETH and follow your gift in a live ledger — clear
              from your wallet to the vault and beyond.
            </p>
            <CarouselHighlights />
          </div>
        </div>
      </section>

      <section className="relative border-t border-white/[0.07] bg-gradient-to-b from-[#070a12] via-[#0a1018] to-[#070a12] pt-12 pb-16 sm:pt-14 sm:pb-20">
        <div className="mx-auto max-w-6xl px-4">
          <header className="mx-auto max-w-2xl text-center reveal" data-reveal>
            <h2 className="font-display text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-[2.75rem] md:leading-[1.12]">
              Wallet to Impact
            </h2>
            <p className="mt-5 text-pretty text-base leading-relaxed text-zinc-500 sm:text-lg">
              Built for donors who want proof — clear goals, verified flows, and a ledger you can inspect
              any time.
            </p>
            <div
              className="mx-auto mt-6 h-px max-w-[12rem] bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent sm:mt-7 sm:max-w-xs"
              aria-hidden
            />
          </header>

          <div className="mt-10 grid gap-6 sm:mt-11 sm:gap-8 md:grid-cols-3">
            {(
              [
                {
                  to: '/causes',
                  title: 'Browse Causes',
                  description:
                    'Discover verified projects with clear goals, transparent budgets, and measurable impact.',
                  accent:
                    'from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-400/25 shadow-emerald-500/10 hover:border-emerald-400/55 hover:shadow-[0_0_48px_-12px_rgba(52,211,153,0.45)]',
                  glow: 'bg-emerald-400/12',
                  focusRing: 'focus-visible:ring-emerald-400/55',
                  arrowClass: 'text-emerald-300 group-hover:text-emerald-200',
                },
                {
                  to: '/donation-interface',
                  title: 'Donate Securely',
                  description:
                    'Connect your wallet and send ETH directly. Receive instant on-chain proof of your donation.',
                  accent:
                    'from-violet-500/22 via-fuchsia-500/8 to-transparent border-violet-400/30 shadow-violet-500/12 hover:border-violet-400/55 hover:shadow-[0_0_48px_-12px_rgba(167,139,250,0.45)]',
                  glow: 'bg-violet-500/15',
                  focusRing: 'focus-visible:ring-violet-400/60',
                  arrowClass: 'text-violet-300 group-hover:text-violet-200',
                },
                {
                  to: '/ledger',
                  title: 'Live Ledger',
                  description:
                    'Watch every donation and payout in real-time. Full transparency on the blockchain.',
                  accent:
                    'from-lime-400/18 via-green-400/12 to-transparent border-lime-400/35 shadow-lime-400/15 hover:border-lime-300/65 hover:shadow-[0_0_48px_-12px_rgba(190,242,100,0.4)]',
                  glow: 'bg-lime-400/14',
                  focusRing: 'focus-visible:ring-lime-300/55',
                  arrowClass: 'text-lime-300 group-hover:text-lime-200',
                },
              ] as const
            ).map((card) => (
              <Link
                key={card.title}
                to={card.to}
                data-reveal
                className={[
                  'no-underline group relative isolate flex min-h-[24rem] w-full flex-col overflow-hidden rounded-3xl border bg-gradient-to-br p-px transition-all duration-300 ease-out sm:min-h-[26.5rem]',
                  'reveal backdrop-blur-xl',
                  'hover:scale-[1.02] focus-visible:scale-[1.02] hover:-translate-y-0.5 focus-visible:-translate-y-0.5',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070a12]',
                  card.focusRing,
                  card.accent,
                ].join(' ')}
              >
                {/* Inner plate — generous vertical rhythm; footer pinned low so body never overlaps → */}
                <div className="relative flex flex-1 min-h-0 flex-col rounded-[1.37rem] border border-white/[0.06] bg-gradient-to-b from-white/[0.07] via-[#0c121c]/92 to-[#070a12]/95 px-9 py-11 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] sm:px-10 sm:py-12 md:px-11 md:py-14">
                  <div
                    className={`pointer-events-none absolute -right-12 -top-10 z-0 h-44 w-44 rounded-full blur-3xl ${card.glow} opacity-[0.65] transition-opacity duration-300 group-hover:opacity-90 sm:h-52 sm:w-52`}
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-28 bg-gradient-to-t from-black/30 to-transparent"
                    aria-hidden
                  />

                  <div className="relative z-[1] shrink-0 pr-4 sm:pr-8">
                    <h3 className="font-display mb-6 text-xl font-bold tracking-tight text-white sm:text-2xl sm:leading-snug md:mb-7">
                      {card.title}
                    </h3>
                    <p className="text-[0.95rem] leading-[1.7] tracking-[0.01em] text-zinc-400 sm:text-base sm:leading-relaxed md:leading-[1.75]">
                      {card.description}
                    </p>
                  </div>

                  <div className="relative z-[2] mt-auto flex shrink-0 justify-end pb-2 pt-12 sm:pt-14 md:pt-16">
                    <span
                      className={[
                        'font-display block min-h-[2.75rem] min-w-[2.75rem] text-right text-3xl font-light tabular-nums leading-none transition-transform duration-300 ease-out sm:text-4xl',
                        'translate-y-[2px]',
                        'group-hover:translate-x-1 group-hover:-translate-y-0',
                        card.arrowClass,
                      ].join(' ')}
                      aria-hidden
                    >
                      →
                    </span>
                  </div>
                </div>
              </Link>
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
              to="/login"
              className={[
                'font-display mt-6 inline-flex items-center justify-center rounded-full px-8 py-3.5',
                'text-sm font-semibold uppercase tracking-[0.18em] text-[#041214]',
                'bg-gradient-to-r from-emerald-400 via-lime-400 to-teal-400',
                'shadow-[0_0_36px_-6px_rgba(34,197,94,0.55),inset_0_1px_0_0_rgba(255,255,255,0.35)]',
                'ring-1 ring-emerald-400/50 ring-offset-2 ring-offset-[#070a12]/80 transition duration-300',
                'hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_0_48px_-4px_rgba(74,222,128,0.62)] hover:ring-emerald-300/65',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0a1018]',
              ].join(' ')}
              aria-label="Join the vault — sign in to your account"
            >
              Join the Vault
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
