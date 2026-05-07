import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiJson } from '../lib/api';

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
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold text-white">Causes</h1>
      <p className="mt-2 text-sm text-zinc-500">Choose where your ETH should make an impact.</p>
      <ul className="mt-10 space-y-4">
        {causes.map((c) => {
          const pct = Math.min(100, (c.raised_eth / c.goal_eth) * 100);
          return (
            <li key={c.id}>
              <Link
                to={`/causes/${c.id}`}
                className="block rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-cyan-500/30 hover:bg-white/[0.05]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">{c.title}</h2>
                    <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{c.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-mono text-cyan-400">
                      {c.raised_eth.toFixed(2)} / {c.goal_eth} ETH
                    </p>
                    <p className="text-xs text-zinc-500">{pct.toFixed(0)}% funded</p>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
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
