import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PrivyLoginPanel } from '../components/PrivyLoginPanel';
import { useAuth } from '../context/AuthContext';

const HAS_PRIVY = Boolean(import.meta.env.VITE_PRIVY_APP_ID?.trim());

export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('admin@vaultex.local');
  const [password, setPassword] = useState('demo123');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      nav('/account');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4 pb-10">
      <h1 className="font-space-grotesk text-4xl font-bold tracking-[-0.02em]">Wallet Access</h1>
      {HAS_PRIVY ? <PrivyLoginPanel /> : null}

      {!HAS_PRIVY ? null : (
        <p className="mt-8 text-xs font-semibold uppercase tracking-wider text-zinc-500">Or legacy</p>
      )}

      <p className="mt-2 text-sm text-zinc-500">
        Admin: <span className="text-zinc-400">admin@vaultex.local</span> — Donors:{' '}
        <span className="text-zinc-400">haha@</span>,{' '}
        <span className="text-zinc-400">sukhan@</span>,{' '}
        <span className="text-zinc-400">tasin@</span>
        vaultex.local — password <code className="text-cyan-400">demo123</code>
      </p>
      <form onSubmit={(e) => void onSubmit(e)} className="vtx-card space-y-4 p-6">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-[#14F5B3]/50"
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
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-[#14F5B3]/50"
            autoComplete="current-password"
          />
        </div>
        {err && <p className="text-sm text-rose-400">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="vtx-btn-primary w-full py-3 text-sm disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-500">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="text-cyan-400 hover:underline">
          Register
        </Link>
      </p>
      <p className="mt-3 text-center text-sm text-zinc-500">
        <Link to="/" className="text-cyan-400 hover:underline">
          Back home
        </Link>
      </p>
    </div>
  );
}
