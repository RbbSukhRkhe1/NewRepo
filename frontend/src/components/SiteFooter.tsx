type ThemeMode = 'dark' | 'light';

export function SiteFooter({ themeMode: _themeMode }: { themeMode: ThemeMode }) {
  return (
    <footer className="vtx-site-footer mt-auto shrink-0 border-t py-6 text-center text-xs leading-relaxed text-[var(--text-muted-2)]">
      <div className="mx-auto max-w-6xl px-4">
        Trusted donation platform · Secure giving with on-chain transparency · Verified causes and impact
        tracking
      </div>
    </footer>
  );
}
