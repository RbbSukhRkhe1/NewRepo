import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { CreationHandsThree } from '../components/CreationHandsThree';

const ACCENT = '#00f0ff';

export function HomePage() {
  const [vault, setVault] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/config', { credentials: 'include' })
      .then((r) => r.json())
      .then((c: { superRichMasked?: string }) => setVault(c.superRichMasked ?? null))
      .catch(() => setVault(null));
  }, []);

  return (
    <div className="relative min-h-[88vh] overflow-hidden">
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#050a12] via-[#06080f] to-[#06080f]" />

      <CreationHandsThree />

      <div
        className="pointer-events-none absolute inset-0 z-[3]"
        style={
          {
            background: `radial-gradient(ellipse 70% 50% at 50% 22%, ${ACCENT}12, transparent 58%)`,
          } as CSSProperties
        }
      />

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-20 text-center sm:py-28">
        <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: ACCENT }}>
          Transparent giving
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Let&apos;s donate in Web3
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-zinc-400">
          Pick a cause, send ETH from your assigned test wallet on Anvil, and watch every transfer
          hit the public ledger. Built for a capstone: real txs, SQLite records, and a clear trail
          from donors to the vault and out to hospitals.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/causes"
            className="rounded-xl px-8 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            style={{ backgroundColor: ACCENT }}
          >
            Browse causes
          </Link>
          <Link
            to="/ledger"
            className="rounded-xl border border-white/20 px-8 py-3 text-sm font-medium text-white hover:bg-white/5"
          >
            View ledger
          </Link>
        </div>
        {vault && (
          <p className="mt-12 font-mono text-xs text-zinc-500">
            Main vault (masked): <span className="text-zinc-400">{vault}</span>
          </p>
        )}
      </div>
    </div>
  );
}
