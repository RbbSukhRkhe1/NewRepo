import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { PrimaryButton, SectionHeader } from '../components/ui';

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
    <div className="vtx-page max-w-md py-16">
      <SectionHeader title="Create account" />
      <p className="mt-2 text-sm text-[var(--text-muted-1)]">
        Register as a donor to support causes, or as a beneficiary to receive funds.
        Your account is assigned an Anvil wallet funded with 100 ETH.
      </p>
      <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-[var(--text-muted-1)]">
            Display name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="vtx-input mt-1 w-full px-4 py-3 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-[var(--text-muted-1)]">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
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
            required
            className="vtx-input mt-1 w-full px-4 py-3 outline-none"
            autoComplete="new-password"
          />
        </div>
        <div>
          <p className="block text-xs font-medium uppercase tracking-wider text-[var(--text-muted-1)]">Role</p>
          <div className="mt-2 flex gap-4">
            {(['donor', 'beneficiary'] as const).map((r) => (
              <label
                key={r}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors ${
                  role === r
                    ? 'border-[var(--border-accent-soft)] bg-[color:rgb(34_197_94_/_0.14)] text-[var(--text-high-2)]'
                    : 'border-[var(--border-chrome-2)] text-[var(--text-muted-1)] hover:border-[var(--border-chrome-4)]'
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
        <PrimaryButton type="submit" disabled={busy} className="w-full">
          {busy ? 'Creating account…' : 'Create account'}
        </PrimaryButton>
      </form>
      <p className="mt-6 text-center text-sm text-[var(--text-muted-1)]">
        Already have an account?{' '}
        <Link to="/login" className="auth-accent-text">
          Sign in
        </Link>
      </p>
    </div>
  );
}
