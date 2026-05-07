import { Link, Outlet, useLocation } from 'react-router-dom';
import { NavPill, SecondaryButton } from './ui';
import { useAuth } from '../context/AuthContext';

export function Layout() {
  const { user, logout } = useAuth();
  const loc = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-depth-2)] text-[var(--text-high-1)]">
      <header className="sticky top-0 z-50 border-b border-[var(--border-chrome-1)] bg-[color:rgb(7_10_18_/_0.9)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="text-lg font-bold tracking-tight text-[var(--text-high-3)]">
            <span className="text-[var(--accent-bright-2)]">Vaultex</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-2" aria-label="Primary navigation">
            <NavPill to="/" label="Home" active={loc.pathname === '/'} />
            <NavPill to="/causes" label="Causes" active={loc.pathname === '/causes'} />
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
                <div className="absolute right-0 top-[calc(100%+8px)] z-20 min-w-44 rounded-xl border border-[var(--border-chrome-2)] bg-[var(--surface-panel-overlay)] p-2 shadow-xl">
                  <NavPill to="/admin/users" label="Users" active={loc.pathname === '/admin/users'} />
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
            {user && (
              <SecondaryButton type="button" onClick={() => void logout()} className="ml-1 px-3">
                Sign out
              </SecondaryButton>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-[var(--border-chrome-1)] py-6 text-center text-xs text-[var(--text-muted-2)]">
        Capstone demo · Anvil + SQLite · Transparent on-chain activity ·{' '}
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
    </div>
  );
}
