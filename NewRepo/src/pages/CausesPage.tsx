import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { useAuth } from '../context/AuthContext';

type Cause = {
  id: number;
  title: string;
  description: string;
  goal_eth: number;
  raised_eth: number;
};

const STRIPES = [
  'from-emerald-500 via-lime-500 to-green-600',
  'from-lime-500 via-emerald-500 to-green-700',
  'from-amber-500 via-orange-500 to-rose-600',
] as const;

export function CausesPage() {
  const { user } = useAuth();
  const [causes, setCauses] = useState<Cause[]>([]);
  const [archived, setArchived] = useState<
    (Cause & { active?: number; created_at?: string })[]
  >([]);
  const [err, setErr] = useState<string | null>(null);

  const refresh = () => {
    void apiJson<Cause[]>('/causes')
      .then(setCauses)
      .catch((e: Error) => setErr(e.message));

    if (user?.role !== 'admin') return;
    void apiJson<
      (Cause & { active: number; created_at: string })[]
    >('/causes/admin')
      .then((rows) => setArchived(rows.filter((r) => r.active === 0)))
      .catch(() => setArchived([]));
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  async function onArchive(causeId: number) {
    if (!window.confirm('Delete this cause? It will be archived (hidden) but can be reverted by an admin.')) return;
    try {
      await apiJson('/causes/' + causeId + '/archive', { method: 'POST', body: '{}' });
      refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to delete');
    }
  }

  async function onRevert(causeId: number) {
    try {
      await apiJson('/causes/' + causeId + '/revert', { method: 'POST', body: '{}' });
      refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to revert');
    }
  }

  if (err) {
    return (
      <div className="px-4 py-16 text-center font-display text-rose-400">
        {err} — is the API running? Use <code className="text-zinc-500">npm run dev</code>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <div className="max-w-2xl reveal" data-reveal>
        <p className="font-display text-xs font-semibold uppercase tracking-[0.28em] text-emerald-400/90">
          Make an impact
        </p>
        <h1 className="font-display mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Causes worth funding
        </h1>
        <p className="mt-4 text-base text-zinc-500">
          Each card is a live goal on the ledger. Open one to read the full story and donate in ETH.
        </p>
      </div>

      <ul className="mt-12 space-y-5" data-reveal>
        {causes.map((c, i) => {
          const pct = Math.min(100, (c.raised_eth / c.goal_eth) * 100);
          const stripe = STRIPES[i % STRIPES.length];
          return (
            <li key={c.id}>
              <Link
                to={`/causes/${c.id}`}
                className="glass-panel group relative block overflow-hidden reveal rounded-2xl transition duration-300 hover:border-emerald-400/25 hover:shadow-[0_0_40px_-12px_rgba(34,197,94,0.35)]"
                data-reveal
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void onArchive(c.id);
                  }}
                  disabled={user?.role !== 'admin'}
                  className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-white/5 disabled:opacity-40"
                  title="Archive this cause"
                >
                  Delete
                </button>

                <div className={`h-1.5 w-full bg-gradient-to-r ${stripe} opacity-90`} aria-hidden />
                <div className="p-6 sm:p-8">
                  <div className="flex flex-wrap items-start justify-between gap-6">
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-xl font-semibold text-white transition group-hover:text-emerald-100 sm:text-2xl">
                        {c.title}
                      </h2>
                      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-zinc-500 sm:line-clamp-3">
                        {c.description}
                      </p>
                    </div>
                    <div className="shrink-0 text-right sm:pl-4">
                      <p className="font-mono text-lg font-medium text-emerald-300 tabular-nums">
                        {c.raised_eth.toFixed(2)} ETH{' '}
                        <span className="text-sm font-normal text-zinc-600">/</span>{' '}
                        {c.goal_eth} ETH
                      </p>
                      <p className="mt-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
                        {pct.toFixed(0)}% funded
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-900/80">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${stripe}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-5 inline-flex items-center text-sm font-semibold text-emerald-400/90">
                    Open cause
                    <span className="ml-1 transition group-hover:translate-x-1" aria-hidden>
                      →
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      {causes.length === 0 && !err && (
        <p className="mt-16 text-center text-zinc-500">No causes yet. Admins can add one.</p>
      )}

      {user?.role === 'admin' && archived.length > 0 && (
        <div className="mt-16">
          <div className="max-w-2xl reveal" data-reveal>
            <p className="font-display text-xs font-semibold uppercase tracking-[0.28em] text-amber-400/90">
              Archived
            </p>
            <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Revert a cause
            </h2>
          </div>
          <ul className="mt-12 space-y-5">
            {archived.map((c, i) => {
              const pct = Math.min(100, (c.raised_eth / c.goal_eth) * 100);
              const stripe = STRIPES[i % STRIPES.length];
              return (
                <li key={c.id}>
                  <div className="glass-panel group relative overflow-hidden rounded-2xl transition duration-300 border border-amber-400/20">
                    <div className={`h-1.5 w-full bg-gradient-to-r ${stripe} opacity-60`} aria-hidden />
                    <div className="p-6 sm:p-8">
                      <div className="flex flex-wrap items-start justify-between gap-6">
                        <div className="min-w-0 flex-1">
                          <h2 className="font-display text-xl font-semibold text-white sm:text-2xl">
                            {c.title}
                          </h2>
                          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-zinc-500 sm:line-clamp-3">
                            {c.description}
                          </p>
                        </div>
                        <div className="shrink-0 text-right sm:pl-4">
                          <p className="font-mono text-lg font-medium text-amber-300 tabular-nums">
                            {c.raised_eth.toFixed(2)} ETH{' '}
                            <span className="text-sm text-zinc-600">/</span> {c.goal_eth} ETH
                          </p>
                          <p className="mt-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
                            {pct.toFixed(0)}% funded
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void onRevert(c.id)}
                        className="mt-5 rounded-full border border-amber-400/25 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/20"
                      >
                        Revert
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
