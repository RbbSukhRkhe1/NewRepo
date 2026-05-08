import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { PrimaryButton, SectionHeader, SurfaceCard } from '../components/ui';

export function NewCausePage() {
  const nav = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalEth, setGoalEth] = useState('10');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const { id } = await apiJson<{ id: number }>('/causes', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          goalEth: parseFloat(goalEth),
        }),
      });
      nav(`/causes/${id}`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vtx-page max-w-lg">
      <SectionHeader title="New cause" body="Like GoFundMe - goal and raised update from donations." />
      <form onSubmit={(e) => void submit(e)} className="mt-8 space-y-4">
        <SurfaceCard>
          <label className="text-xs uppercase tracking-wider text-[var(--text-muted-1)]">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="vtx-input mt-1 w-full px-4 py-3"
          />
        </SurfaceCard>
        <SurfaceCard>
          <label className="text-xs uppercase tracking-wider text-[var(--text-muted-1)]">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            className="vtx-input mt-1 w-full px-4 py-3"
          />
        </SurfaceCard>
        <SurfaceCard>
          <label className="text-xs uppercase tracking-wider text-[var(--text-muted-1)]">Goal (ETH)</label>
          <input
            type="number"
            min={0.01}
            step="any"
            value={goalEth}
            onChange={(e) => setGoalEth(e.target.value)}
            required
            className="vtx-input mt-1 w-full px-4 py-3 font-mono"
          />
        </SurfaceCard>
        {err && <p className="text-sm text-rose-400">{err}</p>}
        <PrimaryButton type="submit" disabled={busy} className="w-full">
          {busy ? 'Creating…' : 'Create cause'}
        </PrimaryButton>
      </form>
    </div>
  );
}
