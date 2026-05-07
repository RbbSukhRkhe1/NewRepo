import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiJson } from '../lib/api';

export function RegisterPage() {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'donor' | 'beneficiary'>('donor');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await apiJson('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, role }),
      });
      nav('/login');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold text-white">Create account</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Register as a donor to support causes, or as a beneficiary to receive funds.
        Your account is assigned an Anvil wallet funded with 100 ETH.
      </p>
      <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500">
            Display name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-cyan-500/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-cyan-500/50"
            autoComplete="username"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white outline-none focus:border-cyan-500/50"
            autoComplete="new-password"
          />
        </div>
        <div>
          <p className="block text-xs font-medium uppercase tracking-wider text-zinc-500">Role</p>
          <div className="mt-2 flex gap-4">
            {(['donor', 'beneficiary'] as const).map((r) => (
              <label
                key={r}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors ${
                  role === r
                    ? 'border-cyan-400/60 bg-cyan-400/10 text-cyan-300'
                    : 'border-white/10 text-zinc-400 hover:border-white/20'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={r}
                  checked={role === r}
                  onChange={() => setRole(r)}
                  className="sr-only"
                />
                <span className="capitalize">{r}</span>
              </label>
            ))}
          </div>
        </div>
        {err && <p className="text-sm text-rose-400">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-cyan-400 py-3 text-sm font-semibold text-black disabled:opacity-50"
        >
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-500">
        Already have an account?{' '}
        <Link to="/login" className="text-cyan-400 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
