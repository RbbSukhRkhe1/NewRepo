import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { SectionHeader, SurfaceCard } from '../components/ui';

type Cause = {
  id: number;
  title: string;
  description: string;
  goal_eth: number;
  raised_eth: number;
};

export function CausesPage() {
  const [causes, setCauses] = useState<Cause[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiJson<Cause[]>('/causes')
      .then(setCauses)
      .catch((e: Error) => setErr(e.message));
  }, []);

  if (err) {
    return (
      <div className="px-4 py-12 text-center text-rose-400">
        {err} — is the API running? Use <code className="text-zinc-400">npm run dev</code>
      </div>
    );
  }

  return (
    <div className="vtx-page max-w-4xl">
      <SectionHeader title="Causes" body="Choose where your ETH should make an impact." />
      <ul className="mt-10 space-y-4">
        {causes.map((c) => {
          const pct = Math.min(100, (c.raised_eth / c.goal_eth) * 100);
          return (
            <li key={c.id}>
              <Link to={`/causes/${c.id}`} className="block rounded-2xl focus-visible:rounded-2xl">
                <SurfaceCard className="transition-colors hover:border-[var(--border-accent-soft)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--text-high-3)]">{c.title}</h2>
                    <p className="mt-2 line-clamp-2 text-sm text-[var(--text-muted-1)]">{c.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-mono text-[var(--accent-bright-2)]">
                      {c.raised_eth.toFixed(2)} / {c.goal_eth} ETH
                    </p>
                    <p className="text-xs text-[var(--text-muted-1)]">{pct.toFixed(0)}% funded</p>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--bg-depth-1)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--accent-deep-1)] to-[var(--accent-bright-2)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                </SurfaceCard>
              </Link>
            </li>
          );
        })}
      </ul>
      {causes.length === 0 && !err && (
        <p className="mt-8 text-center text-zinc-500">No causes yet. Admins can add one.</p>
      )}
    </div>
  );
}
