import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

const baseInteractive =
  'inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-55';

export function PrimaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        baseInteractive,
        'vtx-btn-primary bg-gradient-to-r from-[var(--accent-core)] to-[var(--accent-bright-2)] text-[#04120b] shadow-[0_0_0_1px_var(--border-accent-soft)_inset,0_0_24px_var(--fx-glow-accent-low)] hover:shadow-[0_0_0_1px_var(--border-accent-soft)_inset,0_0_30px_var(--fx-glow-accent-low)]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        baseInteractive,
        'vtx-btn-secondary border border-[var(--border-chrome-3)] bg-[var(--surface-panel-overlay)] text-[var(--text-high-3)] hover:border-[var(--border-chrome-4)] hover:bg-[var(--overlay-surface-soft)]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function PrimaryLinkButton({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  return (
    <Link
      to={to}
      className={cn(
        baseInteractive,
        'vtx-btn-primary bg-gradient-to-r from-[var(--accent-core)] to-[var(--accent-bright-2)] text-[#04120b] shadow-[0_0_0_1px_var(--border-accent-soft)_inset,0_0_24px_var(--fx-glow-accent-low)]',
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function SecondaryLinkButton({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  return (
    <Link
      to={to}
      className={cn(
        baseInteractive,
        'vtx-btn-secondary border border-[var(--border-chrome-3)] bg-[var(--surface-panel-overlay)] text-[var(--text-high-3)] hover:border-[var(--border-chrome-4)] hover:bg-[var(--overlay-surface-soft)]',
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function NavPill({
  to,
  label,
  active,
}: {
  to: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        'vtx-nav-pill inline-flex min-h-11 items-center rounded-xl border px-3 py-2 text-sm font-medium transition-[background-color,border-color,color,box-shadow] duration-300 ease-out',
        active
          ? 'vtx-nav-pill--active border-[var(--border-accent-soft)] bg-[var(--accent-core)] text-[#03130b]'
          : 'border-transparent text-[var(--text-muted-1)] hover:border-[var(--border-chrome-2)] hover:text-[var(--text-high-1)]',
      )}
      aria-current={active ? 'page' : undefined}
    >
      {label}
    </Link>
  );
}

/** Card shell — uses `.vtx-surface` (glass tokens in `src/index.css`; see `frontend/README.md`). */
export function SurfaceCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('vtx-surface p-5 sm:p-6', className)}>{children}</div>;
}

export function EyebrowLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn('vtx-eyebrow text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-bright-2)]', className)}
    >
      {children}
    </p>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
}) {
  return (
    <header>
      {eyebrow ? <EyebrowLabel>{eyebrow}</EyebrowLabel> : null}
      <h1 className="mt-2 text-3xl font-bold tracking-[-0.02em] text-[var(--text-high-3)]">{title}</h1>
      {body ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-muted-1)]">{body}</p> : null}
    </header>
  );
}
