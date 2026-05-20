import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { useIsLightMode } from '../lib/useIsLightMode';
import { resolveCauseHeroUrl } from '../lib/causeHeroImages';

type CauseRow = {
  id: number;
  title: string;
  description: string;
  goal_eth: number;
  raised_eth: number;
  image_url: string | null;
};

const SAMPLE_HERO_PLACEHOLDER = '/samples/placeholder.svg';

export function CompletedCausesPage() {
  const isLightMode = useIsLightMode();
  const [rows, setRows] = useState<CauseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiJson<CauseRow[]>('/causes?status=completed')
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="vtx-page max-w-6xl">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted-1)]">Transparency</p>
          <h1 className="mt-2 text-3xl font-bold text-[var(--text-high-3)]">Completed Campaigns</h1>
          <p className="mt-2 text-sm text-[var(--text-muted-1)]">
            Campaigns that reached 100% of their funding goal are listed here automatically.
          </p>
        </div>
        <Link
          to="/causes"
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            isLightMode
              ? 'border border-[rgba(164,184,207,0.45)] bg-white/80 text-[var(--text-high-3)] hover:bg-white'
              : 'border border-white/20 bg-black/25 text-[var(--text-high-3)] hover:bg-black/35'
          }`}
        >
          View Active Causes
        </Link>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {loading ? (
          <p className="text-sm text-[var(--text-muted-1)]">Loading completed campaigns...</p>
        ) : rows.length === 0 ? (
          <div
            className={`rounded-2xl border p-6 text-sm ${
              isLightMode
                ? 'border-[rgba(164,184,207,0.45)] bg-white/80 text-[var(--text-muted-1)]'
                : 'border-white/20 bg-black/25 text-[var(--text-muted-1)]'
            }`}
          >
            No completed campaigns yet.
          </div>
        ) : (
          rows.map((cause) => {
            const pct = cause.goal_eth > 0 ? Math.min(100, (cause.raised_eth / cause.goal_eth) * 100) : 0;
            const hero = resolveCauseHeroUrl(cause.title, cause.image_url) ?? SAMPLE_HERO_PLACEHOLDER;
            return (
              <article
                key={cause.id}
                className={`overflow-hidden rounded-2xl border ${
                  isLightMode
                    ? 'border-emerald-500/35 bg-[linear-gradient(170deg,rgba(252,255,253,0.98),rgba(236,252,246,0.88))] shadow-[0_14px_28px_rgba(49,129,104,0.12)]'
                    : 'border-emerald-400/35 bg-[linear-gradient(160deg,rgba(6,20,18,0.78),rgba(4,12,20,0.75))]'
                }`}
              >
                <div className="relative h-44 w-full overflow-hidden">
                  <img src={hero} alt="" className="h-full w-full object-cover" />
                  <span className="absolute left-3 top-3 rounded-full border border-emerald-300/60 bg-emerald-500/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#052016]">
                    Completed
                  </span>
                </div>
                <div className="p-4">
                  <h2 className="text-xl font-bold text-[var(--text-high-3)]">{cause.title}</h2>
                  <p className="mt-1.5 line-clamp-2 text-sm text-[var(--text-muted-1)]">{cause.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-emerald-400">Goal Reached</p>
                    <p className="text-xs text-[var(--text-muted-2)]">
                      {cause.raised_eth.toFixed(2)} / {cause.goal_eth.toFixed(2)} ETH
                    </p>
                  </div>
                  <div className={`mt-2 h-2 rounded-full ${isLightMode ? 'bg-slate-200' : 'bg-black/40'}`}>
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-4">
                    <Link
                      to={`/causes/${cause.id}`}
                      className="inline-flex min-h-10 items-center rounded-full border border-emerald-300/70 bg-[linear-gradient(180deg,#3dffc4,#23d78f)] px-4 py-2 text-xs font-semibold text-[#032316] shadow-[0_0_22px_rgba(51,255,178,0.28)]"
                    >
                      VIEW DETAILS
                    </Link>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
