import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PrimaryButton, SectionHeader } from '../components/ui';

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && user) {
    return <Navigate to="/account" replace />;
  }

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
      <SectionHeader title="Sign in" body="Access your account to donate and track your impact on the ledger." />
      <form onSubmit={(e) => void onSubmit(e)} className="vtx-auth-form mt-8 space-y-4">
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
            required
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
            required
          />
        </div>
        {err ? <p className="text-sm text-rose-400">{err}</p> : null}
        <PrimaryButton type="submit" disabled={busy} className="w-full">
          {busy ? 'Signing in…' : 'Sign in'}
        </PrimaryButton>
      </form>
      <p className="mt-6 text-center text-sm text-[var(--text-muted-1)]">
        New to Vaultex?{' '}
        <Link to="/register" className="auth-accent-text font-medium hover:underline">
          Create an account
        </Link>
      </p>
      <p className="mt-3 text-center text-sm text-[var(--text-muted-1)]">
        <Link to="/" className="auth-accent-text hover:underline">
          Back home
        </Link>
      </p>
    </div>
  );
}
