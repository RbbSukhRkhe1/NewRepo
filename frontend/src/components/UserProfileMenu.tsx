import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { AuthUser } from '../context/AuthContext';

function displayName(user: AuthUser): string {
  const name = user.name.trim();
  return name || user.email.split('@')[0] || 'Account';
}

function avatarInitial(user: AuthUser): string {
  const name = user.name.trim();
  const ch = name[0] ?? user.email[0] ?? '?';
  return ch.toUpperCase();
}

type MenuItemProps = {
  to?: string;
  children: React.ReactNode;
  active?: boolean;
  destructive?: boolean;
  onClick?: () => void;
  themeMode: 'dark' | 'light';
};

function MenuItem({ to, children, active, destructive, onClick, themeMode }: MenuItemProps) {
  const base =
    'mx-1 flex w-[calc(100%-0.5rem)] items-center rounded-md px-3 py-2.5 text-left text-sm transition-colors duration-150';
  const normal = themeMode === 'light'
    ? active
      ? 'bg-slate-100 font-medium text-slate-900'
      : 'text-slate-700 hover:bg-slate-100'
    : active
      ? 'bg-white/10 font-medium text-[var(--text-high-3)]'
      : 'text-[var(--text-high-2)] hover:bg-white/[0.08]';
  const danger =
    themeMode === 'light'
      ? 'text-[#ef4444] hover:bg-red-50 hover:text-[#ef4444]'
      : 'text-[#ef4444] hover:bg-red-500/10 hover:text-[#ef4444]';
  const className = `${base} ${destructive ? danger : normal}`;

  if (to) {
    return (
      <Link to={to} role="menuitem" className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" role="menuitem" className={className} onClick={onClick}>
      {children}
    </button>
  );
}

export function UserProfileMenu({
  user,
  themeMode,
  onSignOut,
}: {
  user: AuthUser;
  themeMode: 'dark' | 'light';
  onSignOut: () => void | Promise<void>;
}) {
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const label = displayName(user);
  const initial = avatarInitial(user);
  const onAccount = loc.pathname === '/account';
  const onImpact = onAccount && loc.hash === '#acct-impact';

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  const triggerActive = onAccount;
  const triggerClass = triggerActive
    ? 'border-[var(--border-accent-soft)] bg-[var(--accent-core)] text-[#03130b]'
    : themeMode === 'light'
      ? 'border-emerald-400/35 bg-white/95 text-emerald-950 shadow-[0_8px_24px_-12px_rgba(6,78,59,0.12)] hover:border-emerald-500/45 hover:bg-emerald-50/40'
      : 'border-white/15 bg-white/[0.04] text-[var(--text-high-2)] hover:border-white/25 hover:bg-white/[0.08]';

  const menuPanelClass =
    themeMode === 'light'
      ? 'border border-slate-200/90 bg-white py-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.12),0_2px_8px_rgba(15,23,42,0.06)]'
      : 'border border-white/12 bg-[#0f1419] py-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.45)]';

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${label} account menu`}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex min-h-11 max-w-[12rem] items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-sm font-medium transition-colors ${triggerClass}`}
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            triggerActive
              ? 'bg-[#03130b]/15 text-[#03130b]'
              : themeMode === 'light'
                ? 'bg-emerald-600/15 text-emerald-800'
                : 'bg-emerald-500/20 text-emerald-200'
          }`}
          aria-hidden
        >
          {initial}
        </span>
        <span className="truncate">{label}</span>
        <svg
          viewBox="0 0 16 16"
          aria-hidden
          className={`h-4 w-4 shrink-0 opacity-60 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="currentColor"
        >
          <path d="M4.427 6.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 6H4.604a.25.25 0 00-.177.427z" />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Account menu"
          className={`absolute right-0 top-[calc(100%+8px)] z-30 min-w-[12rem] rounded-lg ${menuPanelClass}`}
        >
          <MenuItem
            to="/account"
            themeMode={themeMode}
            active={onAccount && !onImpact}
            onClick={close}
          >
            Profile
          </MenuItem>
          <MenuItem
            to="/account#acct-impact"
            themeMode={themeMode}
            active={onImpact}
            onClick={close}
          >
            My Impact
          </MenuItem>
          <div
            className={`mx-2 my-1.5 border-t ${themeMode === 'light' ? 'border-slate-200' : 'border-white/10'}`}
            role="separator"
          />
          <MenuItem
            themeMode={themeMode}
            destructive
            onClick={() => {
              close();
              void onSignOut();
            }}
          >
            Sign Out
          </MenuItem>
        </div>
      ) : null}
    </div>
  );
}
