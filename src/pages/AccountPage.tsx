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
            {eth != null && (
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

      {user.role === 'admin' && (
        <form
          onSubmit={(e) => void disburse(e)}
          className="mt-8 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6"
        >
          <h2 className="text-lg font-semibold text-amber-200">Disburse from vault</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Sends ETH from Super Rich (#0) to a hospital wallet. Logged as disbursement.
          </p>
          <div className="mt-4 space-y-3">
            <select
              value={hospitalId}
              onChange={(e) => setHospitalId(e.target.value)}
              required
              className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white"
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
            disabled={busy || !hospitalId}
            className="mt-4 rounded-xl bg-amber-500 px-6 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Send to hospital'}
          </button>
        </form>
      )}
    </div>
  );
}
