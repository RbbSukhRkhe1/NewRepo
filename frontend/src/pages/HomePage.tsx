import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

/** Copy from vaultex-founding-narrative (hero, features, cta). */
const HERO = {
  badge: 'Powered by Ethereum Blockchain',
  titleLine1: 'Give with Confidence,',
  titleLine2: 'Verify with Certainty',
  subtitle:
    'Every donation permanently visible on the blockchain. Track your impact in real-time and ensure your generosity reaches those who need it most.',
  ctaPrimary: 'Start Donating',
  ctaSecondary: 'View Public Ledger',
  pillars: [
    {
      title: '100% Transparent',
      body: 'Every transaction recorded permanently on the Ethereum blockchain',
    },
    {
      title: 'Real-time Tracking',
      body: 'Watch your donations flow from wallet to cause instantly',
    },
    {
      title: 'Zero Hidden Fees',
      body: 'Only standard gas fees — we take nothing from your donation',
    },
  ],
} as const;

const HOW_IT_WORKS = {
  eyebrow: 'How it works',
  title: 'Transparency at every step',
  subtitle:
    "We believe transparency is the highest form of respect — respect for the donor's intention, the beneficiary's dignity, and the truth.",
  steps: [
    { num: '01', title: 'Connect Wallet', body: 'Link your Ethereum wallet securely', to: '/login' },
    { num: '02', title: 'Choose a Cause', body: 'Browse verified campaigns', to: '/causes' },
    { num: '03', title: 'Donate ETH', body: 'Transaction recorded on-chain', to: '/donate' },
    { num: '04', title: 'Track Impact', body: 'Watch your donation at work', to: '/ledger' },
  ],
  features: [
    {
      title: 'Verifiable Donations',
      body: 'Every single donation is permanently etched on the blockchain. Open Etherscan or the Vaultex ledger and see your exact contribution, still there, still doing its work.',
    },
    {
      title: 'No Black Boxes',
      body: 'No annual reports with rounded numbers. No bank, no charity headquarters, no auditor can alter or hide your donation. Just raw, verifiable truth.',
    },
    {
      title: 'Proof of Impact',
      body: "The ledger doesn't just show numbers — it tells proof of impact. Each donation carries a story of real change happening in the world.",
    },
  ],
} as const;

const CLOSING_CTA = {
  titleLine1: 'No more "trust us."',
  titleLine2: 'Only "see for yourself."',
  body: 'Join a movement of thoughtful donors who want their generosity to mean something real. When people can see their impact with their own eyes, they give more, they give smarter, and they stay engaged for the long term.',
  ctaPrimary: 'Start Giving Today',
  ctaSecondary: 'Learn More',
  trust: ['100% On-chain Verification', 'Zero Hidden Fees', 'Open Source', 'Multi-sig Security'],
} as const;

const homeBackdrop = {
  light: {
    base: 'bg-[linear-gradient(180deg,#e8f2fc_0%,#f4f8fc_42%,#f0fdf9_78%,#ecfdf5_100%)]',
    glow:
      'bg-[radial-gradient(ellipse_110%_70%_at_50%_-8%,rgba(94,246,222,0.22),transparent_58%),radial-gradient(ellipse_60%_45%_at_88%_72%,rgba(167,139,250,0.1),transparent_55%),radial-gradient(ellipse_50%_40%_at_8%_85%,rgba(52,211,153,0.08),transparent_50%)]',
    divider: 'border-slate-200/60',
    card: 'border-slate-200/80 bg-white/60',
    step: 'border-slate-200 bg-white/70',
  },
  dark: {
    base: 'bg-[linear-gradient(180deg,#050c16_0%,#040a12_38%,#03080e_72%,#02060c_100%)]',
    glow:
      'bg-[radial-gradient(ellipse_110%_65%_at_50%_-6%,rgba(45,245,173,0.16),transparent_58%),radial-gradient(ellipse_55%_42%_at_92%_78%,rgba(202,144,255,0.08),transparent_52%),radial-gradient(ellipse_48%_38%_at_6%_82%,rgba(94,246,222,0.06),transparent_48%)]',
    divider: 'border-white/[0.06]',
    card: 'border-white/10 bg-white/[0.04]',
    step: 'border-white/10 bg-white/[0.03]',
  },
} as const;

