import { useEffect, useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import { Activity, ArrowLeft, ArrowRight, Eye, ShieldCheck } from 'lucide-react';

type HighlightItem = {
  title: string;
  description: string;
  Icon: ComponentType<{ className?: string }>;
};

const HIGHLIGHTS: HighlightItem[] = [
  {
    title: 'Transparent Ledger',
    description: 'Every donation is fully visible on-chain',
    Icon: Eye,
  },
  {
    title: 'Direct Wallet to Vault',
    description: 'Your ETH flows directly from your wallet to the cause',
    Icon: ArrowRight,
  },
  {
    title: 'Verified Causes',
    description: 'Only rigorously vetted projects receive funds',
    Icon: ShieldCheck,
  },
  {
    title: 'Live Impact Tracking',
    description: "Follow your donation's real-time journey and impact",
    Icon: Activity,
  },
];

const AUTOPLAY_MS = 4000;

export function CarouselHighlights() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const total = HIGHLIGHTS.length;

  useEffect(() => {
    if (isPaused) return;

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total);
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [isPaused, total]);

  const trackStyle = useMemo(
    () => ({
      transform: `translateX(-${activeIndex * 100}%)`,
    }),
    [activeIndex],
  );

  const goToSlide = (nextIndex: number) => {
    setActiveIndex((nextIndex + total) % total);
  };

  return (
    <div
      className="group relative mx-auto mt-7 w-full max-w-xl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-label="Vault highlights carousel"
    >
      <div className="relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-[#091722]/95 via-[#0b121b]/95 to-[#090f17]/95 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_45px_-24px_rgba(34,197,94,0.38)]">
        <div
          className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={trackStyle}
          role="region"
          aria-live="polite"
        >
          {HIGHLIGHTS.map((item) => {
            const Icon = item.Icon;
            return (
              <article
                key={item.title}
                className="w-full shrink-0 rounded-xl border border-white/5 bg-gradient-to-r from-white/[0.04] to-transparent px-5 py-4 sm:px-6"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-2 text-emerald-300">
                    <Icon className="h-4 w-4" />
                  </span>
                  <h3 className="font-display text-sm font-semibold tracking-wide text-zinc-100 sm:text-base">
                    {item.title}
                  </h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.description}</p>
              </article>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => goToSlide(activeIndex - 1)}
        className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/10 bg-[#08111a]/85 p-2 text-zinc-300 opacity-0 transition group-hover:opacity-100 hover:border-emerald-300/35 hover:text-emerald-200 sm:inline-flex"
        aria-label="Previous highlight"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => goToSlide(activeIndex + 1)}
        className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/10 bg-[#08111a]/85 p-2 text-zinc-300 opacity-0 transition group-hover:opacity-100 hover:border-emerald-300/35 hover:text-emerald-200 sm:inline-flex"
        aria-label="Next highlight"
      >
        <ArrowRight className="h-3.5 w-3.5" />
      </button>

      <div className="mt-3 flex justify-center gap-2.5">
        {HIGHLIGHTS.map((item, index) => (
          <button
            key={item.title}
            type="button"
            onClick={() => goToSlide(index)}
            className={[
              'h-1.5 rounded-full transition-all duration-300',
              activeIndex === index ? 'w-6 bg-emerald-300/90' : 'w-1.5 bg-zinc-500/55 hover:bg-zinc-400/70',
            ].join(' ')}
            aria-label={`Go to ${item.title}`}
            aria-current={activeIndex === index}
          />
        ))}
      </div>
    </div>
  );
}
