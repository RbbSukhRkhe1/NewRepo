import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { PrimaryButton, SectionHeader, SurfaceCard } from '../components/ui';

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
      <div className="px-4 py-12 text-center text-zinc-400">
        {err || 'Loading…'}{' '}
        <Link to="/causes" className="text-cyan-400">
          Back
        </Link>
      </div>
    );
  }

  const pct = Math.min(100, (cause.raised_eth / cause.goal_eth) * 100);

  return (
    <div className="vtx-page max-w-2xl">
      <Link to="/causes" className="text-sm text-[var(--accent-bright-2)]">
        ← All causes
      </Link>
      <div className="mt-4">
        <SectionHeader title={cause.title} />
      </div>
      <p className="mt-4 leading-relaxed text-[var(--text-muted-1)]">{cause.description}</p>
      <div className="mt-8">
        <div className="flex justify-between text-sm text-[var(--text-muted-1)]">
          <span>Raised</span>
          <span>
            {cause.raised_eth.toFixed(4)} / {cause.goal_eth} ETH
          </span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-[var(--bg-depth-1)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--accent-deep-1)] to-[var(--accent-bright-2)]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {canDonate ? (
        <SurfaceCard className="mt-10">
          <form onSubmit={(e) => void donate(e)}>
          <h2 className="text-lg font-semibold text-white">Donate ETH</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Sends from your assigned Anvil wallet to the main vault. Recorded on-chain and in the
            ledger.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="vtx-input w-40 px-4 py-2 font-mono"
              placeholder="Amount"
            />
            <PrimaryButton type="submit" disabled={busy} className="px-6 py-2">
              {busy ? 'Sending…' : 'Donate'}
            </PrimaryButton>
          </div>
          {msg && <p className="mt-3 text-sm text-emerald-400">{msg}</p>}
          </form>
        </SurfaceCard>
      ) : (
        <p className="mt-10 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
          {user
            ? 'Only accounts with an Anvil wallet (indices 1–6 here) can send from the UI. Admins #1–3 can donate; create a donor for more test wallets.'
            : 'Sign in to donate from your assigned Anvil wallet.'}{' '}
          <Link to="/login" className="text-cyan-300 underline">
            Sign in
          </Link>
        </p>
      )}
    </div>
  );
}
