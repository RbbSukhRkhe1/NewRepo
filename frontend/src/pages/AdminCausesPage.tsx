import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { PrimaryLinkButton, PrimaryButton, SecondaryButton, SectionHeader, SurfaceCard } from '../components/ui';
import { isTestCause } from '../lib/causeFilters';

type CauseRow = {
  id: number;
  title: string;
  description: string;
  goal_eth: number;
  disbursed_eth: number;
  image_url: string | null;
  active: number;
  created_at: string;
};

export function AdminCausesPage() {
  const [rows, setRows] = useState<CauseRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    apiJson<CauseRow[]>('/admin/causes')
      .then(setRows)
      .catch((e: Error) => setErr(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function deactivate(id: number, title: string) {
    if (!window.confirm(`Deactivate cause "${title}"? It will no longer appear publicly.`)) return;
    setBusyId(id);
    setMsg(null);
    try {
      await apiJson(`/causes/${id}`, { method: 'DELETE' });
      setMsg(`Deactivated "${title}"`);
      load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to deactivate');
    } finally {
      setBusyId(null);
    }
  }

  async function reactivate(id: number, title: string) {
    setBusyId(id);
    setMsg(null);
    try {
      await apiJson(`/causes/${id}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ active: true }),
      });
      setMsg(`Reactivated "${title}"`);
      load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to reactivate');
    } finally {
      setBusyId(null);
    }
  }

  const visibleRows = rows.filter((r) => !isTestCause(r));

  return (
    <div className="vtx-page max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SectionHeader title="Manage causes" body="Create, edit, deactivate, or reactivate fundraising causes." />
        <PrimaryLinkButton to="/admin/causes/new" className="px-4 py-2">
          New cause
        </PrimaryLinkButton>
      </div>
      {err && <p className="mt-4 text-rose-400">{err}</p>}
      {msg && <p className="mt-4 text-sm text-emerald-400">{msg}</p>}
      <SurfaceCard className="mt-8 overflow-x-auto rounded-xl p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border-chrome-2)] bg-[var(--surface-panel-overlay)] text-xs uppercase tracking-wider text-[var(--text-muted-1)]">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Disbursed / Goal</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:rgb(255_255_255_/_0.04)]">
            {visibleRows.map((r) => (
              <tr key={r.id} className="text-[var(--text-muted-1)]">
                <td className="px-4 py-3">
                  <p className="font-medium text-[var(--text-high-3)]">{r.title}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-[var(--text-muted-2)]">{r.description}</p>
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {r.disbursed_eth.toFixed(2)} / {r.goal_eth.toFixed(2)} ETH
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      r.active
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-zinc-500/15 text-zinc-400'
                    }`}
                  >
                    {r.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {r.active ? (
                      <Link
                        to={`/causes/${r.id}`}
                        className="text-xs font-medium text-cyan-400 hover:underline"
                      >
                        View
                      </Link>
                    ) : null}
                    <Link
                      to={`/admin/causes/${r.id}/edit`}
                      className="text-xs font-medium text-[var(--text-high-2)] hover:underline"
                    >
                      Edit
                    </Link>
                    {r.active ? (
                      <SecondaryButton
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => void deactivate(r.id, r.title)}
                        className="px-2 py-1 text-xs"
                      >
                        {busyId === r.id ? '…' : 'Deactivate'}
                      </SecondaryButton>
                    ) : (
                      <PrimaryButton
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => void reactivate(r.id, r.title)}
                        className="px-2 py-1 text-xs"
                      >
                        {busyId === r.id ? '…' : 'Reactivate'}
                      </PrimaryButton>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {visibleRows.length === 0 && !err && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[var(--text-muted-2)]">
                  No causes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </SurfaceCard>
    </div>
  );
}
