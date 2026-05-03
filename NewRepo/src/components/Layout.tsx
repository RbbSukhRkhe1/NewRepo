import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AnvilParticleBackdrop } from './AnvilParticleBackdrop';
import { apiJson } from '../lib/api';

const ACCENT = '#22c55e';

export function Layout() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const [balanceEth, setBalanceEth] = useState<string | null>(null);
  const [balanceFlash, setBalanceFlash] = useState(false);

  const isActive = (path: string) => {
    if (path === '/causes') return loc.pathname === '/causes' || loc.pathname.startsWith('/causes/');
    return loc.pathname === path;
  };

  const link = (to: string, label: string) => (
    <Link
      to={to}
      className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
        isActive(to) ? 'text-[#041214]' : 'text-zinc-400 hover:text-white'
      }`}
      style={isActive(to) ? { backgroundColor: ACCENT, boxShadow: `0 0 20px -4px ${ACCENT}` } : undefined}
    >
      {label}
    </Link>
  );

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.classList.add('reveal--visible');
          io.unobserve(el);
        }
      },
      { threshold: 0.12 },
    );

    const observeEl = (root: ParentNode) => {
      const candidates = root instanceof Element ? (root.matches?.('[data-reveal]') ? [root] : []) : [];
      const list = root instanceof Element ? root.querySelectorAll<HTMLElement>('[data-reveal]') : root.querySelectorAll<HTMLElement>('[data-reveal]');
      for (const el of candidates) io.observe(el as HTMLElement);
      for (const el of Array.from(list)) io.observe(el);
    };

    // Observe what exists now (initial render after route change)
    observeEl(document.body);

    // Also observe anything that mounts later (async loads that render new cards)
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of Array.from(m.addedNodes)) {
          if (node instanceof Element) {
            observeEl(node);
          }
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io.disconnect();
    };
  }, [loc.pathname]);

  useEffect(() => {
    const idx = user?.anvilIndex;
    if (idx == null) {
      setBalanceEth(null);
      return;
    }

    let alive = true;
    async function loadBalance() {
      try {
        const b = await apiJson<{ eth: string }>(`/balance/${idx}`);
        if (!alive) return;
        setBalanceEth(b.eth);
      } catch {
        if (!alive) return;
        setBalanceEth(null);
      }
    }

    void loadBalance();
    const t = window.setInterval(() => void loadBalance(), 8000);

    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [user?.anvilIndex]);

  useEffect(() => {
    if (balanceEth == null) return;
    setBalanceFlash(true);
    const t = window.setTimeout(() => setBalanceFlash(false), 900);
    return () => window.clearTimeout(t);
  }, [balanceEth]);

  return (
    <div className="relative min-h-screen text-zinc-100">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[#070a12]" aria-hidden />
      <AnvilParticleBackdrop accent={ACCENT} />
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_120%_90%_at_50%_-40%,rgba(34,197,94,0.16),transparent_52%),radial-gradient(ellipse_70%_50%_at_110%_15%,rgba(34,197,94,0.12),transparent),radial-gradient(ellipse_55%_45%_at_-10%_100%,rgba(251,191,36,0.07),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.4] mix-blend-soft-light bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:72px_72px]"
        aria-hidden
      />

      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#070a12]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="font-display text-lg font-semibold tracking-tight text-white">
            <span style={{ color: ACCENT }}>VAULTEX</span>
          </Link>
          <div className="flex items-center gap-2">
            {user?.anvilIndex != null && balanceEth != null && (
              <div
                className={[
                  'hidden sm:flex items-center gap-2 rounded-full border border-emerald-400/20 bg-black/35 px-3 py-2',
                  'shadow-[0_0_28px_-12px_rgba(34,197,94,0.45)]',
                  balanceFlash ? 'animate-pulse' : '',
                ].join(' ')}
                title="Remaining wallet balance (demo chain)"
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/80">
                  BAL
                </span>
                <span className="font-mono text-sm font-semibold text-emerald-200 tabular-nums">
                  {parseFloat(balanceEth).toFixed(4)} ETH
                </span>
              </div>
            )}

            <nav className="flex flex-wrap items-center gap-1">
              {link('/', 'Home')}
              {link('/causes', 'Causes')}
              {link('/ledger', 'Ledger')}
              {link('/account', 'Account')}
              {user?.role === 'admin' && (
                <details className="relative z-[60]">
                  <summary className="list-none cursor-pointer rounded-full px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-white [&::-webkit-details-marker]:hidden">
                    Admin <span className="text-zinc-600">▾</span>
                  </summary>
                  <div className="absolute right-0 top-full mt-1 min-w-[12rem] rounded-2xl border border-white/10 bg-[#0d1520]/95 py-1 shadow-2xl backdrop-blur-xl">
                    <Link
                      to="/admin/users"
                      className="block px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-emerald-300"
                    >
                      Users
                    </Link>
                    <Link
                      to="/admin/users/new"
                      className="block px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-emerald-300"
                    >
                      New user
                    </Link>
                    <Link
                      to="/admin/causes/new"
                      className="block px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-emerald-300"
                    >
                      New cause
                    </Link>
                  </div>
                </details>
              )}
              {!user && link('/login', 'Sign in')}
              {user && (
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="ml-1 rounded-full border border-white/10 px-3 py-2 text-sm text-zinc-400 transition-colors hover:border-white/20 hover:text-white"
                >
                  Sign out
                </button>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1">
        <Outlet />
      </main>

      <footer className="relative z-10 border-t border-white/[0.06] bg-[#070a12]/80 py-8 text-center text-xs text-zinc-600 backdrop-blur-sm">
        <p className="font-display text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
          Transparent giving · on-chain trail · built for real impact
        </p>
      </footer>
    </div>
  );
}
