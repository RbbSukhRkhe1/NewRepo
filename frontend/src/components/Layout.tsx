import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ACCENT = '#00f0ff';

export function Layout() {
  const { user, logout } = useAuth();
  const loc = useLocation();

  const link = (to: string, label: string) => (
    <Link
      to={to}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        loc.pathname === to ? 'text-black' : 'text-zinc-400 hover:text-white'
      }`}
      style={loc.pathname === to ? { backgroundColor: ACCENT } : undefined}
    >
      {label}
    </Link>
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#06080f] text-zinc-100">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#06080f]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="text-lg font-bold tracking-tight text-white">
            <span style={{ color: ACCENT }}>Vaultex</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-1">
            {link('/', 'Home')}
            {link('/causes', 'Causes')}
            {link('/ledger', 'Ledger')}
            {link('/account', 'Account')}
            {user?.role === 'admin' && link('/admin/users', 'Users')}
            {user?.role === 'admin' && link('/admin/causes/new', 'New cause')}
            {!user && link('/register', 'Register')}
            {!user && link('/login', 'Sign in')}
            {user && (
              <button
                type="button"
                onClick={() => void logout()}
                className="ml-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"
              >
                Sign out
              </button>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-white/10 py-6 text-center text-xs text-zinc-600">
        Capstone demo · Anvil + SQLite · Transparent on-chain activity
      </footer>
    </div>
  );
}
