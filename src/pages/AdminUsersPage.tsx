import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiJson } from '../lib/api';

type Row = {
  id: number;
  name: string;
  email: string;
  role: string;
  anvilIndex: number | null;
  addressMasked: string | null;
};

export function AdminUsersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiJson<Row[]>('/users')
      .then(setRows)
      .catch((e: Error) => setErr(e.message));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Users &amp; wallets</h1>
        <Link
          to="/admin/users/new"
          className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-black"
        >
          Add donor (pool slot + 100 ETH)
        </Link>
      </div>
      {err && <p className="mt-4 text-rose-400">{err}</p>}
      <div className="mt-8 overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Anvil #</th>
              <th className="px-4 py-3">Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((r) => (
              <tr key={r.id} className="text-zinc-300">
                <td className="px-4 py-3 font-medium text-white">{r.name}</td>
                <td className="px-4 py-3">{r.email}</td>
                <td className="px-4 py-3">{r.role}</td>
                <td className="px-4 py-3 font-mono">{r.anvilIndex ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                  {r.addressMasked ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
