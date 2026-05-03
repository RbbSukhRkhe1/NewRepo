import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('haha@letsdonate.local');
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
    <div className="mx-auto max-w-md px-4 py-16 sm:py-20">
        <div className="glass-panel rounded-3xl p-8 sm:p-10 reveal" data-reveal>
        <h1 className="font-display text-2xl font-bold text-white">Welcome back</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Sign in to manage your wallet and donations.
        </p>
        <p className="mt-4 rounded-xl bg-white/[0.03] px-3 py-2 text-xs leading-relaxed text-zinc-500">
          Demo: <span className="text-zinc-400">haha@</span>, <span className="text-zinc-400">sukhan@</span>,{' '}
          <span className="text-zinc-400">tasin@</span>
          letsdonate.local — password <code className="text-teal-400">demo123</code>
        </p>
        <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-teal-400/40"
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
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-teal-400/40"
              autoComplete="current-password"
            />
          </div>
          {err && <p className="text-sm text-rose-400">{err}</p>}
          <button
            type="submit"
            disabled={busy}
            className="font-display w-full rounded-full bg-gradient-to-r from-teal-400 to-teal-500 py-3 text-sm font-semibold text-[#041214] shadow-[0_0_24px_-8px_rgba(45,212,191,0.45)] disabled:opacity-50"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
      <p className="mt-8 text-center text-sm text-zinc-600">
        <Link to="/" className="font-medium text-teal-400/90 hover:text-teal-300">
          ← Back home
        </Link>
      </p>
    </div>
  );
}
