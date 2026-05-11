import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { PrimaryButton, SectionHeader, SurfaceCard } from '../components/ui';

function normalizeOptionalImageUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (t.startsWith('/')) {
    if (t.length > 512 || t.includes('..') || /[\s<>"'`]/.test(t)) {
      throw new Error('Invalid image path');
    }
    if (!/^\/[\w./-]+\.[A-Za-z0-9]+$/.test(t)) {
      throw new Error('Use a path like /samples/cause-example.svg or an https URL');
    }
    return t;
  }
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    throw new Error('Hero image must be a valid URL or a path starting with /');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('Hero image URL must start with http:// or https://');
  }
  return u.href;
}

export function NewCausePage() {
  const nav = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalEth, setGoalEth] = useState('10');
  const [imageUrl, setImageUrl] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      let normalizedImage: string | null = null;
      try {
        normalizedImage = normalizeOptionalImageUrl(imageUrl);
      } catch (ie: unknown) {
        setErr(ie instanceof Error ? ie.message : 'Invalid image URL');
        setBusy(false);
        return;
      }
      const { id } = await apiJson<{ id: number }>('/causes', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          goalEth: parseFloat(goalEth),
          imageUrl: normalizedImage,
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
        <SurfaceCard>
          <label className="text-xs uppercase tracking-wider text-[var(--text-muted-1)]">
            Hero image URL <span className="font-normal normal-case text-[var(--text-muted-2)]">(optional)</span>
          </label>
          <input
            type="url"
            inputMode="url"
            placeholder="https://…"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="vtx-input mt-1 w-full px-4 py-3"
          />
          <p className="mt-2 text-xs text-[var(--text-muted-2)]">
            Shown on the causes list and cause detail. Use an <strong className="font-semibold">https</strong> image
            link or a site path such as <code className="rounded bg-black/20 px-1">/samples/cause-education.svg</code>{' '}
            (files in <code className="rounded bg-black/20 px-1">frontend/public/</code>).
          </p>
        </SurfaceCard>
        {err && <p className="text-sm text-rose-400">{err}</p>}
        <PrimaryButton type="submit" disabled={busy} className="w-full">
          {busy ? 'Creating…' : 'Create cause'}
        </PrimaryButton>
      </form>
    </div>
  );
}
