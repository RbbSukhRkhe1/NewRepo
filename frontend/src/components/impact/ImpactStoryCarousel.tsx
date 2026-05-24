import { useEffect, useState } from 'react';
import type { BeneficiaryStory } from '../../data/beneficiaryStories';

type Props = {
  stories: BeneficiaryStory[];
  isLightMode: boolean;
};

export function ImpactStoryCarousel({ stories, isLightMode }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || stories.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % stories.length);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [isPaused, stories.length]);

  const slide = stories[activeIndex];
  if (!slide) return null;

  const goPrev = () => setActiveIndex((prev) => (prev - 1 + stories.length) % stories.length);
  const goNext = () => setActiveIndex((prev) => (prev + 1) % stories.length);

  const hookClass = isLightMode ? 'text-slate-900' : 'text-white/95';
  const heartClass = isLightMode ? 'text-slate-600' : 'text-slate-300/90';

  return (
    <section
      className={`mt-16 border-t pt-14 sm:mt-20 sm:pt-16 ${
        isLightMode ? 'border-slate-200/80' : 'border-white/10'
      }`}
      aria-labelledby="impact-stories-heading"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-2xl">
        <p
          className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${
            isLightMode ? 'text-slate-500' : 'text-slate-400'
          }`}
        >
          Beneficiary voices
        </p>
        <h2
          id="impact-stories-heading"
          className={`mt-2 text-2xl font-bold tracking-tight sm:text-3xl ${
            isLightMode ? 'text-slate-900' : 'text-white'
          }`}
        >
          Stories from the ledger
        </h2>
        <p className={`mt-3 text-sm leading-relaxed ${isLightMode ? 'text-slate-600' : 'text-slate-400'}`}>
          Real outcomes from fulfilled campaigns, verified on-chain.
        </p>
      </div>

      <div
        className="relative mt-10 max-w-3xl"
        role="region"
        aria-roledescription="carousel"
        aria-label="Beneficiary stories"
      >
        <p className="sr-only" aria-live="polite">
          {slide.categoryLabel}. {slide.firstName}. {slide.storyHook} {slide.storyHeart}
        </p>

        <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: slide.accent }}>
          {slide.categoryLabel}
        </p>

        <blockquote className="mt-5 border-l-[3px] pl-5 sm:pl-6" style={{ borderColor: slide.accent }}>
          <p className={`text-lg font-semibold leading-relaxed sm:text-xl ${hookClass}`}>{slide.storyHook}</p>
          <p className={`mt-4 text-base leading-relaxed ${heartClass}`}>{slide.storyHeart}</p>
        </blockquote>

        <footer className="mt-6">
          <p className={`text-sm font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>{slide.firstName}</p>
          <p className={`text-xs ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>{slide.roleLabel}</p>
        </footer>

        <div className="mt-8 flex flex-wrap gap-2">
          <span
            className={`rounded-full px-3 py-1.5 text-xs ${
              isLightMode ? 'bg-slate-100 text-slate-700' : 'bg-white/[0.06] text-slate-200'
            }`}
          >
            {slide.statDonors}
          </span>
          <span
            className={`rounded-full px-3 py-1.5 text-xs ${
              isLightMode ? 'bg-slate-100 text-slate-700' : 'bg-white/[0.06] text-slate-200'
            }`}
          >
            {slide.statOutcome}
          </span>
        </div>

        {stories.length > 1 ? (
          <>
            <button
              type="button"
              onClick={goPrev}
              className={`absolute -left-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full sm:-left-12 ${
                isLightMode
                  ? 'border border-slate-200 bg-white text-slate-800 shadow-sm'
                  : 'bg-white/10 text-white hover:bg-white/15'
              }`}
              aria-label="Previous story"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={goNext}
              className={`absolute -right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full sm:-right-12 ${
                isLightMode
                  ? 'border border-slate-200 bg-white text-slate-800 shadow-sm'
                  : 'bg-white/10 text-white hover:bg-white/15'
              }`}
              aria-label="Next story"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>

            <div className="mt-10 flex items-center gap-3">
              {stories.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`h-1.5 rounded-full transition-all ${idx === activeIndex ? 'w-8' : 'w-1.5 opacity-40'}`}
                  style={{ backgroundColor: idx === activeIndex ? slide.accent : isLightMode ? '#94a3b8' : '#64748b' }}
                  aria-label={`Story ${idx + 1}: ${s.categoryLabel}`}
                />
              ))}
              <span className={`text-[10px] uppercase tracking-wider ${isLightMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {activeIndex + 1} / {stories.length}
              </span>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
