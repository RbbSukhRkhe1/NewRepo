import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiJson } from '../lib/api';

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
    <div className="mx-auto max-w-lg space-y-4 pb-10">
      <h1 className="font-space-grotesk text-4xl font-bold tracking-[-0.02em]">New cause</h1>
      <p className="mt-2 text-sm text-zinc-500">Like GoFundMe — goal and raised update from donations.</p>
      <form onSubmit={(e) => void submit(e)} className="vtx-card mt-8 space-y-4 p-6">
        <div>
          <label className="text-xs uppercase tracking-wider text-zinc-500">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-zinc-500">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-zinc-500">Goal (ETH)</label>
          <input
            type="number"
            min={0.01}
            step="any"
            value={goalEth}
            onChange={(e) => setGoalEth(e.target.value)}
            required
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-space-mono text-white"
          />
        </div>
        {err && <p className="text-sm text-rose-400">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="vtx-btn-primary w-full py-3 disabled:opacity-50"
        >
          {busy ? 'Creating…' : 'Create cause'}
        </button>
      </form>
    </div>
  );
}
