import { motion } from 'framer-motion';
import { useEffect, type ComponentType } from 'react';
import {
  Activity,
  BookOpenCheck,
  CircleUserRound,
  HeartHandshake,
  LayoutDashboard,
  LogIn,
  Shield,
  Users,
} from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PrivySignOutButton } from './PrivySignOutButton';

type NavItem = { to: string; label: string; icon: ComponentType<{ className?: string }> };

export function Layout() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const baseItems: NavItem[] = [
    { to: '/', label: 'Home', icon: HeartHandshake },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/causes', label: 'Causes', icon: Shield },
    { to: '/ledger', label: 'Ledger', icon: BookOpenCheck },
    { to: '/account', label: 'Profile', icon: CircleUserRound },
  ];
  const adminItems: NavItem[] =
    user?.role === 'admin'
      ? [
          { to: '/admin/users', label: 'Admin Users', icon: Users },
          { to: '/admin/users/new', label: 'New User', icon: Users },
          { to: '/admin/causes/new', label: 'New Cause', icon: Activity },
        ]
      : [];

  const navLink = (item: NavItem, mobile = false) => {
    const active = loc.pathname === item.to;
    const Icon = item.icon;
    return (
    <Link
      key={`${item.to}-${mobile ? 'm' : 'd'}`}
      to={item.to}
      className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium transition-all ${
        active
          ? 'bg-gradient-to-r from-[#14F5B3] to-[#7B4CFF] text-[#07080f]'
          : 'text-[#A0A0CC] hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon className="h-4 w-4" />
      {!mobile ? item.label : null}
    </Link>
  );
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc.pathname]);

  return (
    <div className="relative min-h-screen bg-[#0A0A0F] text-[#F8F9FF]">
      <div className="pointer-events-none absolute inset-0 vtx-grid-bg opacity-40" aria-hidden />
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#12121F]/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link to="/" className="font-space-grotesk text-lg font-bold tracking-[-0.02em]">
            Valutex <span className="text-[#14F5B3]">•</span>{' '}
            <span className="text-sm text-[#A0A0CC]">Trustless. Transparent. Empowered.</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden items-center rounded-full border border-emerald-300/35 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-200 md:flex">
              <span className="mr-2 h-2 w-2 animate-pulse rounded-full bg-[#14F5B3]" />
              Base Sepolia • Live
            </div>
            {user?.embeddedWalletMasked ? (
              <span className="hidden rounded-full border border-white/10 px-3 py-1 font-space-mono text-xs text-[#A0A0CC] md:inline">
                {user.embeddedWalletMasked}
              </span>
            ) : null}
            {!user ? (
              <Link to="/login" className="vtx-btn-ghost px-3 py-2 text-sm text-white">
                <span className="inline-flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign in
                </span>
              </Link>
            ) : null}
            {user &&
              (import.meta.env.VITE_PRIVY_APP_ID ? (
                <PrivySignOutButton />
              ) : (
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="vtx-btn-ghost px-3 py-2 text-sm text-white"
                >
                  Sign out
                </button>
              ))}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-4 px-4 pb-24 pt-20">
        <aside className="sticky top-20 hidden h-[calc(100vh-7rem)] w-64 shrink-0 vtx-surface p-3 lg:block">
          <nav className="space-y-2">
            {[...baseItems, ...adminItems].map((item) => navLink(item))}
          </nav>
        </aside>

        <motion.main
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="min-h-[calc(100vh-11rem)] w-full"
        >
          <Outlet />
        </motion.main>
      </div>

      <nav className="fixed inset-x-2 bottom-2 z-50 rounded-3xl border border-white/10 bg-[#12121F]/90 p-2 backdrop-blur-2xl lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {baseItems.map((item) => navLink(item, true))}
        </div>
      </nav>

      <footer className="border-t border-white/10 py-8 text-center text-xs text-[#A0A0CC]">
        Built with React, Express, Supabase, Privy, Pimlico, and Base Sepolia ·{' '}
        <a href="https://github.com/" target="_blank" rel="noreferrer" className="text-[#14F5B3]">
          GitHub
        </a>
      </footer>
    </div>
  );
}
