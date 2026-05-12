import { useEffect, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';

type HeroSlide = {
  id: string;
  categoryLabel: string;
  /** Opening beat — stakes / before */
  storyHook: string;
  /** Closing beat — what shifted, donors’ role, hope */
  storyHeart: string;
  firstName: string;
  roleLabel: string;
  accent: string;
  glow: string;
  statDonors: string;
  statOutcome: string;
  statLedger: string;
};

const carouselPanelBg = {
  dark: 'rgba(8, 16, 30, 0.82)',
  light: 'rgba(252, 253, 255, 0.94)',
} as const;

const heroSlides: HeroSlide[] = [
  {
    id: 'war-relief',
    categoryLabel: 'WAR RELIEF',
    storyHook:
      'When we left with one bag each, I could not picture what came next.',
    storyHeart:
      'Hot meals, a safe roof, and supplies for the children arrived because strangers decided we still mattered—and my kids finally slept without flinching at every sound.',
    firstName: 'Amir',
    roleLabel: 'Displaced survivor',
    accent: '#5ef6de',
    glow: 'rgba(74, 241, 212, 0.45)',
    statDonors: '214 donors helped fund emergency shelter',
    statOutcome: '62 families reached with meals & kits',
    statLedger: 'Updated live from the ledger',
  },
  {
    id: 'medical-support',
    categoryLabel: 'MEDICAL SUPPORT',
    storyHook: 'Treatment weeks were a blur of appointments and quiet worry.',
    storyHeart:
      'Rides to the clinic and help covering pharmacy gaps meant I could focus on healing—not on choosing between rent and medicine. I am here partly because people I will never meet said yes, quietly and steadily.',
    firstName: 'Lucia',
    roleLabel: 'Cancer recovery patient',
    accent: '#ca90ff',
    glow: 'rgba(194, 118, 255, 0.42)',
    statDonors: '189 donors helped fund treatment',
    statOutcome: '847 care visits sponsored for families',
    statLedger: 'Updated live from the ledger',
  },
  {
    id: 'education-access',
    categoryLabel: 'EDUCATION ACCESS',
    storyHook: 'After the storm took our books and laptop, I thought school was over for me.',
    storyHeart:
      'Donors sent supplies and a safe place to study. I walked back into class with my head up—and I kept going.',
    firstName: 'Diego',
    roleLabel: 'Student beneficiary',
    accent: '#7dd3fc',
    glow: 'rgba(125, 211, 252, 0.4)',
    statDonors: '128 donors reopened learning doors',
    statOutcome: '18 students returned to school full-time',
    statLedger: 'Updated live from the ledger',
  },
  {
    id: 'lgbtq-safe-space',
    categoryLabel: 'LGBTQ+ SAFE SPACE',
    storyHook: 'I never thought our hometown could feel like somewhere we could just breathe.',
    storyHeart:
      'Then a counseling circle and a quiet drop-in meant we were not questioned for showing up as ourselves. Transparent funding helped me trust the doors would stay open—even after headlines moved on.',
    firstName: 'Riley',
    roleLabel: 'Community member',
    accent: '#f9a8d4',
    glow: 'rgba(249, 168, 212, 0.42)',
    statDonors: '156 donors sustained free programs',
    statOutcome: '420 youth counseling hours kept free',
    statLedger: 'Updated live from the ledger',
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

const HOW_WORKS_CTA_HOVER: Record<
  BenefitTone,
  { light: string; dark: string }
> = {
  teal: {
    light:
      'hover:shadow-[0_18px_46px_rgba(16,107,96,0.22),0_0_52px_rgba(45,200,180,0.2),inset_0_1px_0_rgba(255,255,255,0.92)]',
    dark: 'hover:shadow-[0_22px_58px_rgba(0,4,14,0.72),0_0_72px_rgba(45,245,205,0.32),inset_0_1px_0_rgba(255,255,255,0.1)]',
  },
  violet: {
    light:
      'hover:shadow-[0_18px_46px_rgba(91,71,154,0.22),0_0_56px_rgba(139,92,246,0.22),inset_0_1px_0_rgba(255,255,255,0.92)]',
    dark: 'hover:shadow-[0_22px_58px_rgba(4,2,26,0.75),0_0_76px_rgba(183,111,255,0.36),inset_0_1px_0_rgba(255,255,255,0.1)]',
  },
  lime: {
    light:
      'hover:shadow-[0_18px_46px_rgba(56,98,42,0.2),0_0_52px_rgba(120,200,80,0.2),inset_0_1px_0_rgba(255,255,255,0.92)]',
    dark: 'hover:shadow-[0_22px_58px_rgba(0,14,4,0.68),0_0_76px_rgba(140,246,104,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]',
  },
};

const HOW_WORKS_CTA: {
  to: string;
  title: string;
  body: string;
  tone: BenefitTone;
  iconD: string;
}[] = [
  {
    to: '/causes',
    title: 'Browse Causes',
    body: 'Meet real stories and funding goals—take your time comparing what resonates before you give.',
    tone: 'teal',
    iconD:
      'M12 3l8 4v5c0 5.25-3.45 8.71-8 10-4.55-1.29-8-4.75-8-10V7l8-4zm0 2.18L6 8v4c0 4.13 2.54 6.98 6 8.12 3.46-1.14 6-3.99 6-8.12V8l-6-2.82z',
  },
  {
    to: '/donate',
    title: 'Donate Securely',
    body: 'When you are ready, send ETH with clear prompts—your receipt trail stays with you, not hidden in fine print.',
    tone: 'violet',
    iconD:
      'M17 8V7a5 5 0 10-10 0v1H5v13h14V8h-2zm-8 0V7a3 3 0 016 0v1H9zm3 8.8a2.2 2.2 0 112.2-2.2A2.2 2.2 0 0112 16.8z',
  },
  {
    to: '/ledger',
    title: 'Live Ledger',
    body: 'See movement in the open when you need peace of mind—every line is there for you to verify, not to impress.',
    tone: 'lime',
    iconD: 'M4 4h16v2H4zm2 4h12v12H6zm3 3v6h2v-6zm4 2v4h2v-4z',
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

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-4 pt-8 text-center sm:pb-6 sm:pt-10 md:pb-7 md:pt-12">
        <div className="pointer-events-none absolute left-1/2 top-[90px] h-64 w-[560px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(45,245,173,0.24),rgba(45,245,173,0.03)_48%,transparent_70%)] blur-2xl" />
        <div className="pointer-events-none absolute left-1/2 top-[176px] h-52 w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(11,21,39,0.95),transparent_70%)]" />

        <section
          className={`relative mx-auto max-w-4xl overflow-hidden rounded-[30px] px-5 pb-7 pt-5 backdrop-blur-xl sm:px-8 sm:pb-8 sm:pt-6 md:px-10 md:pb-8 md:pt-6 ${
            isLightMode
              ? 'border border-[rgba(165,185,211,0.38)] bg-[linear-gradient(155deg,rgba(251,253,255,0.96),rgba(237,244,252,0.9))] shadow-[0_18px_34px_rgba(76,103,136,0.14)]'
              : 'border border-white/[0.08] bg-[linear-gradient(155deg,rgba(15,24,41,0.74),rgba(8,13,24,0.58))] shadow-[0_18px_42px_rgba(0,0,0,0.36),0_0_40px_rgba(45,245,173,0.1)]'
          }`}
        >
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 opacity-90 motion-safe:animate-[pulse_10s_ease-in-out_infinite] motion-reduce:animate-none ${
              isLightMode
                ? 'bg-[radial-gradient(ellipse_85%_55%_at_50%_-10%,rgba(94,246,222,0.14),transparent_55%)]'
                : 'bg-[radial-gradient(ellipse_80%_50%_at_50%_-5%,rgba(45,245,173,0.12),transparent_58%)]'
            }`}
          />
          <div className="relative z-[1]">
          <h1 className="mx-auto max-w-4xl text-balance text-[1.875rem] font-extrabold leading-[1.06] tracking-[-0.04em] sm:text-[2.45rem] sm:leading-[1.04] md:text-[2.7rem] md:leading-[1.02]">
            <span className={isLightMode ? 'text-[#0f172a]' : 'text-[#f0fdf9]'}>Donate on-chain. </span>
            <span
              className={
                isLightMode
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 bg-clip-text text-transparent drop-shadow-[0_0_28px_rgba(16,185,129,0.35)]'
                  : 'bg-gradient-to-r from-[#ecfffd] via-[#5ef6de] to-[#34f0a0] bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(94,246,222,0.95)] drop-shadow-[0_0_36px_rgba(45,245,173,0.75)] drop-shadow-[0_0_64px_rgba(52,240,160,0.45)]'
              }
            >
              Help for real
            </span>
            <span className={isLightMode ? 'text-[#0f172a]' : 'text-[#f0fdf9]'}>.</span>
          </h1>
          <div className="mx-auto mt-4 flex w-full max-w-3xl flex-col items-center px-2 text-center sm:mt-5 sm:px-3">
            <p
              className={`mx-auto max-w-[min(100%,38rem)] text-balance text-[0.9375rem] font-medium leading-snug sm:text-base sm:leading-relaxed ${
                isLightMode ? 'text-[#1e293b]' : 'text-white/90'
              }`}
            >
              Choose a cause you care about. Donate ETH and follow your gift in a live ledger — clear from your wallet to the
              vault and beyond.
            </p>
          </div>

          <div
            className="group/carousel mx-auto mt-7 w-full max-w-3xl sm:mt-9"
            onMouseEnter={() => setIsCarouselPaused(true)}
            onMouseLeave={() => setIsCarouselPaused(false)}
          >
            <p className="sr-only" aria-live="polite" aria-atomic="true">
              Story {activeSlide + 1} of {heroSlides.length}: {heroSlides[activeSlide]?.categoryLabel} —{' '}
              {heroSlides[activeSlide]?.firstName}. {heroSlides[activeSlide]?.storyHook}{' '}
              {heroSlides[activeSlide]?.storyHeart}
            </p>

            <div
              className={`relative mx-auto min-h-[320px] h-[356px] w-full max-w-full overflow-hidden rounded-[24px] ring-1 motion-safe:transition-[box-shadow,transform] motion-safe:duration-500 motion-safe:ease-out sm:h-[392px] ${
                isLightMode
                  ? 'border border-white/75 bg-white/70 shadow-[0_14px_36px_rgba(76,103,136,0.1),inset_0_1px_0_rgba(255,255,255,0.95)] ring-slate-200/45 backdrop-blur-2xl group-hover/carousel:shadow-[0_22px_52px_rgba(76,103,136,0.14),0_0_72px_rgba(94,246,222,0.14)]'
                  : 'border border-emerald-400/15 bg-[linear-gradient(165deg,rgba(6,18,24,0.92)_0%,rgba(5,12,22,0.88)_45%,rgba(4,10,20,0.92)_100%)] shadow-[0_20px_50px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.07),0_0_0_1px_rgba(45,245,173,0.08)] ring-cyan-400/10 backdrop-blur-2xl group-hover/carousel:shadow-[0_26px_64px_rgba(0,0,0,0.6),0_0_72px_rgba(45,245,173,0.18),inset_0_1px_0_rgba(255,255,255,0.09)]'
              }`}
              role="region"
              aria-roledescription="carousel"
              aria-label="Beneficiary voices and community impact"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-0 opacity-[0.65] motion-safe:animate-[pulse_12s_ease-in-out_infinite] motion-reduce:opacity-40 motion-reduce:animate-none"
                style={{
                  background: `radial-gradient(ellipse 70% 45% at 50% 0%, ${heroSlides[activeSlide]?.glow ?? 'transparent'}, transparent 70%)`,
                }}
              />
              {!isLightMode ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-0 opacity-35 bg-[radial-gradient(ellipse_85%_70%_at_50%_40%,rgba(94,246,222,0.12),transparent_62%)]"
                />
              ) : (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_18%_8%,rgba(94,246,222,0.07),transparent_42%)]"
                />
              )}

              <div className="absolute inset-0 z-[1] min-h-0 overflow-hidden">
              {heroSlides.map((slide, idx) => (
                <article
                  key={slide.id}
                  className={`absolute inset-0 z-[2] flex min-h-0 max-h-full flex-col items-stretch gap-0 overflow-hidden px-3 pb-[3.25rem] pt-2.5 text-center motion-reduce:transition-none sm:px-6 sm:pb-[3.35rem] sm:pt-3 ${
                    idx === activeSlide ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-6 opacity-0'
                  } motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]`}
                  style={{
                    background: isLightMode ? carouselPanelBg.light : carouselPanelBg.dark,
                  }}
                  aria-hidden={idx !== activeSlide}
                >
                  <div className="relative z-10 mx-auto flex min-h-0 min-w-0 w-full max-w-[36rem] flex-1 flex-col items-center justify-start overflow-hidden pt-0.5 text-center sm:max-w-[38rem]">
                    <p
                      className={`shrink-0 text-[9px] font-bold uppercase tracking-[0.24em] sm:text-[10px] sm:tracking-[0.26em] ${
                        isLightMode ? 'text-slate-600' : 'text-slate-200/90'
                      }`}
                      style={{ color: isLightMode ? undefined : slide.accent }}
                    >
                      {slide.categoryLabel}
                    </p>

                    <blockquote
                      className={`relative mt-1.5 min-h-0 w-full min-w-0 max-w-full flex-1 overflow-hidden rounded-xl border text-left shadow-[0_0_28px_-14px_rgba(0,0,0,0.18)] sm:mt-2 ${
                        isLightMode
                          ? 'border-slate-200/90 bg-gradient-to-b from-white/98 to-slate-50/90 pl-6 pr-3 py-2.5 sm:pl-7 sm:pr-4 sm:py-3'
                          : 'border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] pl-6 pr-3 py-2.5 sm:pl-7 sm:pr-4 sm:py-3'
                      }`}
                      style={{
                        boxShadow: isLightMode
                          ? `inset 0 0 0 1px rgba(255,255,255,0.72), 0 0 28px -10px ${slide.glow}`
                          : `inset 0 1px 0 rgba(255,255,255,0.06), 0 0 32px -12px ${slide.glow}`,
                        borderLeftWidth: 3,
                        borderLeftColor: slide.accent,
                      }}
                    >
                      <span
                        className="pointer-events-none absolute left-2.5 top-2 font-serif text-4xl leading-none opacity-[0.22] sm:left-3 sm:top-2.5 sm:text-[2.65rem]"
                        style={{ color: slide.accent }}
                        aria-hidden
                      >
                        “
                      </span>
                      <div className="relative z-[1] min-h-0 pl-1 sm:pl-1.5">
                        <p
                          className={`line-clamp-2 font-serif text-[0.875rem] font-semibold leading-[1.32] tracking-[-0.015em] sm:line-clamp-3 sm:text-[0.95rem] sm:leading-[1.3] ${
                            isLightMode ? 'text-slate-900' : 'text-white/[0.97]'
                          }`}
                        >
                          {slide.storyHook}
                        </p>
                        <div
                          className={`my-2 h-px w-8 rounded-full sm:my-2 ${isLightMode ? 'bg-slate-300/65' : ''}`}
                          style={
                            isLightMode
                              ? undefined
                              : {
                                  backgroundColor: slide.accent,
                                  opacity: 0.35,
                                }
                          }
                          aria-hidden
                        />
                        <p
                          className={`line-clamp-3 font-serif text-[0.78125rem] font-normal italic leading-[1.45] sm:line-clamp-4 sm:text-[0.85rem] sm:leading-[1.48] ${
                            isLightMode ? 'text-slate-700' : 'text-slate-200/[0.94]'
                          }`}
                        >
                          {slide.storyHeart}
                        </p>
                      </div>
                      <span
                        className="pointer-events-none absolute bottom-2.5 right-3 font-serif text-2xl leading-none opacity-[0.18] sm:bottom-3 sm:right-4 sm:text-3xl"
                        style={{ color: slide.accent }}
                        aria-hidden
                      >
                        ”
                      </span>
                    </blockquote>

                    <div className="mt-1.5 w-full shrink-0 sm:mt-2">
                      <p className={`text-base font-bold tracking-tight sm:text-lg ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                        {slide.firstName}
                      </p>
                      <p className={`mt-0.5 text-xs font-medium sm:text-[0.8125rem] ${isLightMode ? 'text-slate-600' : 'text-slate-300/88'}`}>
                        {slide.roleLabel}
                      </p>
                    </div>

                    <div className="mt-1.5 grid w-full min-w-0 max-w-full shrink-0 grid-cols-1 gap-1.5 sm:mt-2 sm:grid-cols-3 sm:gap-2 sm:[grid-template-columns:minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
                      <div
                        className={`min-w-0 rounded-lg border px-2 py-2 text-center backdrop-blur-sm sm:px-2 sm:py-2.5 ${
                          isLightMode
                            ? 'border-slate-200/75 bg-white/95 shadow-sm'
                            : 'border-white/[0.07] bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                        }`}
                      >
                        <p
                          className={`text-balance break-words text-[11px] font-semibold leading-snug sm:text-xs ${isLightMode ? 'text-slate-800' : 'text-slate-100/95'}`}
                        >
                          {slide.statDonors}
                        </p>
                      </div>
                      <div
                        className={`min-w-0 rounded-lg border px-2 py-2 text-center backdrop-blur-sm sm:px-2 sm:py-2.5 ${
                          isLightMode
                            ? 'border-slate-200/75 bg-white/95 shadow-sm'
                            : 'border-white/[0.07] bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                        }`}
                      >
                        <p
                          className={`text-balance break-words text-[11px] font-semibold leading-snug sm:text-xs ${isLightMode ? 'text-slate-800' : 'text-slate-100/95'}`}
                        >
                          {slide.statOutcome}
                        </p>
                      </div>
                      <div
                        className={`min-w-0 rounded-lg border px-2 py-2 text-center backdrop-blur-sm sm:px-2 sm:py-2.5 ${
                          isLightMode
                            ? 'border-slate-200/75 bg-slate-50/95 shadow-sm'
                            : 'border-white/[0.06] bg-white/[0.03]'
                        }`}
                      >
                        <p
                          className={`text-balance break-words text-[9px] font-semibold uppercase leading-snug tracking-[0.06em] sm:text-[10px] sm:tracking-[0.07em] ${isLightMode ? 'text-slate-600' : ''}`}
                          style={!isLightMode ? { color: slide.accent, opacity: 0.92 } : undefined}
                        >
                          {slide.statLedger}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              ))}

              <button
                type="button"
                onClick={goPrev}
                className={`absolute left-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border motion-safe:transition-colors motion-safe:duration-300 sm:left-2.5 sm:h-9 sm:w-9 ${
                  isLightMode
                    ? 'border-slate-400/35 bg-white/88 text-slate-800 opacity-90 shadow-sm hover:border-teal-400/40 hover:opacity-100'
                    : 'border-white/20 bg-black/40 text-white/95 opacity-85 hover:border-cyan-400/35 hover:bg-black/50 hover:opacity-100'
                }`}
                aria-label="Previous story"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={goNext}
                className={`absolute right-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border motion-safe:transition-colors motion-safe:duration-300 sm:right-2.5 sm:h-9 sm:w-9 ${
                  isLightMode
                    ? 'border-slate-400/35 bg-white/88 text-slate-800 opacity-90 shadow-sm hover:border-violet-400/35 hover:opacity-100'
                    : 'border-white/20 bg-black/40 text-white/95 opacity-85 hover:border-violet-400/35 hover:bg-black/50 hover:opacity-100'
                }`}
                aria-label="Next story"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>

              <div
                className="pointer-events-none absolute bottom-2 left-1/2 z-30 flex w-[min(100%,22rem)] -translate-x-1/2 flex-col items-center gap-0 px-2 sm:bottom-2.5 sm:w-auto sm:max-w-none"
                role="presentation"
              >
                <div className="flex items-center justify-center gap-1">
                {heroSlides.map((slide, idx) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setActiveSlide(idx)}
                    title={slide.categoryLabel}
                    className={`pointer-events-auto rounded-full transition-[width,opacity,background-color,border-color] duration-[580ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                      idx === activeSlide
                        ? isLightMode
                          ? `h-[3px] w-5 border-0 sm:h-1 sm:w-[1.15rem]`
                          : `h-[3px] w-5 border-0 sm:h-1 sm:w-6`
                        : isLightMode
                          ? 'h-[3px] w-[3px] border-0 bg-slate-400/35'
                          : 'h-[3px] w-[3px] border-0 bg-white/35'
                    }`}
                    style={
                      idx === activeSlide
                        ? {
                            background: slide.accent,
                            boxShadow: isLightMode
                              ? `0 0 6px ${slide.glow}`
                              : `0 0 8px ${slide.glow}`,
                          }
                        : undefined
                    }
                    aria-label={`Go to story ${idx + 1}: ${slide.categoryLabel}, ${slide.firstName}`}
                  />
                ))}
                </div>
                <p
                  className={`pointer-events-none text-[8px] font-medium uppercase tracking-[0.12em] sm:text-[9px] sm:tracking-[0.13em] ${
                    isLightMode ? 'text-slate-500/90' : 'text-slate-500'
                  }`}
                >
                  Hover to pause · {activeSlide + 1} / {heroSlides.length}
                </p>
              </div>
              </div>
            </div>
          </div>
          </div>
        </section>

        <section
          className="relative mx-auto mt-12 max-w-5xl px-0 sm:px-1"
          aria-labelledby="how-it-works-heading"
        >
          <div
            className={`rounded-[28px] border px-5 py-10 sm:px-10 sm:py-12 ${
              isLightMode
                ? 'border-slate-200/55 bg-gradient-to-b from-white/75 via-white/55 to-slate-50/40 shadow-[0_12px_48px_rgba(15,41,77,0.08)] backdrop-blur-xl'
                : 'border-white/[0.09] bg-gradient-to-b from-slate-900/50 via-slate-950/35 to-[rgba(6,11,22,0.55)] shadow-[0_20px_56px_rgba(0,4,18,0.55)] backdrop-blur-xl'
            }`}
          >
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--text-muted-2)]">
                At a glance
              </p>
              <h2
                id="how-it-works-heading"
                className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-high-3)] sm:text-3xl"
              >
                How it works
              </h2>
              <div
                className={`mx-auto mt-5 max-w-xl space-y-3 text-balance text-sm leading-relaxed sm:mt-6 sm:max-w-2xl sm:text-base sm:leading-relaxed ${
                  isLightMode ? 'text-slate-600' : 'text-[var(--text-muted-1)]'
                }`}
              >
                <p>
                  Giving is deeply personal—we keep the path uncluttered so you can read, decide, and act without feeling
                  rushed or judged.
                </p>
                <p className={isLightMode ? 'text-slate-600/95' : 'opacity-[0.94]'}>
                  Start wherever you are: skim causes, send when you feel ready, and follow the ledger when you want
                  reassurance that your gift landed where it should.
                </p>
              </div>
            </div>

            <div className="mx-auto mt-10 grid max-w-5xl list-none gap-5 p-0 sm:mt-12 sm:grid-cols-3 sm:gap-6">
              {HOW_WORKS_CTA.map((c) => {
                const m = miniBenefitStyles[c.tone];
                const shell = isLightMode ? m.shellLight : m.shellDark;
                const hoverGlow = isLightMode ? HOW_WORKS_CTA_HOVER[c.tone].light : HOW_WORKS_CTA_HOVER[c.tone].dark;
                return (
                  <Link
                    key={c.to}
                    to={c.to}
                    className={`group relative isolate flex min-h-[260px] flex-col items-center gap-6 overflow-hidden rounded-[1.65rem] px-6 pb-8 pt-7 text-center transition-all duration-500 ease-out hover:-translate-y-1 hover:brightness-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] sm:min-h-[272px] sm:gap-7 sm:px-7 sm:pb-9 sm:pt-8 ${shell} ${isLightMode ? 'backdrop-blur-sm' : 'backdrop-blur-md'} ${hoverGlow}`}
                  >
                    <span
                      className={`pointer-events-none absolute rounded-full blur-3xl ${isLightMode ? m.orbLight : m.orbDark}`}
                      aria-hidden
                    />
                    <span
                      aria-hidden
                      className={`absolute inset-x-6 top-0 z-[2] h-px bg-gradient-to-r sm:inset-x-7 ${isLightMode ? m.hairLight : m.hairDark}`}
                    />
                    <span
                      className={`relative z-[3] flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${isLightMode ? m.iconLight : m.iconDark}`}
                      aria-hidden
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className={`h-6 w-6 shrink-0 fill-current ${isLightMode ? m.svgLight : m.svgDark}`}
                      >
                        <path d={c.iconD} />
                      </svg>
                    </span>
                    <div className="relative z-[3] flex flex-col gap-3">
                      <h3
                        className={`text-balance text-lg font-bold tracking-[-0.02em] sm:text-xl ${isLightMode ? m.titleLight : m.titleDark}`}
                        style={!isLightMode && m.titleGlowDark ? { textShadow: m.titleGlowDark } : undefined}
                      >
                        {c.title}
                      </h3>
                      <p
                        className={`mx-auto max-w-[16.5rem] text-balance text-sm font-semibold leading-relaxed sm:max-w-[17.5rem] sm:text-[0.9375rem] sm:leading-[1.55] ${isLightMode ? m.blurbLight : m.blurbDark}`}
                      >
                        {c.body}
                      </p>
                    </div>
                    <span
                      className="relative z-[3] mt-auto pt-1 text-2xl font-semibold text-[var(--accent-bright-2)] transition-transform duration-300 group-hover:translate-x-1 sm:text-3xl"
                      aria-hidden
                    >
                      →
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div
            className={`relative mx-auto mt-14 max-w-5xl overflow-hidden rounded-[2rem] px-6 py-10 text-center backdrop-blur-[28px] sm:px-9 sm:py-11 lg:px-11 lg:py-12 lg:text-left ${
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

            <div className="relative z-[1]">
              <div className="mx-auto flex w-full max-w-none flex-col lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-11 lg:gap-y-2">
                <div className="flex flex-col items-center lg:col-span-5 lg:items-start">
                  <p
                    className={`relative inline-flex max-w-[min(100%,20rem)] items-center justify-center rounded-full px-5 py-2 text-[0.6875rem] font-semibold uppercase tracking-[0.22em] sm:max-w-none sm:text-[11px] sm:tracking-[0.26em] ${
                      isLightMode
                        ? 'bg-white/80 text-[#4a5a6c] ring-1 ring-[rgba(100,128,156,0.2)] shadow-[0_1px_2px_rgba(15,40,60,0.04)]'
                        : 'bg-white/[0.06] text-[#b8c7d8] ring-1 ring-white/[0.1]'
                    }`}
                  >
                    Proof-forward giving
                  </p>

                  <h2
                    id="vault-join-heading"
                    className={`relative mx-auto mt-5 max-w-[19rem] text-balance font-serif text-[1.875rem] font-medium leading-[1.12] tracking-[-0.035em] sm:mt-7 sm:max-w-3xl sm:text-[2.35rem] sm:leading-[1.08] lg:mx-0 lg:mt-6 lg:max-w-none lg:text-left lg:text-[2.6rem] lg:leading-[1.06] ${
                      isLightMode ? 'text-[#101827]' : 'text-[#f8fafc]'
                    }`}
                  >
                    <span className="block sm:inline">Your generosity,</span>{' '}
                    <span className="block sm:inline">
                      <span className={isLightMode ? 'text-[#0d6f5c]' : 'text-[#6ef5d8]'}>visible end to end</span>.
                    </span>
                  </h2>

                  <div
                    className={`relative mx-auto mt-7 flex max-w-[32rem] flex-col gap-2.5 text-pretty text-center sm:mt-8 lg:mx-0 lg:mt-6 lg:max-w-[26rem] lg:text-left ${
                      isLightMode
                        ? 'text-[15px] leading-[1.72] text-neutral-600 sm:text-[16px] sm:leading-[1.68]'
                        : 'font-light text-[var(--text-muted-1)] sm:text-[17px] sm:leading-[1.68]'
                    }`}
                  >
                    <p>
                      Connect in minutes, give from your wallet, and keep receipts that cannot be rewritten.
                    </p>
                    <p className={isLightMode ? 'text-[14px] text-neutral-600/88 sm:text-[15px]' : 'opacity-[0.92]'}>
                      Follow the live ledger—confidence for you, accountability for every cause you champion.
                    </p>
                  </div>
                </div>

                <ul
                  className="relative mt-10 list-none space-y-3 lg:col-span-7 lg:mt-3 lg:max-w-none"
                  role="list"
                >
                  {VAULT_JOIN_BENEFITS.map((item) => {
                    const m = miniBenefitStyles[item.tone];
                    const accentBorder =
                      item.tone === 'teal'
                        ? 'border-l-teal-400/85'
                        : item.tone === 'violet'
                          ? 'border-l-violet-400/78'
                          : 'border-l-lime-400/72';
                    return (
                      <li
                        key={item.title}
                        className={`flex gap-3.5 rounded-xl border border-l-[3px] py-3.5 pl-3.5 pr-4 text-left shadow-[0_1px_0_rgba(255,255,255,0.05)_inset] transition duration-300 ease-out hover:brightness-[1.02] sm:gap-4 sm:py-4 ${accentBorder} ${
                          isLightMode
                            ? 'border border-slate-200/65 bg-white/60 backdrop-blur-sm'
                            : 'border border-white/[0.09] bg-white/[0.045] backdrop-blur-sm'
                        }`}
                      >
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:h-11 sm:w-11 ${
                            isLightMode ? m.iconLight : m.iconDark
                          }`}
                          aria-hidden="true"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            className={`h-5 w-5 shrink-0 fill-current sm:h-6 sm:w-6 ${isLightMode ? m.svgLight : m.svgDark}`}
                          >
                            {item.icon}
                          </svg>
                        </span>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <p
                            className={`text-[15px] font-bold tracking-[-0.02em] sm:text-base ${isLightMode ? m.titleLight : m.titleDark}`}
                            style={
                              !isLightMode && m.titleGlowDark ? { textShadow: m.titleGlowDark } : undefined
                            }
                          >
                            {item.title}
                          </p>
                          <p
                            className={`mt-1.5 text-sm font-semibold leading-snug sm:text-[0.938rem] sm:leading-[1.55] ${isLightMode ? m.blurbLight : m.blurbDark}`}
                          >
                            {item.blurb}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="relative mx-auto mt-10 flex justify-center lg:mt-11">
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
          </div>
        </section>
      </div>
    </div>
  );
}
