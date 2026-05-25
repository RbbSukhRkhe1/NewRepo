import { useEffect, useLayoutEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigationType } from 'react-router-dom';
import { NavPill } from './ui';
import { SiteFooter } from './SiteFooter';
import { PremiumLightAtmosphere } from './PremiumLightAtmosphere';
import { UserProfileMenu } from './UserProfileMenu';
import { useAuth } from '../context/AuthContext';

type ThemeMode = 'dark' | 'light';
const THEME_STORAGE_KEY = 'vaultex-theme-mode';

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
    root.style.backgroundColor = themeMode === 'light' ? '#f6f9fc' : '#0A1F1C';
    body.style.backgroundColor = themeMode === 'light' ? '#f6f9fc' : '#0A1F1C';
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
            <NavPill to="/causes/completed" label="Impact" active={loc.pathname === '/causes/completed'} />
            <NavPill to="/ledger" label="Ledger" active={loc.pathname === '/ledger'} />
            {user ? (
              <UserProfileMenu user={user} themeMode={themeMode} onSignOut={() => logout()} />
            ) : null}
            {!user ? (
              <NavPill to="/login" label="Sign in" active={loc.pathname === '/login'} />
            ) : null}
            <button
              type="button"
              onClick={() => setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              className="vtx-theme-toggle ml-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] text-slate-200 transition-[background-color,border-color,color,box-shadow] duration-300 ease-out hover:border-white/25 hover:bg-white/[0.08]"
              aria-label={themeMode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              title={themeMode === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {themeMode === 'dark' ? (
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
          </nav>
        </div>
      </header>
      <main
        className={`relative flex min-h-0 flex-1 flex-col ${loc.pathname === '/donate' ? 'overflow-hidden' : ''}`}
      >
        {themeMode === 'light' ? <PremiumLightAtmosphere /> : null}
        <div className="vtx-page-shell relative z-[1] flex min-h-0 flex-1 flex-col">
          <Outlet />
        </div>
      </main>
      <SiteFooter themeMode={themeMode} />
    </div>
  );
}
