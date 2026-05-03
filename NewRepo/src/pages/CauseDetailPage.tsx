import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const PRESETS = ['0.05', '0.1', '0.25', '0.5'] as const;

type Cause = {
  id: number;
  title: string;
  description: string;
  goal_eth: number;
  raised_eth: number;
};

export function CauseDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const revealRef = useRef<HTMLDivElement | null>(null);
  const [cause, setCause] = useState<Cause | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [amount, setAmount] = useState('0.1');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    apiJson<Cause>(`/causes/${id}`)
      .then(setCause)
      .catch((e: Error) => setErr(e.message));
  }, [id]);

  // The global IntersectionObserver in `Layout` only runs on route changes.
  // On this page the main content mounts after the async fetch completes,
  // so we ensure it becomes visible once `cause` is ready.
  useEffect(() => {
    if (!cause) return;
    revealRef.current?.classList.add('reveal--visible');
  }, [cause]);

  const canDonate =
    user && (user.role === 'donor' || user.role === 'admin') && user.anvilIndex != null;

  async function donate(e: React.FormEvent) {
    e.preventDefault();
    if (!cause) return;
    setMsg(null);
    setBusy(true);
    try {
      const r = await apiJson<{ txHash: string }>('/donate', {
        method: 'POST',
        body: JSON.stringify({ causeId: cause.id, amountEth: amount }),
      });
      setMsg(`Sent · ${r.txHash.slice(0, 14)}…`);
      const updated = await apiJson<Cause>(`/causes/${cause.id}`);
      setCause(updated);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  if (err || !cause) {
    return (
      <div className="px-4 py-16 text-center text-zinc-400">
        {err || 'Loading…'}{' '}
        <Link to="/causes" className="font-medium text-emerald-400 hover:text-emerald-300">
          Back to causes
        </Link>
      </div>
    );
  }

  const pct = Math.min(100, (cause.raised_eth / cause.goal_eth) * 100);

  return (
    <div
      ref={revealRef}
      className="mx-auto max-w-5xl px-4 py-12 sm:py-16 reveal"
      data-reveal
    >
      <Link
        to="/causes"
        className="inline-flex items-center text-sm font-medium text-emerald-400/90 hover:text-emerald-300"
      >
        <span className="mr-1.5" aria-hidden>
          ←
        </span>
        All causes
      </Link>

      <div className="mt-6 lg:grid lg:grid-cols-[1fr_340px] lg:items-start lg:gap-12">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            {cause.title}
          </h1>
          <p className="mt-6 whitespace-pre-wrap leading-relaxed text-zinc-400">{cause.description}</p>

          <div className="mt-10 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
            <div className="flex justify-between text-sm text-zinc-500">
              <span className="font-medium uppercase tracking-wider">Progress</span>
              <span className="font-mono text-zinc-300">
                {cause.raised_eth.toFixed(4)} / {cause.goal_eth} ETH
              </span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-zinc-900">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-lime-400 to-green-400"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-4 text-sm text-zinc-500">
              Funds are accounted on-chain and mirrored in the app ledger — open <Link to="/ledger" className="text-emerald-400 hover:underline">Ledger</Link> to
              verify.
            </p>
          </div>
        </div>

        <aside className="mt-10 lg:sticky lg:top-24 lg:mt-0">
          {canDonate ? (
            <form
              onSubmit={(e) => void donate(e)}
              className="glass-panel rounded-2xl p-6 sm:p-7"
            >
              <h2 className="font-display text-lg font-semibold text-white">Donate ETH</h2>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                Sends from your assigned demo wallet to the main vault. Recorded on-chain and in the
                ledger.
              </p>

              <p className="mt-5 text-xs font-medium uppercase tracking-wider text-zinc-500">
                Amount
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(p)}
                    className={`rounded-lg border px-3 py-2 font-mono text-sm transition ${
                      amount === p
                        ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
                        : 'border-white/10 text-zinc-400 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-white outline-none focus:border-emerald-400/40"
                placeholder="Custom amount"
              />
              <button
                type="submit"
                disabled={busy}
                className="font-display mt-5 w-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 py-3 text-sm font-semibold text-[#041214] shadow-[0_0_24px_-8px_rgba(34,197,94,0.5)] disabled:opacity-50"
              >
                {busy ? 'Sending…' : 'Donate now'}
              </button>
              {msg && <p className="mt-4 text-sm text-emerald-300">{msg}</p>}
            </form>
          ) : (
            <div className="glass-panel rounded-2xl border-amber-500/20 bg-amber-500/[0.06] p-6">
              <p className="text-sm leading-relaxed text-amber-100/95">
                {user
                  ? 'This account needs an assigned demo wallet to donate from the browser. Admins with indices 1–3 can donate here, or create a donor for more slots.'
                  : 'Sign in with a donor or admin account to send ETH from the UI.'}{' '}
                <Link to="/login" className="font-semibold text-emerald-300 underline decoration-emerald-500/50 underline-offset-2 hover:text-emerald-200">
                  Sign in
                </Link>
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
