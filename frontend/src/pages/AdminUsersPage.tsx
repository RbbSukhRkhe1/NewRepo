import { useEffect, useState } from 'react';
import { apiJson } from '../lib/api';
import { PrimaryLinkButton, SectionHeader, SurfaceCard } from '../components/ui';

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
    <div className="vtx-page max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SectionHeader title="Users & wallets" />
        <PrimaryLinkButton to="/admin/users/new" className="px-4 py-2">
          Add donor (pool slot + 100 ETH)
        </PrimaryLinkButton>
      </div>
      {err && <p className="mt-4 text-rose-400">{err}</p>}
      <SurfaceCard className="mt-8 overflow-x-auto rounded-xl p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border-chrome-2)] bg-[var(--surface-panel-overlay)] text-xs uppercase tracking-wider text-[var(--text-muted-1)]">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Anvil #</th>
              <th className="px-4 py-3">Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:rgb(255_255_255_/_0.04)]">
            {rows.map((r) => (
              <tr key={r.id} className="text-[var(--text-muted-1)]">
                <td className="px-4 py-3 font-medium text-[var(--text-high-3)]">{r.name}</td>
                <td className="px-4 py-3">{r.email}</td>
                <td className="px-4 py-3">{r.role}</td>
                <td className="px-4 py-3 font-mono">{r.anvilIndex ?? 'N/A'}</td>
                <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted-2)]">
                  {r.addressMasked ?? 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SurfaceCard>
    </div>
  );
}
