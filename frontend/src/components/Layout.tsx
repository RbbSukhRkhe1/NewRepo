import { useEffect, useLayoutEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigationType } from 'react-router-dom';
import { NavPill, SecondaryButton } from './ui';
import { useAuth } from '../context/AuthContext';
import type { AuthUser } from '../context/AuthContext';

type ThemeMode = 'dark' | 'light';
const THEME_STORAGE_KEY = 'vaultex-theme-mode';

function walletChipLabel(user: AuthUser): string {
  const raw = (user.address ?? user.addressMasked ?? '').trim();
  if (!raw) return 'Wallet';
  // Prefer 0xabcd…1234; tolerate addresses that already include an ellipsis.
  if (raw.includes('…') || raw.length <= 14) return raw;
  return `${raw.slice(0, 6)}…${raw.slice(-4)}`;
}

function readStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  return window.localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
}

export function Layout() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const navigationType = useNavigationType();
  const [themeMode, setThemeMode] = useState<ThemeMode>(readStoredTheme);

  useLayoutEffect(() => {
    if (navigationType === 'POP') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [loc.pathname, loc.search, navigationType]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.style.transition = root.style.transition
      ? `${root.style.transition}, background-color 320ms ease`
      : 'background-color 320ms ease';
    body.style.transition = body.style.transition
      ? `${body.style.transition}, background-color 320ms ease`
      : 'background-color 320ms ease';
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.setAttribute('data-theme', themeMode);
    root.style.backgroundColor = themeMode === 'light' ? '#f3f8ff' : '#0A1F1C';
    body.style.backgroundColor = themeMode === 'light' ? '#f3f8ff' : '#0A1F1C';
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-depth-2)] text-[var(--text-high-1)]">
      <header className="vtx-glass-header sticky! top-0! z-[60]! shrink-0 transition-[box-shadow,filter] duration-300 ease-out">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="text-lg font-bold tracking-tight text-[var(--text-high-3)]">
            <span className="text-[var(--accent-bright-2)]">Vaultex</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-2" aria-label="Primary navigation">
            <NavPill to="/" label="Home" active={loc.pathname === '/'} />
            <NavPill to="/causes" label="Causes" active={loc.pathname === '/causes'} />
            <NavPill to="/causes/completed" label="Completed" active={loc.pathname === '/causes/completed'} />
            <NavPill to="/ledger" label="Ledger" active={loc.pathname === '/ledger'} />
            <NavPill to="/account" label="Account" active={loc.pathname === '/account'} />
            {user?.role === 'admin' && (
              <details className="group relative">
                <summary
                  className="inline-flex min-h-11 cursor-pointer list-none items-center rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-[var(--text-muted-1)] transition-colors hover:border-[var(--border-chrome-2)] hover:text-[var(--text-high-1)]"
                  aria-label="Admin actions"
                >
                  Admin
                </summary>
                <div className="vtx-glass-popover absolute right-0 top-[calc(100%+8px)] z-20 min-w-44 p-2">
                  <NavPill to="/admin/users" label="Users" active={loc.pathname === '/admin/users'} />
                  <NavPill
                    to="/admin/causes"
                    label="Manage causes"
                    active={loc.pathname === '/admin/causes'}
                  />
                  <NavPill
                    to="/admin/causes/new"
                    label="New cause"
                    active={loc.pathname === '/admin/causes/new'}
                  />
                </div>
              </details>
            )}
            {!user && <NavPill to="/register" label="Register" active={loc.pathname === '/register'} />}
            {!user && <NavPill to="/login" label="Sign in" active={loc.pathname === '/login'} />}
            <SecondaryButton
              type="button"
              onClick={() => setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              className="ml-1 gap-2 px-3"
            >
              {themeMode === 'dark' ? (
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
                  <path d="M12 17.5A5.5 5.5 0 1117.5 12 5.51 5.51 0 0112 17.5zm0-15a1 1 0 011 1v1.4a1 1 0 11-2 0V3.5a1 1 0 011-1zm0 17a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm8.5-8.5a1 1 0 010 2h-1.4a1 1 0 110-2h1.4zm-16.1 0a1 1 0 010 2H3a1 1 0 110-2h1.4zm11.66-6.96a1 1 0 011.42 0l1 1a1 1 0 11-1.42 1.42l-1-1a1 1 0 010-1.42zM6.94 16.06a1 1 0 011.42 0l1 1A1 1 0 117.94 18.5l-1-1a1 1 0 010-1.42zm11.54 1.42a1 1 0 01-1.42 0l-1-1a1 1 0 011.42-1.42l1 1a1 1 0 010 1.42zM7.94 5.5A1 1 0 016.52 6.9l-1-1A1 1 0 116.94 4.5l1 1z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
                  <path d="M20.7 14.2A8.5 8.5 0 1110.2 3.7a1 1 0 01.84 1.72A6.5 6.5 0 1018.6 13a1 1 0 011.74 1.2 8.27 8.27 0 01-.64 0z" />
                </svg>
              )}
              {themeMode === 'dark' ? 'Light' : 'Dark'}
            </SecondaryButton>
            {user && user.anvilIndex != null ? (
              <span
                className="ml-1 inline-flex max-w-[11rem] items-center gap-2 rounded-full border border-[var(--border-chrome-3)] bg-[var(--surface-panel-overlay)] px-3 py-1.5 text-[11px] font-mono font-semibold text-[var(--text-high-3)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md sm:max-w-[13rem] sm:text-xs"
                title={user.address ?? user.addressMasked ?? undefined}
                aria-label={`Wallet connected: ${walletChipLabel(user)}`}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.75)]"
                  aria-hidden
                />
                <span className="min-w-0 truncate">{walletChipLabel(user)}</span>
              </span>
            ) : null}
            {user && user.anvilIndex == null ? (
              <Link
                to="/account"
                className="ml-1 inline-flex max-w-[10rem] items-center gap-2 rounded-full border border-amber-400/35 bg-[var(--surface-panel-overlay)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-muted-1)] backdrop-blur-md transition-colors hover:border-amber-400/55 hover:text-[var(--text-high-3)] sm:text-xs"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full bg-amber-400/90 shadow-[0_0_8px_rgba(251,191,36,0.45)]"
                  aria-hidden
                />
                <span className="truncate">No wallet</span>
              </Link>
            ) : null}
            {user && (
              <SecondaryButton type="button" onClick={() => void logout()} className="ml-1 px-3">
                Sign out
              </SecondaryButton>
            )}
          </nav>
        </div>
      </header>
      <main
        className={`flex min-h-0 flex-1 flex-col ${loc.pathname === '/' || loc.pathname === '/donate' ? 'overflow-hidden' : ''}`}
      >
        <Outlet />
      </main>
      {loc.pathname !== '/' && loc.pathname !== '/donate' ? (
        <footer className="border-t border-[var(--glass-border)] bg-[var(--glass-bg-fallback)] py-6 text-center text-xs text-[var(--text-muted-2)]">
          Trusted donation platform · Secure giving with on-chain transparency · Verified causes and impact
          tracking ·{' '}
          <a href="#" className="text-[var(--text-high-1)]">
            Contract
          </a>{' '}
          ·{' '}
          <a href="#" className="text-[var(--text-high-1)]">
            Explorer
          </a>{' '}
          ·{' '}
          <a href="#" className="text-[var(--text-high-1)]">
            Audit
          </a>
        </footer>
      ) : null}
    </div>
  );
}
