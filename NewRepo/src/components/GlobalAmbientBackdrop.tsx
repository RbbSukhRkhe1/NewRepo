import { AnvilParticleBackdrop } from './AnvilParticleBackdrop';

/** Shared emerald accent — keeps particles, glow orbs, and washes aligned */
const ACCENT = '#22c55e';

/**
 * Full-viewport ambient layer: mounts once inside `Layout` so every route
 * (including home) sees the same particle mesh, glow drift, and grid.
 */
export function GlobalAmbientBackdrop({
  accent = ACCENT,
  particleCount = 90,
}: {
  accent?: string;
  /** Slightly denser mesh on wide screens handled by caller if needed */
  particleCount?: number;
}) {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 isolate overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#070a12]" />

      {/* Slow moving color wash — visible behind foreground content on all pages */}
      <div
        className="vaultex-glow-emerald vaultex-glow-drift-a absolute -left-[18%] -top-[12%] h-[58vmin] w-[58vmin] rounded-full blur-[92px]"
        style={{ background: 'radial-gradient(circle at 35% 40%, rgba(34,197,94,0.22), transparent 68%)' }}
      />
      <div
        className="vaultex-glow-teal vaultex-glow-drift-b absolute -right-[12%] top-[28%] h-[48vmin] w-[48vmin] rounded-full blur-[84px]"
        style={{ background: 'radial-gradient(circle at 50% 50%, rgba(45,212,191,0.12), transparent 70%)' }}
      />
      <div
        className="vaultex-glow-amber vaultex-glow-drift-c absolute bottom-[-18%] left-[20%] h-[52vmin] w-[52vmin] rounded-full blur-[100px]"
        style={{ background: 'radial-gradient(circle at 45% 45%, rgba(251,191,36,0.07), transparent 72%)' }}
      />

      <AnvilParticleBackdrop accent={accent} count={particleCount} />

      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_120%_90%_at_50%_-40%,rgba(34,197,94,0.16),transparent_52%),radial-gradient(ellipse_70%_50%_at_110%_15%,rgba(34,197,94,0.12),transparent),radial-gradient(ellipse_55%_45%_at_-10%_100%,rgba(251,191,36,0.07),transparent)]"
      />
      <div className="absolute inset-0 opacity-[0.4] mix-blend-soft-light bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:72px_72px]" />

      {/* Very subtle top edge sheen — ties hero + inner pages together */}
      <div className="vaultex-glow-shimmer absolute inset-x-0 top-0 h-[min(40vh,420px)] bg-gradient-to-b from-white/[0.03] to-transparent" />
    </div>
  );
}

export { ACCENT as GLOBAL_AMBIENT_ACCENT };
