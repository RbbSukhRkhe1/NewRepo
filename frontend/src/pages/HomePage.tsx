import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

type HeroSlide = {
  title: string;
  description: string;
  accent: string;
  glow: string;
  background: string;
  lightBackground: string;
  icon: JSX.Element;
};

const heroSlides: HeroSlide[] = [
  {
    title: 'Full Transparency',
    description: 'Every transaction is on-chain and publicly verifiable forever',
    accent: '#5ef6de',
    glow: 'rgba(74, 241, 212, 0.42)',
    background: 'linear-gradient(145deg, rgba(18,66,79,0.9), rgba(9,26,43,0.85) 58%, rgba(9,18,30,0.95))',
    lightBackground: 'linear-gradient(145deg, rgba(217,248,245,0.98), rgba(204,236,246,0.95) 58%, rgba(218,231,246,0.97))',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-14 w-14 fill-current">
        <path d="M12 4C6.5 4 2.08 7.38 1 12c1.08 4.62 5.5 8 11 8s9.92-3.38 11-8c-1.08-4.62-5.5-8-11-8zm0 13a5 5 0 110-10 5 5 0 010 10zm0-8.2A3.2 3.2 0 1015.2 12 3.2 3.2 0 0012 8.8z" />
      </svg>
    ),
  },
  {
    title: 'Direct from Wallet to Cause',
    description: 'No middleman. Your donation reaches the project instantly',
    accent: '#ca90ff',
    glow: 'rgba(194, 118, 255, 0.4)',
    background: 'linear-gradient(145deg, rgba(66,29,99,0.9), rgba(32,17,58,0.85) 58%, rgba(16,10,34,0.95))',
    lightBackground: 'linear-gradient(145deg, rgba(238,226,255,0.98), rgba(229,220,249,0.95) 58%, rgba(222,232,247,0.97))',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-14 w-14 fill-current">
        <path d="M3 7.5A2.5 2.5 0 015.5 5h8A2.5 2.5 0 0116 7.5v1h2.5A2.5 2.5 0 0121 11v6.5A2.5 2.5 0 0118.5 20h-8A2.5 2.5 0 018 17.5v-1H5.5A2.5 2.5 0 013 14V7.5zm2 0V14h3v-2.5A2.5 2.5 0 0110.5 9H14V7.5a.5.5 0 00-.5-.5h-8a.5.5 0 00-.5.5zm13.5 3h-8a.5.5 0 00-.5.5v6.5a.5.5 0 00.5.5h8a.5.5 0 00.5-.5V11a.5.5 0 00-.5-.5z" />
      </svg>
    ),
  },
  {
    title: 'Watch Everything Live',
    description: 'Real-time donations and payouts visible to everyone',
    accent: '#bcff57',
    glow: 'rgba(188, 255, 87, 0.42)',
    background: 'linear-gradient(145deg, rgba(56,91,18,0.92), rgba(24,40,11,0.87) 56%, rgba(13,24,7,0.95))',
    lightBackground: 'linear-gradient(145deg, rgba(238,249,212,0.98), rgba(228,242,211,0.95) 56%, rgba(222,236,243,0.97))',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-14 w-14 fill-current">
        <path d="M3 4h18v2H3V4zm1 4h16v12H4V8zm4 8h2v-4H8v4zm3 0h2v-7h-2v7zm3 0h2v-2h-2v2z" />
      </svg>
    ),
  },
  {
    title: 'Only Verified Causes',
    description: 'Projects with clear goals, budgets, and measurable impact',
    accent: '#ffbe72',
    glow: 'rgba(255, 190, 114, 0.38)',
    background: 'linear-gradient(145deg, rgba(94,55,18,0.9), rgba(46,29,12,0.85) 58%, rgba(29,18,9,0.95))',
    lightBackground: 'linear-gradient(145deg, rgba(255,239,216,0.98), rgba(250,228,202,0.95) 58%, rgba(236,228,218,0.97))',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-14 w-14 fill-current">
        <path d="M12 2l2.4 2.2 3.2-.5 1.1 3 2.9 1.5-1.3 3 1.3 3-2.9 1.5-1.1 3-3.2-.5L12 22l-2.4-2.2-3.2.5-1.1-3-2.9-1.5 1.3-3-1.3-3 2.9-1.5 1.1-3 3.2.5L12 2zm-1.1 13.8l6-6-1.4-1.4-4.6 4.6-2.4-2.4-1.4 1.4 3.8 3.8z" />
      </svg>
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
      <div className="pointer-events-none absolute -left-24 top-8 z-0 h-80 w-80 animate-[pulse_8s_ease-in-out_infinite] rounded-full bg-teal-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-20 z-0 h-96 w-96 animate-[pulse_10s_ease-in-out_infinite] rounded-full bg-violet-500/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 left-1/3 z-0 h-72 w-72 animate-[pulse_11s_ease-in-out_infinite] rounded-full bg-lime-400/12 blur-3xl" />

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
          <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#d9bb78]">Trusted Web3 Giving</p>
          <h1
            className="mt-3 text-balance text-4xl font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-5xl"
            style={{
              backgroundImage: isLightMode
                ? 'linear-gradient(96deg, #10304d 3%, #1e7664 42%, #458439 72%, #1f5876 100%)'
                : 'linear-gradient(96deg, #e6f8ff 3%, #bafee0 38%, #c5ff7d 68%, #8bf9ff 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              textShadow: isLightMode ? '0 0 12px rgba(120,176,235,0.16)' : '0 0 28px rgba(97,252,186,0.16)',
            }}
          >
            Donate on-chain Track with trust
          </h1>
          <div className="mx-auto mt-4 max-w-3xl text-center">
            <p
              className={`text-balance text-base font-semibold leading-relaxed tracking-[0.012em] sm:text-lg ${
                isLightMode ? 'text-[#223c57]' : 'text-[var(--text-high-2)]'
              }`}
              style={{ textShadow: isLightMode ? 'none' : '0 0 16px rgba(122,255,171,0.1)' }}
            >
              What feels small to you could become life-changing for someone else.
            </p>
            <p
              className={`mx-auto mt-2 max-w-2xl text-balance text-sm leading-relaxed tracking-[0.01em] sm:text-base ${
                isLightMode ? 'text-[#38526f]' : 'text-[var(--text-muted-1)]'
              }`}
            >
              Every act of kindness has the power to leave a lasting impact.
            </p>
          </div>

          <div
            className="mx-auto mt-5 w-full max-w-2xl"
            onMouseEnter={() => setIsCarouselPaused(true)}
            onMouseLeave={() => setIsCarouselPaused(false)}
          >
            <div
              className={`relative min-h-[250px] overflow-hidden rounded-[26px] backdrop-blur-2xl sm:min-h-[280px] ${
                isLightMode
                  ? 'border border-[rgba(165,185,211,0.36)] bg-[rgba(248,252,255,0.86)] shadow-[0_14px_28px_rgba(76,103,136,0.14)]'
                  : 'border border-white/[0.08] bg-[rgba(10,16,28,0.42)] shadow-[0_16px_34px_rgba(0,0,0,0.34)]'
              }`}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.08),transparent_36%)]" />

              {heroSlides.map((slide, idx) => (
                <article
                  key={slide.title}
                  className={`absolute inset-0 flex h-full flex-col justify-between p-5 text-left transition-all duration-700 sm:p-6 ${
                    idx === activeSlide ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
                  }`}
                  style={{ background: isLightMode ? slide.lightBackground : slide.background }}
                  aria-hidden={idx !== activeSlide}
                >
                  <div
                    className={`relative inline-flex h-14 w-14 items-center justify-center rounded-xl border sm:h-16 sm:w-16 ${
                      isLightMode
                        ? 'border-[rgba(145,174,206,0.65)] bg-white/88 text-[var(--text-high-1)]'
                        : 'border-white/20 bg-black/20 text-white'
                    }`}
                    style={{
                      color: slide.accent,
                      boxShadow: isLightMode
                        ? '0 6px 18px rgba(79,111,145,0.16), inset 0 0 0 1px rgba(255,255,255,0.86)'
                        : `0 0 32px ${slide.glow}, inset 0 0 0 1px rgba(255,255,255,0.06)`,
                      animation: 'vtx-float 5.8s ease-in-out infinite',
                    }}
                  >
                    {slide.icon}
                  </div>

                  <div className="mt-3 max-w-2xl">
                    <p
                      className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${
                        isLightMode ? 'text-[#355271]' : ''
                      }`}
                      style={isLightMode ? undefined : { color: slide.accent }}
                    >
                      Premium trust signal
                    </p>
                    <h3
                      className={`mt-1.5 text-2xl font-black leading-tight tracking-[-0.02em] sm:text-3xl ${
                        isLightMode ? 'text-[#132b46]' : 'text-white'
                      }`}
                    >
                      {slide.title}
                    </h3>
                    <p className={`mt-2 max-w-xl text-sm leading-relaxed ${isLightMode ? 'text-[#2f4868]' : 'text-white/78'}`}>
                      {slide.description}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span
                      className={`text-xs font-medium uppercase tracking-[0.18em] sm:text-sm ${
                        isLightMode ? 'text-[#304e6e]' : 'text-white/70'
                      }`}
                      style={isLightMode ? undefined : { textShadow: `0 0 18px ${slide.glow}` }}
                    >
                      Vaultex vision
                    </span>
                    <span
                      className="invisible text-4xl font-semibold leading-none sm:text-5xl"
                      style={{ color: slide.accent }}
                      aria-hidden="true"
                    >
                      →
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

              <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3">
                {heroSlides.map((slide, idx) => (
                  <button
                    key={slide.title}
                    type="button"
                    onClick={() => setActiveSlide(idx)}
                    className={`rounded-full border transition-all duration-300 ${
                      idx === activeSlide ? 'h-4 w-10 border-white/70' : 'h-4 w-4 border-white/35 bg-white/12'
                    }`}
                    style={idx === activeSlide ? { background: slide.accent, boxShadow: `0 0 20px ${slide.glow}` } : {}}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-center text-3xl font-bold tracking-[-0.02em] text-[var(--text-high-3)] sm:text-4xl">Wallet to Impact</h2>
          <div className="mx-auto mt-4 max-w-3xl text-center">
            <p
              className={`text-balance text-base font-semibold leading-relaxed tracking-[0.012em] sm:text-lg ${
                isLightMode ? 'text-[#1f3a58]' : ''
              }`}
              style={{
                backgroundImage: isLightMode ? undefined : 'linear-gradient(96deg, #dcf1ff 8%, #c7ffe8 48%, #d8f8ff 92%)',
                WebkitBackgroundClip: isLightMode ? undefined : 'text',
                backgroundClip: isLightMode ? undefined : 'text',
                color: isLightMode ? '#1f3a58' : 'transparent',
                textShadow: isLightMode ? 'none' : '0 0 16px rgba(130,214,255,0.1)',
              }}
            >
              Behind every verified transaction is a life being helped.
            </p>
            <p
              className={`mx-auto mt-2 max-w-2xl text-balance text-sm leading-relaxed tracking-[0.01em] sm:text-base ${
                isLightMode ? 'text-[#38526f]' : 'text-[var(--text-muted-1)]'
              }`}
            >
              See how your generosity turns into meaningful change.
            </p>
          </div>
          <div className="mt-8 grid gap-5 text-left md:grid-cols-3">
            <Link
              to="/causes"
              className={`group relative flex min-h-[270px] flex-col rounded-3xl p-8 backdrop-blur-xl transition duration-500 ease-out hover:-translate-y-1.5 hover:scale-[1.015] ${
                isLightMode
                  ? 'border border-[rgba(163,188,206,0.34)] bg-[linear-gradient(165deg,rgba(251,253,255,0.95),rgba(239,246,252,0.88))] shadow-[0_12px_24px_rgba(70,94,124,0.12)] hover:border-[rgba(111,185,166,0.55)] hover:shadow-[0_18px_32px_rgba(79,130,140,0.2)]'
                  : 'border border-white/[0.07] bg-[linear-gradient(165deg,rgba(18,40,54,0.48),rgba(7,19,28,0.34))] shadow-[0_12px_28px_rgba(1,8,15,0.34),0_0_0_1px_rgba(255,255,255,0.03)_inset] hover:border-[rgba(64,219,176,0.42)] hover:shadow-[0_18px_34px_rgba(0,16,16,0.42),0_0_26px_rgba(50,245,193,0.2)]'
              }`}
            >
              <div
                className={`mb-6 flex h-11 w-11 items-center justify-center rounded-xl border ${
                  isLightMode
                    ? 'border-teal-500/35 bg-white/85 text-teal-700 shadow-[0_6px_16px_rgba(55,137,146,0.18)]'
                    : 'border-teal-300/35 bg-teal-300/10 text-teal-200 shadow-[0_0_24px_rgba(45,245,205,0.24)]'
                }`}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
                  <path d="M12 3l8 4v5c0 5.25-3.45 8.71-8 10-4.55-1.29-8-4.75-8-10V7l8-4zm0 2.18L6 8v4c0 4.13 2.54 6.98 6 8.12 3.46-1.14 6-3.99 6-8.12V8l-6-2.82z" />
                </svg>
              </div>
              <span className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/45 to-transparent" />
              <h3 className={`text-2xl font-bold ${isLightMode ? 'text-[#13344e]' : 'text-[#dcfff4]'}`}>Browse Causes</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted-1)]">
                Discover verified projects with clear goals, transparent budgets, and measurable impact.
              </p>
              <span
                className="invisible mt-auto self-end text-4xl font-semibold text-[#2af4bf] transition-transform duration-300 group-hover:translate-x-2"
                aria-hidden="true"
              >
                →
              </span>
            </Link>

            <Link
              to="/donate"
              className={`group relative flex min-h-[270px] flex-col rounded-3xl p-8 backdrop-blur-xl transition duration-500 ease-out hover:-translate-y-1.5 hover:scale-[1.015] ${
                isLightMode
                  ? 'border border-[rgba(175,163,206,0.34)] bg-[linear-gradient(165deg,rgba(250,248,255,0.95),rgba(239,238,252,0.88))] shadow-[0_12px_24px_rgba(84,83,128,0.14)] hover:border-[rgba(183,111,255,0.52)] hover:shadow-[0_18px_32px_rgba(118,95,170,0.22)]'
                  : 'border border-white/[0.07] bg-[linear-gradient(165deg,rgba(40,24,63,0.48),rgba(16,10,31,0.34))] shadow-[0_12px_28px_rgba(8,3,18,0.34),0_0_0_1px_rgba(255,255,255,0.03)_inset] hover:border-[rgba(183,111,255,0.42)] hover:shadow-[0_18px_34px_rgba(15,4,32,0.42),0_0_26px_rgba(183,111,255,0.2)]'
              }`}
            >
              <div
                className={`mb-6 flex h-11 w-11 items-center justify-center rounded-xl border ${
                  isLightMode
                    ? 'border-violet-500/35 bg-white/85 text-violet-700 shadow-[0_6px_16px_rgba(124,93,170,0.18)]'
                    : 'border-violet-300/35 bg-violet-300/10 text-violet-200 shadow-[0_0_24px_rgba(183,111,255,0.24)]'
                }`}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
                  <path d="M17 8V7a5 5 0 10-10 0v1H5v13h14V8h-2zm-8 0V7a3 3 0 016 0v1H9zm3 8.8a2.2 2.2 0 112.2-2.2A2.2 2.2 0 0112 16.8z" />
                </svg>
              </div>
              <span className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/45 to-transparent" />
              <h3 className={`text-2xl font-bold ${isLightMode ? 'text-[#2a2f56]' : 'text-[#f0e6ff]'}`}>Donate Securely</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted-1)]">
                Connect your wallet and send ETH directly. Receive instant on-chain proof of your donation.
              </p>
              <span
                className="invisible mt-auto self-end text-4xl font-semibold text-[#c782ff] transition-transform duration-300 group-hover:translate-x-2"
                aria-hidden="true"
              >
                →
              </span>
            </Link>

            <Link
              to="/ledger"
              className={`group relative flex min-h-[270px] flex-col rounded-3xl p-8 backdrop-blur-xl transition duration-500 ease-out hover:-translate-y-1.5 hover:scale-[1.015] ${
                isLightMode
                  ? 'border border-[rgba(170,198,150,0.36)] bg-[linear-gradient(165deg,rgba(249,253,242,0.95),rgba(238,246,234,0.88))] shadow-[0_12px_24px_rgba(91,113,83,0.14)] hover:border-[rgba(153,217,114,0.52)] hover:shadow-[0_18px_32px_rgba(105,146,70,0.2)]'
                  : 'border border-white/[0.07] bg-[linear-gradient(165deg,rgba(34,45,17,0.48),rgba(14,22,10,0.34))] shadow-[0_12px_28px_rgba(10,14,2,0.34),0_0_0_1px_rgba(255,255,255,0.03)_inset] hover:border-[rgba(153,255,77,0.42)] hover:shadow-[0_18px_34px_rgba(11,20,4,0.42),0_0_26px_rgba(176,255,72,0.18)]'
              }`}
            >
              <div
                className={`mb-6 flex h-11 w-11 items-center justify-center rounded-xl border ${
                  isLightMode
                    ? 'border-lime-500/35 bg-white/85 text-lime-700 shadow-[0_6px_16px_rgba(114,145,68,0.2)]'
                    : 'border-lime-300/35 bg-lime-300/10 text-lime-200 shadow-[0_0_24px_rgba(176,255,72,0.24)]'
                }`}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
                  <path d="M4 4h16v2H4zm2 4h12v12H6zm3 3v6h2v-6zm4 2v4h2v-4z" />
                </svg>
              </div>
              <span className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-lime-300/45 to-transparent" />
              <h3 className={`text-2xl font-bold ${isLightMode ? 'text-[#2a4521]' : 'text-[#efffd9]'}`}>Live Ledger</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted-1)]">
                Watch every donation and payout in real-time. Full transparency on the blockchain.
              </p>
              <span
                className="invisible mt-auto self-end text-4xl font-semibold text-[#b8ff4a] transition-transform duration-300 group-hover:translate-x-2"
                aria-hidden="true"
              >
                →
              </span>
            </Link>
          </div>

          <div
            className={`mx-auto mt-10 max-w-3xl rounded-3xl px-7 py-11 text-center backdrop-blur-xl sm:px-12 ${
              isLightMode
                ? 'border border-[rgba(169,188,212,0.34)] bg-[linear-gradient(180deg,rgba(251,253,255,0.95),rgba(239,246,252,0.88))] shadow-[0_14px_30px_rgba(70,94,124,0.12)]'
                : 'border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] shadow-[0_16px_32px_rgba(1,8,15,0.34),0_0_24px_rgba(45,245,173,0.12)]'
            }`}
          >
            <p className="mx-auto max-w-2xl text-balance text-sm leading-relaxed text-[var(--text-muted-1)] sm:text-base">
              Create your free account and start donating with full transparency
            </p>
            <Link
              to="/register"
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full border border-[rgba(58,255,176,0.58)] bg-[linear-gradient(180deg,#3dffc4,#23d78f)] px-10 py-2.5 text-base font-semibold text-[#042112] shadow-[0_0_0_1px_rgba(63,255,186,0.2)_inset,0_0_34px_rgba(51,255,178,0.45)] transition duration-300 hover:scale-[1.02] hover:brightness-110"
            >
              Join the Vault
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
