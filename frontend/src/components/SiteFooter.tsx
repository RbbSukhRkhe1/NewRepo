type ThemeMode = 'dark' | 'light';

export function SiteFooter({ themeMode }: { themeMode: ThemeMode }) {
  const isLight = themeMode === 'light';

  return (
    <footer
      className={`mt-auto shrink-0 border-t py-6 text-center text-xs leading-relaxed ${
        isLight
          ? 'border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.98)_0%,rgba(241,245,249,1)_100%)] text-slate-500'
          : 'border-[var(--glass-border)] bg-[var(--glass-bg-fallback)] text-[var(--text-muted-2)]'
      }`}
    >
      <div className="mx-auto max-w-6xl px-4">
        Trusted donation platform · Secure giving with on-chain transparency · Verified causes and impact
        tracking
      </div>
    </footer>
  );
}
