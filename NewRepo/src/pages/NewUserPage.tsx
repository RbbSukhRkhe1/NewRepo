import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiJson } from '../lib/api';

export function NewUserPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('demo123');
  const [result, setResult] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setResult(null);
    setBusy(true);
    try {
      const r = await apiJson<{
        id: number;
        address: string;
        fundTxHash: string;
        anvilIndex: number;
      }>('/users', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      setResult(
        `User #${r.id} · Anvil index ${r.anvilIndex} · Fund tx ${r.fundTxHash.slice(0, 18)}…`
      );
      setName('');
      setEmail('');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Link to="/admin/users" className="text-sm font-medium text-teal-400 hover:text-teal-300 hover:underline">
        ← Users
      </Link>
      <h1 className="font-display mt-4 text-2xl font-bold text-white">Create donor</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Assigns the next free slot (Anvil indices 4–6), creates login, and sends <strong>100 ETH</strong>{' '}
        from the vault wallet (#0).
      </p>
      <form onSubmit={(e) => void submit(e)} className="mt-8 space-y-4">
        <div>
          <label className="text-xs uppercase text-zinc-500">Display name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white"
          />
        </div>
        <div>
          <label className="text-xs uppercase text-zinc-500">Email (login)</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white"
          />
        </div>
        <div>
          <label className="text-xs uppercase text-zinc-500">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white"
          />
        </div>
        {err && <p className="text-sm text-rose-400">{err}</p>}
        {result && <p className="text-sm text-emerald-400">{result}</p>}
        <button
          type="submit"
          disabled={busy}
          className="font-display w-full rounded-full bg-gradient-to-r from-teal-400 to-teal-500 py-3 font-semibold text-[#041214] disabled:opacity-50"
        >
          {busy ? 'Creating…' : 'Create and fund'}
        </button>
      </form>
    </div>
  );
}
