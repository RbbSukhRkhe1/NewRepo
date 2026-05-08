import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PrimaryButton, SectionHeader } from '../components/ui';

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
    <div className="vtx-page max-w-md py-16">
      <SectionHeader title="Sign in" />
      <p className="mt-2 text-sm text-[var(--text-muted-1)]">
        Admin:{' '}
        <span className="text-[var(--text-muted-2)]">admin@vaultex.local</span> — Donors:{' '}
        <span className="text-[var(--text-muted-2)]">haha@</span>,{' '}
        <span className="text-[var(--text-muted-2)]">sukhan@</span>,{' '}
        <span className="text-[var(--text-muted-2)]">tasin@</span>
        vaultex.local — password <code className="auth-accent-text">demo123</code>
      </p>
      <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-[var(--text-muted-1)]">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="vtx-input mt-1 w-full px-4 py-3 outline-none"
            autoComplete="username"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-[var(--text-muted-1)]">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="vtx-input mt-1 w-full px-4 py-3 outline-none"
            autoComplete="current-password"
          />
        </div>
        {err && <p className="text-sm text-rose-400">{err}</p>}
        <PrimaryButton type="submit" disabled={busy} className="w-full">
          {busy ? 'Signing in…' : 'Sign in'}
        </PrimaryButton>
      </form>
      <p className="mt-6 text-center text-sm text-[var(--text-muted-1)]">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="auth-accent-text">
          Register
        </Link>
      </p>
      <p className="mt-3 text-center text-sm text-[var(--text-muted-1)]">
        <Link to="/" className="auth-accent-text">
          Back home
        </Link>
      </p>
    </div>
  );
}
