import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
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
    <div className="space-y-6 pb-10">
      <header className="vtx-card p-6">
        <h1 className="font-space-grotesk text-4xl font-bold tracking-[-0.02em]">Causes</h1>
        <p className="mt-2 text-sm text-[#A0A0CC]">Choose where your ETH should make measurable impact.</p>
      </header>
      <ul className="grid gap-4 lg:grid-cols-2">
        {causes.map((c) => {
          const pct = Math.min(100, (c.raised_eth / c.goal_eth) * 100);
          return (
            <li key={c.id}>
              <motion.div whileHover={{ y: -4 }}>
              <Link
                to={`/causes/${c.id}`}
                className="vtx-card block p-6 transition-all hover:border-[#14F5B3]/50"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-space-grotesk text-2xl font-semibold tracking-[-0.02em]">{c.title}</h2>
                    <p className="mt-2 line-clamp-2 text-sm text-[#A0A0CC]">{c.description}</p>
                  </div>
                  <div className="text-right font-space-mono">
                    <p className="text-lg text-[#14F5B3]">
                      {c.raised_eth.toFixed(2)} / {c.goal_eth.toFixed(2)} ETH
                    </p>
                    <p className="text-xs text-[#A0A0CC]">{pct.toFixed(0)}% funded</p>
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#0A0A0F]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#14F5B3] to-[#7B4CFF]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-4 inline-flex items-center gap-2 text-sm text-[#14F5B3]">
                  Donate now <ArrowUpRight className="h-4 w-4" />
                </div>
              </Link>
              </motion.div>
            </li>
          );
        })}
      </ul>
      {causes.length === 0 && !err && (
        <p className="mt-8 text-center text-[#A0A0CC]">No causes yet. Admins can add one.</p>
      )}
    </div>
  );
}
