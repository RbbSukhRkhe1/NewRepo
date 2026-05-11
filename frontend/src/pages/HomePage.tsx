import { useEffect, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { PrimaryLinkButton, SecondaryLinkButton } from '../components/ui';

type HeroSlide = {
  title: string;
  description: string;
  accent: string;
  glow: string;
};

const carouselPanelBg = {
  dark: 'rgba(12, 26, 42, 0.82)',
  light: 'rgba(248, 252, 255, 0.94)',
} as const;

const heroSlides: HeroSlide[] = [
  {
    title: 'Transparent records',
    description:
      'Donations and disbursements show up in the app ledger—addresses are masked where the API provides masked fields (see docs/PRIVACY.md).',
    accent: '#5ef6de',
    glow: 'rgba(74, 241, 212, 0.42)',
  },
  {
    title: 'Honest capstone scope',
    description:
      'Vaultex demos on local Anvil: anyone who can reach that RPC sees the dev chain—not public-internet secrecy. Pair that honesty with docs/DEMO.md when you walk markers through the UI.',
    accent: '#ca90ff',
    glow: 'rgba(194, 118, 255, 0.4)',
  },
  {
    title: 'Stories without inflated metrics',
    description:
      'We highlight causes, receipts, and ledger history instead of fabricated dashboards—your trust narrative comes from reproducible clicks, not made-up KPIs.',
    accent: '#bcff57',
    glow: 'rgba(188, 255, 87, 0.42)',
  },
];

const HOW_IT_WORKS: { step: string; title: string; body: string }[] = [
  {
    step: '1 · Donate',
    title: 'Pick a cause, send ETH',
    body: 'Logged-in donors use assigned dev wallets to fund causes; the ledger stores each gift with recognizable labels where available.',
  },
  {
    step: '2 · Vault',
    title: 'Route through Vaultex',
    body: 'The demo vault pools activity so disbursements remain explainable—a teaching stand-in for transparent treasury routing.',
  },
  {
    step: '3 · Disburse',
    title: 'Release to beneficiaries',
    body: 'Admins allocate per course rules while the public ledger keeps classmates and reviewers aligned on what moved when.',
  },
];

type BenefitTone = 'teal' | 'violet' | 'lime';

/** Join-the-Vault row: Wallet-style glass / neon (dark) & saturated pastel (light) */
const miniBenefitStyles: Record<
  BenefitTone,
  {
    shellLight: string;
    shellDark: string;
    iconLight: string;
    iconDark: string;
    orbLight: string;
    orbDark: string;
    hairLight: string;
    hairDark: string;
    titleLight: string;
    titleDark: string;
    blurbLight: string;
    blurbDark: string;
    svgLight: string;
    svgDark: string;
    titleGlowDark?: string;
  }
> = {
  teal: {
    shellLight:
      'border-2 border-teal-700/42 bg-[linear-gradient(168deg,#c8eae4_0%,#aedfd6_52%,#d4f4ee_100%)] shadow-[0_14px_36px_rgba(16,107,96,0.22),inset_0_1px_0_rgba(255,255,255,0.87),inset_0_-1px_0_rgba(15,118,107,0.06)]',
    shellDark:
      'before:pointer-events-none before:absolute before:inset-0 before:z-0 before:rounded-[inherit] before:bg-[radial-gradient(ellipse_118%_92%_at_42%_-32%,rgba(56,246,220,0.32),transparent_58%)] before:opacity-[0.88] before:[content:_""] after:pointer-events-none after:absolute after:inset-0 after:z-0 after:rounded-[inherit] after:bg-[radial-gradient(ellipse_95%_65%_at_106%_102%,rgba(45,235,218,0.14),transparent_68%)] after:[content:_""] border border-teal-300/42 bg-[linear-gradient(168deg,rgba(10,62,74,0.58),rgba(6,42,56,0.4)_55%,rgba(5,26,42,0.48))] shadow-[0_16px_40px_rgba(0,4,14,0.54),inset_0_1px_0_rgba(255,255,255,0.09),inset_0_0_0_1px_rgba(94,246,222,0.08),0_0_50px_rgba(45,245,205,0.15)] backdrop-blur-md',
    iconLight:
      'border-teal-800/38 bg-gradient-to-br from-white via-teal-50 to-teal-100/96 text-teal-950 shadow-[0_12px_28px_rgba(15,118,107,0.22),inset_0_1px_0_rgba(255,255,255,0.94)] ring-2 ring-teal-500/45',
    iconDark:
      'border-teal-200/34 bg-teal-200/[0.1] text-teal-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_30px_rgba(45,245,206,0.42),0_0_54px_rgba(45,220,215,0.16)] ring-1 ring-teal-100/22 backdrop-blur-sm',
    orbLight: '-right-10 -top-5 h-[8.75rem] w-[8.75rem] bg-teal-500/[0.34]',
    orbDark: '-right-8 top-[-0.85rem] h-[7.75rem] w-[7.75rem] bg-teal-400/24 opacity-95',
    hairLight: 'from-transparent via-teal-700/52 to-transparent',
    hairDark: 'from-transparent via-teal-200/38 to-transparent',
    titleLight: 'text-[#053535]',
    titleDark: 'text-[#dcfff8]',
    blurbLight: 'text-[#0f3836]',
    blurbDark: 'text-[#cceef0]/88',
    svgLight: 'text-teal-950',
    svgDark: 'text-teal-100',
    titleGlowDark: '0 0 28px rgba(45,245,206,0.28)',
  },
  violet: {
    shellLight:
      'border-2 border-violet-700/45 bg-[linear-gradient(170deg,#dfd5ff_0%,#cbc0ff_48%,#e8e4ff_100%)] shadow-[0_14px_36px_rgba(91,71,154,0.24),inset_0_1px_0_rgba(255,255,255,0.85),inset_0_-1px_0_rgba(109,71,212,0.07)]',
    shellDark:
      'before:pointer-events-none before:absolute before:inset-0 before:z-0 before:rounded-[inherit] before:bg-[radial-gradient(ellipse_120%_94%_at_92%_-28%,rgba(196,138,255,0.34),transparent_56%)] before:opacity-[0.9] before:[content:_""] after:pointer-events-none after:absolute after:inset-0 after:z-0 after:rounded-[inherit] after:bg-[radial-gradient(ellipse_92%_60%_at_-4%_104%,rgba(170,118,248,0.16),transparent_66%)] after:[content:_""] border border-violet-400/44 bg-[linear-gradient(170deg,rgba(48,20,92,0.55),rgba(28,12,64,0.4)_53%,rgba(18,14,54,0.48))] shadow-[0_16px_40px_rgba(4,2,26,0.58),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_0_0_1px_rgba(199,154,255,0.12),0_0_52px_rgba(183,111,255,0.16)] backdrop-blur-md',
    iconLight:
      'border-violet-900/38 bg-gradient-to-br from-white via-violet-100 to-violet-200/93 text-[#391f6b] shadow-[0_12px_28px_rgba(91,71,154,0.26),inset_0_1px_0_rgba(255,255,255,0.93)] ring-2 ring-violet-500/48',
    iconDark:
      'border-violet-200/38 bg-violet-300/[0.1] text-violet-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.11),0_0_34px_rgba(198,154,255,0.45),0_0_58px_rgba(170,118,246,0.18)] ring-1 ring-violet-200/25 backdrop-blur-sm',
    orbLight: '-left-14 top-28 h-[9.5rem] w-[9.5rem] bg-violet-500/[0.38]',
    orbDark: '-left-10 bottom-[-1.75rem] h-[8rem] w-[8rem] bg-violet-500/[0.22] opacity-[0.9]',
    hairLight: 'from-transparent via-violet-700/54 to-transparent',
    hairDark: 'from-transparent via-violet-200/42 to-transparent',
    titleLight: 'text-[#2a1552]',
    titleDark: 'text-[#f3eaff]',
    blurbLight: 'text-[#3b2b64]',
    blurbDark: 'text-[#e5ddff]/86',
    svgLight: 'text-violet-950',
    svgDark: 'text-violet-100',
    titleGlowDark: '0 0 30px rgba(198,154,255,0.28)',
  },
  lime: {
    shellLight:
      'border-2 border-lime-800/42 bg-[linear-gradient(169deg,#d4edc0_0%,#bde8a8_52%,#e0f7d8_100%)] shadow-[0_14px_36px_rgba(56,98,42,0.23),inset_0_1px_0_rgba(255,255,255,0.82),inset_0_-1px_0_rgba(73,131,53,0.07)]',
    shellDark:
      'before:pointer-events-none before:absolute before:inset-0 before:z-0 before:rounded-[inherit] before:bg-[radial-gradient(ellipse_110%_90%_at_52%_-30%,rgba(184,255,108,0.26),transparent_56%)] before:opacity-[0.92] before:[content:_""] after:pointer-events-none after:absolute after:inset-0 after:z-0 after:rounded-[inherit] after:bg-[radial-gradient(ellipse_95%_55%_at_98%_102%,rgba(160,246,118,0.14),transparent_66%)] after:[content:_""] border border-lime-300/46 bg-[linear-gradient(169deg,rgba(36,74,26,0.56),rgba(18,58,26,0.4)_53%,rgba(14,62,34,0.48))] shadow-[0_16px_40px_rgba(0,14,4,0.56),inset_0_1px_0_rgba(255,255,255,0.09),inset_0_0_0_1px_rgba(190,255,130,0.11),0_0_50px_rgba(140,246,104,0.2)] backdrop-blur-md',
    iconLight:
      'border-lime-900/38 bg-gradient-to-br from-white via-lime-100 to-lime-200/93 text-[#1e4614] shadow-[0_12px_28px_rgba(73,131,53,0.25),inset_0_1px_0_rgba(255,255,255,0.93)] ring-2 ring-lime-600/44',
    iconDark:
      'border-lime-200/38 bg-lime-200/[0.1] text-lime-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_34px_rgba(184,255,108,0.4),0_0_60px_rgba(140,240,118,0.18)] ring-1 ring-lime-200/22 backdrop-blur-sm',
    orbLight: 'left-14 -top-12 h-[8.75rem] w-[8.75rem] bg-lime-500/[0.36]',
    orbDark: 'left-1/2 top-[-1.25rem] h-[7.25rem] w-[7.25rem] -translate-x-1/2 bg-lime-400/[0.2] opacity-90',
    hairLight: 'from-transparent via-lime-700/54 to-transparent',
    hairDark: 'from-transparent via-lime-200/43 to-transparent',
    titleLight: 'text-[#163814]',
    titleDark: 'text-[#edffe6]',
    blurbLight: 'text-[#2a4a22]',
    blurbDark: 'text-[#dff7d9]/87',
    svgLight: 'text-lime-950',
    svgDark: 'text-lime-100',
    titleGlowDark: '0 0 30px rgba(184,255,130,0.22)',
  },
};

const VAULT_JOIN_BENEFITS: {
  title: string;
  blurb: string;
  icon: ReactElement;
  tone: BenefitTone;
}[] = [
  {
    tone: 'teal',
    title: 'Ledger receipts',
    blurb: 'Each gift shows up with a hash row you can line up against the cause you picked.',
    icon: <path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />,
  },
  {
    tone: 'violet',
    title: 'Explainable flow',
    blurb: 'Causes, ledger, and accounts share one narrative for markers—no mystery funnel.',
    icon: <path d="M4 18h3V8H4v10zm5 0h3V4H9v14zm5 0h3v-7h-3v7zm5 0h3V9h-3v9z" />,
  },
  {
    tone: 'lime',
    title: 'Classroom-safe',
    blurb: 'Seeded logins and SQLite data keep the story reproducible on any laptop.',
    icon: (
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41 1.01 4.22 2.09C11.59 5.01 13.26 4 15 4 17.5 4 19.5 6 19.5 8.5c0 3.78-3.4 6.86-8.55 11.53L12 21.35z" />
    ),
  },
];

export function HomePage() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const [isLightMode, setIsLightMode] = useState(
    () => typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light',
  );

  useEffect(() => {
    if (isCarouselPaused) return;
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 3400);
    return () => window.clearInterval(timer);
  }, [isCarouselPaused]);

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => setIsLightMode(root.getAttribute('data-theme') === 'light');
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const goNext = () => setActiveSlide((prev) => (prev + 1) % heroSlides.length);
  const goPrev = () => setActiveSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);

  return (
    <div className="relative w-full overflow-x-hidden bg-[var(--bg-base)]">
      <div className="absolute inset-0 z-0 min-h-full bg-[var(--bg-base)]" />
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(rgba(126,149,182,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(126,149,182,0.08)_1px,transparent_1px)] bg-[size:68px_68px] [mask-image:radial-gradient(ellipse_at_center,black_26%,transparent_78%)] opacity-35" />
      <div className="pointer-events-none absolute -left-24 top-8 z-0 h-72 w-72 motion-safe:animate-[pulse_9s_ease-in-out_infinite] rounded-full bg-teal-400/10 blur-3xl motion-reduce:animate-none" />
      <div className="pointer-events-none absolute -right-20 top-24 z-0 h-80 w-80 motion-safe:animate-[pulse_11s_ease-in-out_infinite] rounded-full bg-violet-500/10 blur-3xl motion-reduce:animate-none" />

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-8 pt-3 text-center sm:pb-10 sm:pt-4 md:pt-5">
        <div className="pointer-events-none absolute left-1/2 top-[90px] h-64 w-[560px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(45,245,173,0.24),rgba(45,245,173,0.03)_48%,transparent_70%)] blur-2xl" />
        <div className="pointer-events-none absolute left-1/2 top-[176px] h-52 w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(11,21,39,0.95),transparent_70%)]" />

        <section
          className={`relative mx-auto max-w-4xl rounded-[30px] px-7 py-8 backdrop-blur-xl sm:px-10 sm:py-9 ${
            isLightMode
              ? 'border border-[rgba(165,185,211,0.38)] bg-[linear-gradient(155deg,rgba(251,253,255,0.96),rgba(237,244,252,0.9))] shadow-[0_18px_34px_rgba(76,103,136,0.14)]'
              : 'border border-white/[0.08] bg-[linear-gradient(155deg,rgba(15,24,41,0.74),rgba(8,13,24,0.58))] shadow-[0_18px_42px_rgba(0,0,0,0.36),0_0_40px_rgba(45,245,173,0.1)]'
          }`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-muted-2)]">
            Vaultex · transparent giving prototype
          </p>
          <h1
            className={`mt-3 text-balance text-4xl font-bold leading-[1.08] tracking-[-0.035em] sm:text-[2.75rem] sm:leading-[1.06] ${
              isLightMode ? 'text-[#0f172a]' : 'text-[var(--text-high-3)]'
            }`}
          >
            Charitable giving with a public receipt trail
          </h1>
          <div className="mx-auto mt-4 flex w-full max-w-3xl flex-col items-center px-2 text-center sm:px-3">
            <p
              className={`mx-auto max-w-[min(100%,38rem)] text-balance text-base font-medium leading-relaxed sm:text-lg ${
                isLightMode ? 'text-[#1e293b]' : 'text-[var(--text-high-2)]'
              }`}
            >
              Vaultex is a capstone web app: causes, donations, and ledger lines you can show in class without inventing vanity metrics.
            </p>
            <p
              className={`mx-auto mt-2 w-full max-w-[min(100%,40rem)] text-balance text-sm leading-relaxed sm:text-[0.9375rem] ${
                isLightMode ? 'text-slate-600' : 'text-[var(--text-muted-1)]'
              }`}
            >
              Roles, masking, and what “public” means live in{' '}
              <code className="rounded bg-black/[0.06] px-1.5 py-0.5 font-mono text-[0.8rem] text-[var(--text-high-2)] dark:bg-white/10">
                docs/PRIVACY.md
              </code>
              .
            </p>
            <aside
              className={`mt-4 w-full max-w-xl rounded-2xl border px-4 py-3 text-left text-sm leading-snug ${
                isLightMode
                  ? 'border-amber-800/15 bg-amber-50/90 text-amber-950/90'
                  : 'border-amber-400/25 bg-amber-500/10 text-amber-100/95'
              }`}
            >
              <p className="font-semibold uppercase tracking-wide text-[0.65rem] opacity-90">Demo honesty</p>
              <p className="mt-1.5 text-[0.8125rem] leading-relaxed opacity-95">
                Runs against local Anvil by default—great for pedagogy, not a claim of mainnet privacy or production compliance.
              </p>
            </aside>
            <div className="mx-auto mt-6 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:gap-4">
              <PrimaryLinkButton to="/causes" className="justify-center px-8 py-3 text-base">
                Browse causes
              </PrimaryLinkButton>
              <SecondaryLinkButton to="/ledger" className="justify-center px-8 py-3 text-base">
                View public ledger
              </SecondaryLinkButton>
            </div>
            <p className="mt-3 text-[0.8125rem] text-[var(--text-muted-2)]">
              Need the walkthrough? Mirror the pace in{' '}
              <span className="font-medium text-[var(--text-muted-1)]">docs/DEMO.md</span>.
            </p>
          </div>

          <div
            className="mx-auto mt-5 w-full max-w-2xl"
            onMouseEnter={() => setIsCarouselPaused(true)}
            onMouseLeave={() => setIsCarouselPaused(false)}
          >
            <div
              className={`relative min-h-[278px] overflow-hidden rounded-[26px] sm:min-h-[308px] ${
                isLightMode
                  ? 'border border-[rgba(165,185,211,0.42)] bg-white/70 shadow-[0_14px_28px_rgba(76,103,136,0.12)] backdrop-blur-md'
                  : 'border border-white/10 bg-slate-950/40 shadow-[0_18px_40px_rgba(0,0,0,0.42)] backdrop-blur-md'
              }`}
            >
              {!isLightMode ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_85%_70%_at_50%_35%,rgba(94,246,222,0.14),transparent_62%)]"
                />
              ) : (
                <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(94,246,222,0.06),transparent_42%)]" />
              )}

              <div className="relative min-h-[278px] overflow-x-hidden sm:min-h-[308px]">
              {heroSlides.map((slide, idx) => (
                <article
                  key={slide.title}
                  className={`absolute inset-0 flex min-h-0 flex-col items-center justify-center gap-5 px-6 pb-16 pt-16 text-center transition-all duration-700 sm:gap-6 sm:px-8 sm:pb-20 sm:pt-[4.75rem] ${
                    idx === activeSlide ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
                  }`}
                  style={{
                    background: isLightMode ? carouselPanelBg.light : carouselPanelBg.dark,
                  }}
                  aria-hidden={idx !== activeSlide}
                >
                  <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center text-center">
                    <p
                      className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${
                        isLightMode ? 'text-slate-600' : ''
                      }`}
                      style={isLightMode ? undefined : { color: slide.accent }}
                    >
                      Trust model · slide {idx + 1}
                    </p>
                    <h3
                      className={`mt-2 text-2xl font-bold leading-tight tracking-[-0.02em] sm:text-3xl ${
                        isLightMode ? 'text-[#0f172a]' : 'text-white'
                      }`}
                    >
                      {slide.title}
                    </h3>
                    <p
                      className={`mt-3 max-w-xl text-sm leading-relaxed sm:text-[0.9375rem] ${
                        isLightMode ? 'text-slate-700' : 'text-slate-200/90'
                      }`}
                    >
                      {slide.description}
                    </p>
                  </div>

                  <div className="relative z-10 mt-2 flex w-full shrink-0 justify-center px-2">
                    <span
                      className={`text-center text-[11px] font-semibold uppercase tracking-[0.16em] sm:text-xs ${
                        isLightMode ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      Pause on hover · motion-safe auto-advance
                    </span>
                  </div>
                </article>
              ))}

              <button
                type="button"
                onClick={goPrev}
                className="invisible absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/35 p-3 text-white shadow-[0_0_24px_rgba(80,233,255,0.24)] transition hover:scale-105 hover:border-cyan-300/55 hover:shadow-[0_0_30px_rgba(80,233,255,0.4)]"
                aria-label="Previous slide"
                aria-hidden="true"
                tabIndex={-1}
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={goNext}
                className="invisible absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/35 p-3 text-white shadow-[0_0_24px_rgba(186,115,255,0.24)] transition hover:scale-105 hover:border-violet-300/55 hover:shadow-[0_0_30px_rgba(186,115,255,0.4)]"
                aria-label="Next slide"
                aria-hidden="true"
                tabIndex={-1}
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>

              <div
                className="pointer-events-none absolute bottom-3.5 left-1/2 z-30 flex max-w-[min(92%,18rem)] -translate-x-1/2 items-center gap-2 sm:bottom-4 sm:gap-2"
                role="presentation"
              >
                {heroSlides.map((slide, idx) => (
                  <button
                    key={slide.title}
                    type="button"
                    onClick={() => setActiveSlide(idx)}
                    className={`pointer-events-auto rounded-full border transition-[width,height,box-shadow,background-color,border-color] duration-[580ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      idx === activeSlide
                        ? isLightMode
                          ? `h-[5px] w-[1.2rem] border-slate-500/38 sm:h-1 sm:w-[1.35rem]`
                          : `h-[5px] w-[1.35rem] border-cyan-200/70 sm:h-1 sm:w-6`
                        : isLightMode
                          ? 'h-[3.5px] w-[3.5px] border-slate-500/45 bg-slate-600/12'
                          : 'h-[3.5px] w-[3.5px] border-white/52 bg-white/18'
                    }`}
                    style={
                      idx === activeSlide
                        ? {
                            background: slide.accent,
                            boxShadow: isLightMode
                              ? `0 0 8px rgba(80,210,188,0.32), 0 0 12px ${slide.glow}`
                              : `0 0 10px rgba(94,246,222,0.65), 0 0 18px rgba(45,235,218,0.35), 0 0 12px ${slide.glow}`,
                          }
                        : undefined
                    }
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className={`mx-auto mt-12 max-w-5xl rounded-[28px] border px-5 py-8 sm:px-10 sm:py-10 ${
            isLightMode
              ? 'border-slate-200/80 bg-white/75 shadow-[0_14px_40px_rgba(30,58,95,0.08)]'
              : 'border-white/10 bg-[var(--surface-panel-overlay)]/80 shadow-[0_18px_48px_rgba(0,8,22,0.42)]'
          }`}
          aria-labelledby="how-it-works-heading"
        >
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--text-muted-2)]">
              Flow
            </p>
            <h2 id="how-it-works-heading" className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-high-3)] sm:text-3xl">
              How it works
            </h2>
            <p className={`mt-2 text-sm leading-relaxed sm:text-base ${isLightMode ? 'text-slate-600' : 'text-[var(--text-muted-1)]'}`}>
              Three beats we repeat in UI and in docs: donate, pool in the demo vault, disburse with ledger proof.
            </p>
          </div>
          <ol className="mt-8 grid list-none gap-4 p-0 sm:grid-cols-3 sm:gap-5">
            {HOW_IT_WORKS.map((row) => (
              <li
                key={row.title}
                className={`rounded-2xl border px-4 py-5 text-left ${
                  isLightMode
                    ? 'border-slate-200 bg-slate-50/90'
                    : 'border-white/[0.08] bg-black/25'
                }`}
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent-bright-2)]">{row.step}</p>
                <p className="mt-2 text-lg font-semibold text-[var(--text-high-3)]">{row.title}</p>
                <p className={`mt-2 text-sm leading-relaxed ${isLightMode ? 'text-slate-600' : 'text-[var(--text-muted-1)]'}`}>
                  {row.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12">
          <h2 className="text-center text-3xl font-bold tracking-[-0.02em] text-[var(--text-high-3)] sm:text-4xl">
            Go deeper in the app
          </h2>
          <div className="mx-auto mt-4 max-w-3xl text-center">
            <p className={`text-balance text-base font-medium leading-relaxed sm:text-lg ${isLightMode ? 'text-[#1f2937]' : 'text-[var(--text-high-2)]'}`}>
              Jump from here into the same screens we reference in the demo script.
            </p>
            <p
              className={`mx-auto mt-2 max-w-2xl text-balance text-sm leading-relaxed sm:text-base ${
                isLightMode ? 'text-slate-600' : 'text-[var(--text-muted-1)]'
              }`}
            >
              Prefer the giving flow? Hit Donate after you have looked at causes and the ledger.
            </p>
          </div>
          <div className="mt-8 grid gap-5 text-left md:grid-cols-3">
            <Link
              to="/causes"
              className="group relative isolate flex min-h-[270px] flex-col overflow-hidden rounded-3xl p-8 transition duration-300 ease-out hover:-translate-y-1 hover:shadow-[var(--elevation-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] vtx-surface"
            >
              <span
                className={`pointer-events-none absolute -right-24 top-24 h-[11rem] w-[11rem] rounded-full blur-3xl ${isLightMode ? 'bg-teal-500/[0.18]' : 'bg-teal-400/10 opacity-80'}`}
                aria-hidden
              />
              <div
                className={`relative z-[1] mb-6 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${isLightMode ? 'border-teal-700/35 bg-white/70 text-teal-950' : 'border-teal-200/20 bg-white/[0.06] text-teal-100'} shadow-[var(--elevation-1)]`}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
                  <path d="M12 3l8 4v5c0 5.25-3.45 8.71-8 10-4.55-1.29-8-4.75-8-10V7l8-4zm0 2.18L6 8v4c0 4.13 2.54 6.98 6 8.12 3.46-1.14 6-3.99 6-8.12V8l-6-2.82z" />
                </svg>
              </div>
              <h3
                className={`relative z-[1] text-2xl font-bold ${isLightMode ? 'text-[var(--text-high-3)]' : 'text-[var(--text-high-3)]'}`}
              >
                Browse Causes
              </h3>
              <p
                className={`relative z-[1] mt-3 text-sm font-medium leading-relaxed ${isLightMode ? 'text-slate-700' : 'text-[var(--text-muted-1)]'}`}
              >
                Discover verified projects with clear goals, transparent budgets, and measurable impact.
              </p>
              <span
                className="relative z-[1] mt-auto self-end text-3xl font-semibold text-[var(--accent-bright-2)] transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden="true"
              >
                →
              </span>
            </Link>

            <Link
              to="/donate"
              className="group relative isolate flex min-h-[270px] flex-col overflow-hidden rounded-3xl p-8 transition duration-300 ease-out hover:-translate-y-1 hover:shadow-[var(--elevation-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] vtx-surface"
            >
              <span
                className={`pointer-events-none absolute -left-28 bottom-0 h-[12rem] w-[12rem] rounded-full blur-3xl ${isLightMode ? 'bg-violet-500/[0.18]' : 'bg-violet-500/12 opacity-85'}`}
                aria-hidden
              />
              <div
                className={`relative z-[1] mb-6 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${isLightMode ? 'border-violet-800/25 bg-white/70 text-[#391f6b]' : 'border-violet-300/22 bg-white/[0.06] text-violet-50'} shadow-[var(--elevation-1)]`}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
                  <path d="M17 8V7a5 5 0 10-10 0v1H5v13h14V8h-2zm-8 0V7a3 3 0 016 0v1H9zm3 8.8a2.2 2.2 0 112.2-2.2A2.2 2.2 0 0112 16.8z" />
                </svg>
              </div>
              <h3
                className="relative z-[1] text-2xl font-bold text-[var(--text-high-3)]"
              >
                Donate Securely
              </h3>
              <p
                className={`relative z-[1] mt-3 text-sm font-medium leading-relaxed ${isLightMode ? 'text-slate-700' : 'text-[var(--text-muted-1)]'}`}
              >
                Connect your wallet and send ETH directly. Receive instant on-chain proof of your donation.
              </p>
              <span
                className="relative z-[1] mt-auto self-end text-3xl font-semibold text-[var(--accent-bright-2)] transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden="true"
              >
                →
              </span>
            </Link>

            <Link
              to="/ledger"
              className="group relative isolate flex min-h-[270px] flex-col overflow-hidden rounded-3xl p-8 transition duration-300 ease-out hover:-translate-y-1 hover:shadow-[var(--elevation-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] vtx-surface"
            >
              <span
                className={`pointer-events-none absolute left-16 -top-20 h-[10rem] w-[10rem] rounded-full blur-3xl ${isLightMode ? 'bg-lime-500/[0.16]' : 'bg-lime-400/10 opacity-85'}`}
                aria-hidden
              />
              <div
                className={`relative z-[1] mb-6 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${isLightMode ? 'border-lime-900/25 bg-white/70 text-[#1e3d14]' : 'border-lime-200/20 bg-white/[0.06] text-lime-50'} shadow-[var(--elevation-1)]`}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
                  <path d="M4 4h16v2H4zm2 4h12v12H6zm3 3v6h2v-6zm4 2v4h2v-4z" />
                </svg>
              </div>
              <h3
                className="relative z-[1] text-2xl font-bold text-[var(--text-high-3)]"
              >
                Live Ledger
              </h3>
              <p
                className={`relative z-[1] mt-3 text-sm font-medium leading-relaxed ${isLightMode ? 'text-slate-700' : 'text-[var(--text-muted-1)]'}`}
              >
                Watch every donation and payout in real-time. Full transparency on the blockchain.
              </p>
              <span
                className="relative z-[1] mt-auto self-end text-3xl font-semibold text-[var(--accent-bright-2)] transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden="true"
              >
                →
              </span>
            </Link>
          </div>

          <div
            className={`relative mx-auto mt-14 max-w-3xl overflow-hidden rounded-[2.25rem] px-7 py-14 text-center backdrop-blur-[28px] sm:px-12 sm:py-[4.5rem] ${
              isLightMode
                ? 'border border-[rgba(154,174,206,0.22)] bg-[linear-gradient(165deg,rgba(255,255,255,0.96)_0%,rgba(244,249,253,0.88)_42%,rgba(238,246,251,0.94)_100%)] shadow-[0_24px_60px_rgba(58,76,112,0.09),0_0_0_1px_rgba(255,255,255,0.85)_inset,0_1px_0_rgba(255,255,255,0.6)_inset]'
                : 'border border-white/[0.07] bg-[linear-gradient(165deg,rgba(26,34,54,0.72)_0%,rgba(14,18,30,0.55)_38%,rgba(12,26,42,0.62)_100%)] shadow-[0_28px_70px_rgba(2,8,22,0.55),0_0_0_1px_rgba(255,255,255,0.045)_inset,0_0_100px_rgba(45,245,173,0.07)]'
            }`}
          >
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 opacity-95 ${
                isLightMode
                  ? '[background:radial-gradient(ellipse_90%_55%_at_50%_0%,rgba(94,246,222,0.16),transparent_58%)]'
                  : '[background:radial-gradient(ellipse_90%_50%_at_50%_0%,rgba(45,245,173,0.14),transparent_60%)]'
              }`}
            />
            <div
              className={`pointer-events-none absolute left-1/2 top-0 h-px w-[min(88%,26rem)] -translate-x-1/2 bg-gradient-to-r from-transparent to-transparent sm:w-[min(90%,34rem)] ${
                isLightMode ? 'via-white/70' : 'via-white/15'
              }`}
            />
            <div
              className={`pointer-events-none absolute -left-20 top-[18%] h-44 w-44 rounded-full blur-3xl ${
                isLightMode ? 'bg-violet-400/22' : 'bg-violet-500/14'
              }`}
            />
            <div
              className={`pointer-events-none absolute -right-24 bottom-[8%] h-52 w-52 rounded-full blur-3xl ${
                isLightMode ? 'bg-cyan-300/18' : 'bg-teal-400/14'
              }`}
            />

            <p
              className={`relative mx-auto inline-flex max-w-[min(100%,20rem)] items-center justify-center rounded-full px-5 py-2 text-[0.6875rem] font-semibold uppercase tracking-[0.22em] sm:max-w-none sm:text-[11px] sm:tracking-[0.26em] ${
                isLightMode
                  ? 'bg-white/80 text-[#4a5a6c] ring-1 ring-[rgba(100,128,156,0.2)] shadow-[0_1px_2px_rgba(15,40,60,0.04)]'
                  : 'bg-white/[0.06] text-[#b8c7d8] ring-1 ring-white/[0.1]'
              }`}
            >
              Proof-forward giving
            </p>

            <h2
              className={`relative mx-auto mt-6 max-w-[19rem] text-balance font-serif text-[1.875rem] font-medium leading-[1.12] tracking-[-0.035em] sm:mt-10 sm:max-w-3xl sm:text-[2.5rem] sm:leading-[1.08] lg:text-[2.75rem] lg:leading-[1.06] ${
                isLightMode ? 'text-[#101827]' : 'text-[#f8fafc]'
              }`}
            >
              <span className="block sm:inline">Your generosity,</span>{' '}
              <span className="block sm:inline">
                <span className={isLightMode ? 'text-[#0d6f5c]' : 'text-[#6ef5d8]'}>visible end to end</span>.
              </span>
            </h2>

            <div
              className={`relative mx-auto mt-7 flex max-w-[32rem] flex-col gap-2.5 text-pretty text-center sm:mt-9 ${
                isLightMode
                  ? 'text-[15px] leading-[1.72] text-neutral-600 sm:text-[17px] sm:leading-[1.68]'
                  : 'font-light text-[var(--text-muted-1)] sm:text-lg sm:leading-[1.68]'
              }`}
            >
              <p>
                Connect in minutes, give from your wallet, and keep receipts that cannot be rewritten.
              </p>
              <p className={isLightMode ? 'text-[14px] text-neutral-600/88 sm:text-[16px]' : 'opacity-[0.92]'}>
                Follow the live ledger—confidence for you, accountability for every cause you champion.
              </p>
            </div>

            <ul className="relative mx-auto mt-11 grid max-w-3xl gap-6 sm:mt-12 sm:grid-cols-3 sm:gap-7">
              {VAULT_JOIN_BENEFITS.map((item) => {
                const m = miniBenefitStyles[item.tone];
                const shell = isLightMode ? m.shellLight : m.shellDark;
                return (
                  <li
                    key={item.title}
                    className={`group relative isolate flex min-h-[210px] flex-col items-center gap-6 overflow-hidden rounded-[1.65rem] px-6 py-8 text-center transition-all duration-500 ease-out hover:-translate-y-1 hover:brightness-[1.02] sm:min-h-[196px] ${shell} ${isLightMode ? 'backdrop-blur-sm' : ''}`}
                  >
                    <span
                      className={`pointer-events-none absolute rounded-full blur-3xl ${isLightMode ? m.orbLight : m.orbDark}`}
                      aria-hidden="true"
                    />
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-6 top-0 z-[2] h-px bg-gradient-to-r sm:inset-x-7 ${isLightMode ? m.hairLight : m.hairDark}`}
                    />
                    <span
                      className={`relative z-[3] flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                        isLightMode ? m.iconLight : m.iconDark
                      }`}
                      aria-hidden="true"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className={`h-6 w-6 shrink-0 fill-current ${isLightMode ? m.svgLight : m.svgDark}`}
                      >
                        {item.icon}
                      </svg>
                    </span>
                    <div className="relative z-[3] mt-px flex flex-col gap-3">
                      <p
                        className={`max-w-[14rem] text-[15px] font-bold tracking-[-0.02em] sm:text-base ${isLightMode ? m.titleLight : m.titleDark}`}
                        style={
                          !isLightMode && m.titleGlowDark ? { textShadow: m.titleGlowDark } : undefined
                        }
                      >
                        {item.title}
                      </p>
                      <p
                        className={`mx-auto max-w-[14rem] text-sm font-semibold leading-relaxed sm:text-[0.938rem] sm:leading-[1.55] ${isLightMode ? m.blurbLight : m.blurbDark}`}
                      >
                        {item.blurb}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="relative mx-auto mt-12 flex justify-center sm:mt-14">
              <Link
                to="/register"
                className={`group relative isolate inline-flex min-h-[3.65rem] items-center justify-center overflow-hidden rounded-full px-14 py-4 text-[1.075rem] font-semibold tracking-wide transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isLightMode
                    ? 'border border-white/55 bg-gradient-to-br from-[#65ffeb] via-[#3dead0] to-[#18b892] text-[#041f1a] shadow-[0_0_0_1px_rgba(255,255,255,0.5)_inset,0_6px_28px_rgba(32,180,148,0.38),0_0_52px_rgba(58,230,196,0.55),0_0_112px_rgba(58,230,196,0.22)] hover:-translate-y-0.5 hover:scale-[1.035] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.65)_inset,0_12px_40px_rgba(32,180,148,0.48),0_0_72px_rgba(58,230,196,0.65)] active:scale-[0.98] active:translate-y-0'
                    : 'border border-[rgba(130,255,220,0.4)] bg-gradient-to-br from-[#58ffe0] via-[#32eab8] to-[#14b086] text-[#03140f] shadow-[0_0_0_1px_rgba(190,255,235,0.3)_inset,0_6px_32px_rgba(45,245,173,0.32),0_0_56px_rgba(45,245,173,0.58),0_0_120px_rgba(45,245,173,0.2)] hover:-translate-y-0.5 hover:scale-[1.035] hover:shadow-[0_0_0_1px_rgba(210,255,240,0.38)_inset,0_12px_46px_rgba(45,245,173,0.42),0_0_80px_rgba(45,245,173,0.72)] active:scale-[0.98] active:translate-y-0'
                }`}
              >
                <span className="pointer-events-none absolute -inset-2 rounded-full bg-gradient-to-tr from-transparent via-white/25 to-transparent opacity-0 blur-md transition-opacity duration-500 group-hover:opacity-100 group-hover:duration-[700ms]" />
                <span className="pointer-events-none absolute inset-[1px] rounded-full bg-gradient-to-t from-white/15 to-transparent opacity-55" aria-hidden="true" />
                <span className="relative z-10 px-1">Join the Vault</span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
