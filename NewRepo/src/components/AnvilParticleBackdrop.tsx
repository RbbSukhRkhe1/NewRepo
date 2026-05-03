import { useEffect, useMemo, useRef } from 'react';

type Particle = {
  x: number; // 0..1
  y: number; // 0..1
  vx: number; // -..+
  vy: number; // -..+
  r: number; // px radius
  a: number; // alpha multiplier
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function AnvilParticleBackdrop({
  accent = '#22c55e',
  count = 90,
}: {
  accent?: string;
  count?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.2, active: false });

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: count }, () => ({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.012,
        vy: (Math.random() - 0.5) * 0.012,
        r: 0.7 + Math.random() * 1.6,
        a: 0.35 + Math.random() * 0.6,
      })),
    [count],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduceMotion) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const { innerWidth: w, innerHeight: h } = window;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const parseAccent = (hex: string) => {
      const s = hex.replace('#', '');
      const v = parseInt(s.length === 3 ? s.split('').map((c) => c + c).join('') : s, 16);
      const r = (v >> 16) & 255;
      const g = (v >> 8) & 255;
      const b = v & 255;
      return { r, g, b };
    };
    const ac = parseAccent(accent);

    let last = performance.now();
    const tick = (now: number) => {
      rafRef.current = window.requestAnimationFrame(tick);

      const dt = clamp((now - last) / 16.67, 0.5, 2.0);
      last = now;

      const w = window.innerWidth;
      const h = window.innerHeight;

      // Clear with slight alpha for motion trails
      ctx.fillStyle = 'rgba(7,10,18,0.18)';
      ctx.fillRect(0, 0, w, h);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const mousePull = mouseRef.current.active ? 0.22 : 0.12;
      const linkDist = 120;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]!;

        // mouse repulsion / attraction
        const dxm = p.x - mx;
        const dym = p.y - my;
        const dm = Math.sqrt(dxm * dxm + dym * dym) + 1e-6;

        if (mouseRef.current.active) {
          const strength = (1 / (dm * 10)) * mousePull;
          p.vx += (dxm / dm) * strength * 0.02;
          p.vy += (dym / dm) * strength * 0.02;
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Gentle drift damping
        p.vx *= 0.995;
        p.vy *= 0.995;

        // Wrap-around for infinite background feel
        if (p.x < -0.05) p.x = 1.05;
        if (p.x > 1.05) p.x = -0.05;
        if (p.y < -0.05) p.y = 1.05;
        if (p.y > 1.05) p.y = -0.05;
      }

      // Links
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i]!;
          const b = particles[j]!;
          const ax = a.x * w;
          const ay = a.y * h;
          const bx = b.x * w;
          const by = b.y * h;
          const dx = ax - bx;
          const dy = ay - by;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > linkDist) continue;

          const t = 1 - d / linkDist;
          const alpha = t * 0.22;
          ctx.strokeStyle = `rgba(${ac.r},${ac.g},${ac.b},${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }
      }

      // Dots
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]!;
        const x = p.x * w;
        const y = p.y * h;
        const r = p.r;
        ctx.fillStyle = `rgba(${ac.r},${ac.g},${ac.b},${p.a * 0.65})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    rafRef.current = window.requestAnimationFrame(tick);

    const onMove = (e: PointerEvent) => {
      mouseRef.current.active = true;
      mouseRef.current.x = e.clientX / window.innerWidth;
      mouseRef.current.y = e.clientY / window.innerHeight;
    };
    const onLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [accent, particles]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[0]"
      aria-hidden
    />
  );
}

