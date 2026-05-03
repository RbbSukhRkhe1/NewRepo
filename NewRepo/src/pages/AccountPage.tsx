import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiJson } from '../lib/api';

type UserRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  anvilIndex: number | null;
};

export function AccountPage() {
  const { user, loading } = useAuth();
  const [eth, setEth] = useState<string | null>(null);
  const [hospitals, setHospitals] = useState<UserRow[]>([]);
  const [hospitalId, setHospitalId] = useState('');
  const [disburseAmount, setDisburseAmount] = useState('1');
  const [causeNote, setCauseNote] = useState('Baby Cancer');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    if (user?.role !== 'admin') return;
    apiJson<UserRow[]>('/users')
      .then((rows) => setHospitals(rows.filter((r) => r.role === 'hospital')))
      .catch(() => setHospitals([]));
  }, [user?.role]);

  async function disburse(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const r = await apiJson<{ txHash: string }>('/disburse', {
        method: 'POST',
        body: JSON.stringify({
          hospitalUserId: parseInt(hospitalId, 10),
          amountEth: disburseAmount,
          causeName: causeNote,
        }),
      });
      setMsg(`Disbursed · ${r.txHash.slice(0, 16)}…`);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center font-display text-zinc-500">Loading…</div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-zinc-400">Sign in to see your wallet and role.</p>
        <Link to="/login" className="mt-4 inline-block font-semibold text-teal-400 hover:text-teal-300">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">Your account</h1>
      <div className="glass-panel mt-8 rounded-2xl p-6 sm:p-8 reveal" data-reveal>
        <p className="text-sm text-zinc-500">Signed in as</p>
        <p className="mt-1 text-xl font-semibold text-white">{user.name}</p>
        <p className="mt-1 text-sm text-zinc-400">{user.email}</p>
        <p className="mt-5 text-xs font-medium uppercase tracking-wider text-zinc-500">Role</p>
        <p className="mt-1 font-medium text-teal-400">{user.role}</p>
        {user.anvilIndex != null && (
          <>
            <p className="mt-5 text-xs font-medium uppercase tracking-wider text-zinc-500">Wallet slot</p>
            <p className="font-mono text-white">{user.anvilIndex}</p>
            <p className="mt-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Address (masked)</p>
            <p className="font-mono text-sm text-zinc-400">{user.addressMasked}</p>
            {eth != null && (
              <>
                <p className="mt-5 text-xs font-medium uppercase tracking-wider text-zinc-500">Balance</p>
                <p className="font-mono text-lg text-teal-400 tabular-nums">{parseFloat(eth).toFixed(4)} ETH</p>
              </>
            )}
          </>
        )}
        {user.role === 'donor' && (
          <Link
            to="/causes"
            className="font-display mt-6 inline-flex rounded-full bg-gradient-to-r from-teal-400 to-teal-500 px-5 py-2.5 text-sm font-semibold text-[#041214]"
          >
            Donate to a cause
          </Link>
        )}
      </div>

      {user.role === 'admin' && (
        <form
          onSubmit={(e) => void disburse(e)}
          className="mt-8 rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/[0.08] to-transparent p-6 sm:p-8"
        >
          <h2 className="font-display text-lg font-semibold text-amber-100">Disburse from vault</h2>
          <p className="mt-2 text-xs text-zinc-500">
            Send ETH from the main vault to a hospital wallet. Logged as a disbursement on the ledger.
          </p>
          <div className="mt-5 space-y-3">
            <select
              value={hospitalId}
              onChange={(e) => setHospitalId(e.target.value)}
              required
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-amber-400/30"
            >
              <option value="">Select hospital</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={disburseAmount}
              onChange={(e) => setDisburseAmount(e.target.value)}
              placeholder="ETH amount"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-white outline-none focus:border-amber-400/30"
            />
            <input
              type="text"
              value={causeNote}
              onChange={(e) => setCauseNote(e.target.value)}
              placeholder="Cause / memo"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-amber-400/30"
            />
          </div>
          {msg && <p className="mt-4 text-sm text-amber-200">{msg}</p>}
          <button
            type="submit"
            disabled={busy || !hospitalId}
            className="font-display mt-5 rounded-full bg-amber-400 px-6 py-2.5 text-sm font-semibold text-[#1a1003] disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Send to hospital'}
          </button>
        </form>
      )}
    </div>
  );
}
