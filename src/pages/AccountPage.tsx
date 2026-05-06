import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiJson } from '../lib/api';
import { loadMeHistory, type MeHistoryResponse, type UserHistoryEntry } from '../lib/userHistory';

type UserRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  anvilIndex: number | null;
};

const POLL_MS = 6000;

function shortHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

function WalletMeter({
  summary,
  role,
}: {
  summary: NonNullable<MeHistoryResponse['summary']>;
  role: string;
}) {
  const pct = Math.round(summary.fillRatio * 1000) / 10;
  const cur = parseFloat(summary.currentEth);
  const ref = parseFloat(summary.referenceMaxEth);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/35 bg-gradient-to-b from-amber-950/40 via-[#0c0a06] to-black p-5 shadow-[inset_0_1px_0_rgba(251,191,36,0.12)]">
      <div
        className="pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full bg-amber-400/10 blur-2xl"
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/80">Wallet</p>
          <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-amber-50 sm:text-3xl">
            {cur.toFixed(4)} <span className="text-base font-semibold text-amber-400/90">ETH</span>
          </p>
        </div>
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
          Live
        </div>
      </div>

      <div className="relative mt-5">
        <div className="flex justify-between text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          <span>Remaining</span>
          <span>
            Pool ~{ref.toFixed(2)} ETH
          </span>
        </div>
        <div className="mt-2 h-4 w-full overflow-hidden rounded-full border border-black/60 bg-zinc-950 shadow-inner ring-1 ring-amber-900/40">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-lime-400 to-cyan-400 shadow-[0_0_14px_rgba(251,191,36,0.45)] transition-[width] duration-700 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Wallet balance level"
          />
        </div>
        <p className="mt-2 text-center text-[11px] tabular-nums text-zinc-500">
          {role === 'beneficiary' ? (
            <>
              Received (ledger): <span className="text-zinc-400">{parseFloat(summary.totalReceivedEth).toFixed(4)}</span> ETH
            </>
          ) : (
            <>
              Sent to vault (ledger): <span className="text-zinc-400">{parseFloat(summary.totalSentEth).toFixed(4)}</span> ETH
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function HistoryRow({ e }: { e: UserHistoryEntry }) {
  const incoming = e.flow === 'received';
  return (
    <li className="grid gap-1 border-b border-white/[0.06] py-3 text-sm last:border-0 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-4">
      <div
        className={`w-fit rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
          incoming            ? 'bg-emerald-500/15 text-emerald-300'
            : 'bg-rose-500/12 text-rose-200/90'
        }`}
      >
        {incoming ? 'Received' : 'Sent'}
      </div>
      <div className="min-w-0">
        <p className="truncate text-zinc-200">
          {e.kind === 'donation_in'
            ? incoming
              ? `${e.fromDisplayName} → you`
              : `You → ${e.toDisplayName}`
            : incoming
              ? `${e.fromDisplayName} → you`
              : `You → ${e.toDisplayName}`}
        </p>
        {e.causeName && <p className="truncate text-xs text-zinc-500">{e.causeName}</p>}
        <p className="mt-0.5 font-mono text-[10px] text-zinc-600">{shortHash(e.txHash)}</p>
      </div>
      <div className="font-mono text-right text-base font-semibold tabular-nums text-amber-100 sm:text-lg">
        {incoming ? '+' : '−'}
        {parseFloat(e.amountEth).toFixed(4)} ETH
      </div>
    </li>
  );
}

export function AccountPage() {
  const { user, loading } = useAuth();
  const [eth, setEth] = useState<string | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<UserRow[]>([]);
  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [disburseAmount, setDisburseAmount] = useState('1');
  const [causeNote, setCauseNote] = useState('Baby Cancer');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<MeHistoryResponse | null>(null);
  const [historyErr, setHistoryErr] = useState<string | null>(null);

  const refreshHistory = useCallback(() => {
    if (!user || user.anvilIndex == null) {
      setHistory(null);
      return;
    }
    loadMeHistory()
      .then((h) => {
        setHistory(h);
        setHistoryErr(null);
        if (h.summary?.currentEth != null) setEth(h.summary.currentEth);
      })
      .catch((e: unknown) => {
        setHistoryErr(e instanceof Error ? e.message : 'Failed to load history');
      });
  }, [user]);

  useEffect(() => {
    if (!user || user.anvilIndex == null) {
      setEth(null);
      return;
    }
    apiJson<{ eth: string }>(`/balance/${user.anvilIndex}`)
      .then((b) => setEth(b.eth))
      .catch(() => setEth(null));
  }, [user]);

  useEffect(() => {
    refreshHistory();
    if (!user?.anvilIndex) return;
    const t = setInterval(refreshHistory, POLL_MS);
    return () => clearInterval(t);
  }, [refreshHistory, user?.anvilIndex]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    apiJson<UserRow[]>('/users')
      .then((rows) => setBeneficiaries(rows.filter((r) => r.role === 'beneficiary')))
      .catch(() => setBeneficiaries([]));
  }, [user?.role]);

  async function disburse(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const r = await apiJson<{ txHash: string }>('/disburse', {
        method: 'POST',
        body: JSON.stringify({
          beneficiaryUserId: parseInt(beneficiaryId, 10),
          amountEth: disburseAmount,
          causeName: causeNote,
        }),
      });
      setMsg(`Disbursed · ${r.txHash.slice(0, 16)}…`);
      refreshHistory();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="p-12 text-center text-zinc-500">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-zinc-400">Sign in to see your wallet and role.</p>
        <Link to="/login" className="mt-4 inline-block text-cyan-400 hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold text-white">Account</h1>
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <p className="text-sm text-zinc-500">Signed in as</p>
        <p className="text-xl font-semibold text-white">{user.name}</p>
        <p className="mt-1 text-sm text-zinc-400">{user.email}</p>
        <p className="mt-4 text-xs uppercase tracking-wider text-zinc-500">Role</p>
        <p className="text-cyan-400">{user.role}</p>
        {user.anvilIndex != null && (
          <>
            <p className="mt-4 text-xs uppercase tracking-wider text-zinc-500">Anvil account index</p>
            <p className="font-mono text-white">{user.anvilIndex}</p>
            <p className="mt-2 text-xs uppercase tracking-wider text-zinc-500">Address (masked)</p>
            <p className="font-mono text-sm text-zinc-400">{user.addressMasked}</p>
            {eth != null && history?.summary == null && (
              <>
                <p className="mt-4 text-xs uppercase tracking-wider text-zinc-500">Balance (Anvil)</p>
                <p className="font-mono text-lg text-emerald-400">{parseFloat(eth).toFixed(4)} ETH</p>
              </>
            )}
          </>
        )}
        {user.role === 'donor' && (
          <Link
            to="/causes"
            className="mt-6 inline-block rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-black"
          >
            Donate to a cause
          </Link>
        )}
      </div>

      {user.anvilIndex != null && (
        <>
          {history?.summary && (
            <div className="mt-8">
              <WalletMeter summary={history.summary} role={user.role} />
            </div>
          )}

          <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6" aria-labelledby="acct-history">
            <h2 id="acct-history" className="text-lg font-semibold text-white">
              Your activity
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Transfers where your wallet is the sender or recipient (from the app ledger).
            </p>
            {historyErr && <p className="mt-3 text-sm text-rose-400">{historyErr}</p>}
            {!historyErr && history && history.entries.length === 0 && (
              <p className="mt-6 text-center text-sm text-zinc-500">No recorded transfers yet.</p>
            )}
            {history && history.entries.length > 0 && (
              <ul className="mt-4 divide-y divide-white/[0.04]">
                {history.entries.map((e) => (
                  <HistoryRow key={e.id} e={e} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {user.role === 'admin' && (
        <form
          onSubmit={(e) => void disburse(e)}
          className="mt-8 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6"
        >
          <h2 className="text-lg font-semibold text-amber-200">Disburse from vault</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Sends ETH from Vaultex vault (#0) to a beneficiary wallet. Logged as disbursement.
          </p>
          <div className="mt-4 space-y-3">
            <select
              value={beneficiaryId}
              onChange={(e) => setBeneficiaryId(e.target.value)}
              required
              className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white"
            >
              <option value="">Select beneficiary</option>
              {beneficiaries.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={disburseAmount}
              onChange={(e) => setDisburseAmount(e.target.value)}
              placeholder="ETH amount"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 font-mono text-white"
            />
            <input
              type="text"
              value={causeNote}
              onChange={(e) => setCauseNote(e.target.value)}
              placeholder="Cause / memo"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white"
            />
          </div>
          {msg && <p className="mt-3 text-sm text-amber-200">{msg}</p>}
          <button
            type="submit"
            disabled={busy || !beneficiaryId}
            className="mt-4 rounded-xl bg-amber-500 px-6 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Send to beneficiary'}
          </button>
        </form>
      )}
    </div>
  );
}