const stepAccents = ['text-teal-400', 'text-violet-400', 'text-cyan-400', 'text-emerald-400'] as const;

const sectionPad = 'px-6 py-20 sm:px-10 sm:py-24 lg:py-28';

export function HomePage() {
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

  const theme = isLightMode ? homeBackdrop.light : homeBackdrop.dark;
  const muted = isLightMode ? 'text-slate-600' : 'text-slate-400';
  const heading = isLightMode ? 'text-slate-900' : 'text-white';
  const accentLink = isLightMode ? 'text-emerald-700' : 'text-emerald-300';

  return (
    <div className={`relative w-full overflow-x-hidden ${theme.base}`}>
      <div
        aria-hidden
        className={`pointer-events-none fixed inset-0 z-0 motion-safe:animate-[pulse_12s_ease-in-out_infinite] motion-reduce:animate-none ${theme.glow}`}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(rgba(126,149,182,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(126,149,182,0.05)_1px,transparent_1px)] bg-[size:72px_72px] opacity-[0.35] [mask-image:linear-gradient(to_bottom,black_20%,transparent_95%)]"
      />

      <div className="relative z-[1] flex flex-col">
        {/* Hero */}
        <section id="hero" className={`${sectionPad} pt-14 sm:pt-16 lg:pt-20`}>
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 text-center sm:gap-10">
            <p
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium sm:text-sm ${
                isLightMode
                  ? 'border-emerald-500/25 bg-emerald-500/10 text-slate-600'
                  : 'border-emerald-400/25 bg-emerald-400/10 text-slate-300'
              }`}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />
              {HERO.badge}
            </p>

            <div className="flex flex-col gap-4 sm:gap-5">
              <h1 className="text-balance text-[1.875rem] font-extrabold leading-[1.1] tracking-[-0.04em] sm:text-[2.5rem] md:text-[2.75rem]">
                <span className={heading}>{HERO.titleLine1}</span>
                <span
                  className={`mt-2 block ${
                    isLightMode
                      ? 'bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 bg-clip-text text-transparent'
                      : 'bg-gradient-to-r from-[#ecfffd] via-[#5ef6de] to-[#34f0a0] bg-clip-text text-transparent'
                  }`}
                >
                  {HERO.titleLine2}
                </span>
              </h1>
              <p className={`mx-auto max-w-xl text-balance text-base leading-relaxed sm:text-lg ${muted}`}>
                {HERO.subtitle}
              </p>
            </div>

            <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
              <Link
                to="/causes"
                className={`inline-flex min-h-11 items-center justify-center rounded-full px-8 py-3 text-sm font-bold ${
                  isLightMode
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                    : 'bg-[linear-gradient(180deg,#4dffd0_0%,#18c97a_100%)] text-[#021a10]'
                }`}
              >
                {HERO.ctaPrimary}
              </Link>
              <Link
                to="/ledger"
                className={`inline-flex min-h-11 items-center justify-center rounded-full border px-8 py-3 text-sm font-semibold ${
                  isLightMode
                    ? 'border-slate-300 bg-white/90 text-slate-800'
                    : 'border-white/25 bg-white/5 text-white'
                }`}
              >
                {HERO.ctaSecondary}
              </Link>
            </div>
          </div>

          <div className="mx-auto mt-12 w-full max-w-5xl sm:mt-14 lg:mt-16">
            <ul className="grid w-full gap-4 sm:grid-cols-3 sm:gap-5">
              {HERO.pillars.map((item) => (
                <li key={item.title} className={`rounded-2xl border p-5 sm:p-6 ${theme.card}`}>
                  <p className={`text-sm font-semibold ${heading}`}>{item.title}</p>
                  <p className={`mt-2 text-sm leading-relaxed ${muted}`}>{item.body}</p>
                </li>
              ))}
            </ul>

            <p className={`mt-8 w-full text-center text-sm sm:mt-10 ${muted}`}>
              Beneficiary stories on{' '}
              <Link to="/causes/completed" className={`font-semibold underline-offset-2 hover:underline ${accentLink}`}>
                Impact
              </Link>
            </p>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className={`border-t ${sectionPad} ${theme.divider}`}
          aria-labelledby="how-it-works-heading"
        >
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 sm:gap-14 lg:gap-16">
            <header className="mx-auto flex max-w-2xl flex-col gap-4 text-center">
              <p className={`text-sm font-medium uppercase tracking-wider ${accentLink}`}>{HOW_IT_WORKS.eyebrow}</p>
              <h2 id="how-it-works-heading" className={`text-3xl font-extrabold tracking-tight sm:text-4xl ${heading}`}>
                {HOW_IT_WORKS.title}
              </h2>
              <p className={`text-pretty text-base leading-relaxed ${muted}`}>{HOW_IT_WORKS.subtitle}</p>
            </header>

            <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              {HOW_IT_WORKS.steps.map((step, i) => (
                <li key={step.num}>
                  <Link
                    to={step.to}
                    className={`flex h-full items-start gap-3 rounded-2xl border p-4 motion-safe:transition-colors hover:border-emerald-400/35 sm:flex-col sm:items-center sm:p-5 sm:text-center lg:items-start lg:text-left ${theme.step}`}
                  >
                    <span className={`shrink-0 text-sm font-bold ${stepAccents[i]}`}>{step.num}</span>
                    <span className="min-w-0">
                      <span className={`block text-sm font-semibold ${heading}`}>{step.title}</span>
                      <span className={`mt-1 block text-xs leading-snug ${muted}`}>{step.body}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>

            <ul
              className={`grid gap-8 border-t pt-12 sm:grid-cols-3 sm:gap-6 sm:pt-14 lg:gap-8 lg:pt-16 ${theme.divider}`}
            >
              {HOW_IT_WORKS.features.map((feature) => (
                <li key={feature.title} className="flex flex-col gap-3">
                  <h3 className={`text-lg font-semibold sm:text-xl ${heading}`}>{feature.title}</h3>
                  <p className={`text-sm leading-relaxed ${muted}`}>{feature.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Closing CTA */}
        <section
          id="join-the-vault"
          className={`border-t ${sectionPad} ${theme.divider}`}
          aria-labelledby="join-vault-heading"
        >
          <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 text-center sm:gap-10">
            <div className="flex flex-col gap-4 sm:gap-5">
              <h2 id="join-vault-heading" className={`text-3xl font-extrabold tracking-tight sm:text-4xl ${heading}`}>
                {CLOSING_CTA.titleLine1}
                <span
                  className={`mt-2 block ${
                    isLightMode
                      ? 'bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 bg-clip-text text-transparent'
                      : 'bg-gradient-to-r from-[#ecfffd] via-[#5ef6de] to-[#34f0a0] bg-clip-text text-transparent'
                  }`}
                >
                  {CLOSING_CTA.titleLine2}
                </span>
              </h2>
              <p className={`text-pretty text-base leading-relaxed ${muted}`}>{CLOSING_CTA.body}</p>
            </div>

            <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:justify-center">
              <Link
                to="/causes"
                className={`inline-flex min-h-11 items-center justify-center rounded-full px-8 py-3 text-sm font-bold sm:min-h-12 sm:px-10 sm:text-base ${
                  isLightMode
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                    : 'bg-[linear-gradient(180deg,#4dffd0_0%,#18c97a_100%)] text-[#021a10]'
                }`}
              >
                {CLOSING_CTA.ctaPrimary}
              </Link>
              <Link
                to="/causes/completed"
                className={`inline-flex min-h-11 items-center justify-center rounded-full border px-8 py-3 text-sm font-semibold sm:min-h-12 sm:px-10 sm:text-base ${
                  isLightMode
                    ? 'border-slate-300 bg-white/80 text-slate-800'
                    : 'border-white/25 bg-white/5 text-white'
                }`}
              >
                {CLOSING_CTA.ctaSecondary}
              </Link>
            </div>

            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs sm:text-sm">
              {CLOSING_CTA.trust.map((item) => (
                <li key={item} className={`flex items-center gap-2 ${muted}`}>
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
