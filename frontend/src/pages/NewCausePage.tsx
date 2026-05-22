import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiJson } from '../lib/api';
import { previewCauseImageUrl } from '../lib/causeImageUrl';
import { PrimaryButton, SectionHeader, SurfaceCard } from '../components/ui';

type BeneficiaryOption = {
  id: number;
  name: string;
  role: string;
};

type FundCoverRow = { label: string; weight: string };

const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/gif';
const DEFAULT_FUND_ROWS: FundCoverRow[] = [
  { label: '', weight: '38' },
  { label: '', weight: '27' },
  { label: '', weight: '21' },
  { label: '', weight: '14' },
];

function defaultMilestones() {
  return ['', '', ''];
}

function defaultVerification() {
  return ['', '', ''];
}

function fundWeightSum(rows: FundCoverRow[]): number {
  return rows.reduce((s, r) => s + (Number.parseFloat(r.weight) || 0), 0);
}

export function NewCausePage() {
  const nav = useNavigate();
  const { id: editIdParam } = useParams();
  const editId = editIdParam ? Number.parseInt(editIdParam, 10) : null;
  const isEdit = editId != null && Number.isFinite(editId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [aboutBody, setAboutBody] = useState('');
  const [impactStoryTitle, setImpactStoryTitle] = useState('');
  const [impactStoryBody, setImpactStoryBody] = useState('');
  const [goalEth, setGoalEth] = useState('10');
  const [beneficiaryUserId, setBeneficiaryUserId] = useState('');
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryOption[]>([]);
  const [categoryTag, setCategoryTag] = useState('');
  const [locationTag, setLocationTag] = useState('');
  const [campaignEndDate, setCampaignEndDate] = useState('');
  const [fundRows, setFundRows] = useState<FundCoverRow[]>(DEFAULT_FUND_ROWS);
  const [milestones, setMilestones] = useState<string[]>(defaultMilestones);
  const [verificationPoints, setVerificationPoints] = useState<string[]>(defaultVerification);
  const [imageUrl, setImageUrl] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  const fundWeightTotal = useMemo(() => fundWeightSum(fundRows), [fundRows]);

  const previewSrc = useMemo(
    () => (imageDataUrl ? imageDataUrl : previewCauseImageUrl(imageUrl)),
    [imageDataUrl, imageUrl],
  );

  useEffect(() => {
    apiJson<BeneficiaryOption[]>('/users')
      .then((rows) => setBeneficiaries(rows.filter((r) => r.role === 'beneficiary')))
      .catch(() => setBeneficiaries([]));
  }, []);

  useEffect(() => {
    if (!isEdit || editId == null) return;
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (cancelled) return;
      setLoading(true);
      try {
        const row = await apiJson<{
          title: string;
          description: string;
          goal_eth: number;
          image_url: string | null;
          beneficiary_user_id: number | null;
          impact_story_title: string | null;
          impact_story_body: string | null;
          about_body: string;
          funds_cover: { label: string; weight: number }[];
          milestones: string[];
          verification_points: string[];
          category_tag: string;
          location_tag: string;
          campaign_end_date: string | null;
        }>(`/admin/causes/${editId}`);
        if (cancelled) return;
        setTitle(row.title);
        setDescription(row.description);
        setAboutBody(row.about_body ?? row.description);
        setGoalEth(String(row.goal_eth));
        setImageUrl(row.image_url ?? '');
        setImageDataUrl(null);
        setBeneficiaryUserId(row.beneficiary_user_id != null ? String(row.beneficiary_user_id) : '');
        setImpactStoryTitle(row.impact_story_title ?? '');
        setImpactStoryBody(row.impact_story_body ?? row.description);
        setCategoryTag(row.category_tag ?? '');
        setLocationTag(row.location_tag ?? '');
        setCampaignEndDate(row.campaign_end_date ?? '');
        setFundRows(
          row.funds_cover?.length
            ? row.funds_cover.map((f) => ({ label: f.label, weight: String(f.weight) }))
            : DEFAULT_FUND_ROWS,
        );
        setMilestones(row.milestones?.length ? row.milestones : defaultMilestones());
        setVerificationPoints(row.verification_points?.length ? row.verification_points : defaultVerification());
      } catch (e: unknown) {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : 'Failed to load cause');
      } finally {
        if (!cancelled) setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [editId, isEdit]);

  function onPickImage(file: File | null) {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.split(',').includes(file.type)) {
      setErr('Image must be JPG, PNG, WebP, or GIF');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErr('Image must be 5 MB or smaller');
      return;
    }
    setErr(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageDataUrl(reader.result);
        setImageUrl('');
      }
    };
    reader.readAsDataURL(file);
  }

  function updateFundRow(index: number, patch: Partial<FundCoverRow>) {
    setFundRows((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addFundRow() {
    setFundRows((rows) => [...rows, { label: '', weight: '' }]);
  }

  function removeFundRow(index: number) {
    setFundRows((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== index)));
  }

  function updateListItem(setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) {
    setter((items) => items.map((item, i) => (i === index ? value : item)));
  }

  function addListItem(setter: React.Dispatch<React.SetStateAction<string[]>>) {
    setter((items) => [...items, '']);
  }

  function removeListItem(setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) {
    setter((items) => (items.length <= 1 ? items : items.filter((_, i) => i !== index)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!beneficiaryUserId) {
      setErr('Select a beneficiary');
      return;
    }
    const fundsCover = fundRows
      .map((r) => ({ label: r.label.trim(), weight: Number.parseFloat(r.weight) }))
      .filter((r) => r.label);
    if (fundsCover.length === 0) {
      setErr('Add at least one “What funds cover” line');
      return;
    }
    if (Math.abs(fundWeightSum(fundRows) - 100) > 0.01) {
      setErr('Fund weights must sum to 100%');
      return;
    }
    const milestoneList = milestones.map((m) => m.trim()).filter(Boolean);
    const verificationList = verificationPoints.map((m) => m.trim()).filter(Boolean);
    if (milestoneList.length === 0) {
      setErr('Add at least one milestone');
      return;
    }
    if (verificationList.length === 0) {
      setErr('Add at least one verification point');
      return;
    }
    setBusy(true);
    try {
      const body = {
        title,
        description,
        goalEth: parseFloat(goalEth),
        beneficiaryUserId: Number.parseInt(beneficiaryUserId, 10),
        impactStoryTitle,
        impactStoryBody,
        aboutBody: aboutBody.trim() || description.trim(),
        fundsCover,
        milestones: milestoneList,
        verificationPoints: verificationList,
        categoryTag,
        locationTag,
        campaignEndDate: campaignEndDate.trim() || null,
        imageUrl: imageDataUrl ? null : imageUrl || null,
        imageDataUrl: imageDataUrl,
      };
      if (isEdit && editId != null) {
        await apiJson<{ id: number }>(`/causes/${editId}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        nav(`/causes/${editId}`);
      } else {
        const { id } = await apiJson<{ id: number }>('/causes', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        nav(`/causes/${id}`);
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="vtx-page p-12 text-center text-[var(--text-muted-1)]">Loading…</div>;
  }

  return (
    <div className="vtx-page max-w-lg">
      <SectionHeader
        title={isEdit ? 'Edit cause' : 'New cause'}
        body={
          isEdit
            ? 'Update cause details, beneficiary, impact story, and hero image.'
            : 'Assign a beneficiary, set the goal, and publish to the public Causes page.'
        }
      />
      <form onSubmit={(e) => void submit(e)} className="mt-8 space-y-4">
        <SurfaceCard>
          <label className="text-xs uppercase tracking-wider text-[var(--text-muted-1)]">Cause title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="vtx-input mt-1 w-full px-4 py-3"
          />
        </SurfaceCard>
        <SurfaceCard>
          <label className="text-xs uppercase tracking-wider text-[var(--text-muted-1)]">Short description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={3}
            className="vtx-input mt-1 w-full px-4 py-3"
            placeholder="One-line summary shown on cause cards"
          />
        </SurfaceCard>
        <SurfaceCard>
          <label className="text-xs uppercase tracking-wider text-[var(--text-muted-1)]">About this cause</label>
          <textarea
            value={aboutBody}
            onChange={(e) => setAboutBody(e.target.value)}
            required
            rows={5}
            className="vtx-input mt-1 w-full px-4 py-3"
            placeholder="Detailed overview shown on the View Details page"
          />
        </SurfaceCard>
        <SurfaceCard>
          <label className="text-xs uppercase tracking-wider text-[var(--text-muted-1)]">Beneficiary</label>
          <select
            value={beneficiaryUserId}
            onChange={(e) => setBeneficiaryUserId(e.target.value)}
            required
            className="vtx-input mt-1 w-full px-4 py-3"
          >
            <option value="">Select beneficiary</option>
            {beneficiaries.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </SurfaceCard>
        <div className="grid gap-4 sm:grid-cols-2">
          <SurfaceCard>
            <label className="text-xs uppercase tracking-wider text-[var(--text-muted-1)]">Category tag</label>
            <input
              value={categoryTag}
              onChange={(e) => setCategoryTag(e.target.value)}
              required
              className="vtx-input mt-1 w-full px-4 py-3"
              placeholder="e.g. Education"
            />
          </SurfaceCard>
          <SurfaceCard>
            <label className="text-xs uppercase tracking-wider text-[var(--text-muted-1)]">Location tag</label>
            <input
              value={locationTag}
              onChange={(e) => setLocationTag(e.target.value)}
              required
              className="vtx-input mt-1 w-full px-4 py-3"
              placeholder="e.g. Sydney, AU"
            />
          </SurfaceCard>
        </div>
        <SurfaceCard>
          <label className="text-xs uppercase tracking-wider text-[var(--text-muted-1)]">
            Campaign end date <span className="font-normal normal-case text-[var(--text-muted-2)]">(optional)</span>
          </label>
          <input
            type="date"
            value={campaignEndDate}
            onChange={(e) => setCampaignEndDate(e.target.value)}
            className="vtx-input mt-1 w-full px-4 py-3"
          />
        </SurfaceCard>
        <SurfaceCard>
          <label className="text-xs uppercase tracking-wider text-[var(--text-muted-1)]">Impact story title</label>
          <input
            value={impactStoryTitle}
            onChange={(e) => setImpactStoryTitle(e.target.value)}
            required
            className="vtx-input mt-1 w-full px-4 py-3"
          />
        </SurfaceCard>
        <SurfaceCard>
          <label className="text-xs uppercase tracking-wider text-[var(--text-muted-1)]">Impact story description</label>
          <textarea
            value={impactStoryBody}
            onChange={(e) => setImpactStoryBody(e.target.value)}
            required
            rows={4}
            className="vtx-input mt-1 w-full px-4 py-3"
          />
        </SurfaceCard>
        <SurfaceCard>
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs uppercase tracking-wider text-[var(--text-muted-1)]">What funds cover</label>
            <span
              className={`text-xs font-semibold tabular-nums ${
                Math.abs(fundWeightTotal - 100) < 0.01 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {fundWeightTotal.toFixed(0)}% / 100%
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted-2)]">Pie chart weights must sum to 100%.</p>
          <div className="mt-3 space-y-2">
            {fundRows.map((row, index) => (
              <div key={index} className="flex gap-2">
                <input
                  value={row.label}
                  onChange={(e) => updateFundRow(index, { label: e.target.value })}
                  required={index === 0}
                  className="vtx-input min-w-0 flex-1 px-3 py-2 text-sm"
                  placeholder="Program line"
                />
                <input
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  value={row.weight}
                  onChange={(e) => updateFundRow(index, { weight: e.target.value })}
                  required
                  className="vtx-input w-20 shrink-0 px-3 py-2 text-sm font-mono"
                  placeholder="%"
                />
                <button
                  type="button"
                  onClick={() => removeFundRow(index)}
                  className="shrink-0 rounded-lg border border-[var(--border-chrome-2)] px-2 text-xs text-[var(--text-muted-2)] hover:bg-white/5"
                  aria-label="Remove fund line"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addFundRow}
            className="mt-2 text-xs font-semibold text-[var(--accent-bright-2)] hover:underline"
          >
            + Add fund line
          </button>
        </SurfaceCard>
        <SurfaceCard>
          <label className="text-xs uppercase tracking-wider text-[var(--text-muted-1)]">Milestones</label>
          <div className="mt-2 space-y-2">
            {milestones.map((line, index) => (
              <div key={index} className="flex gap-2">
                <input
                  value={line}
                  onChange={(e) => updateListItem(setMilestones, index, e.target.value)}
                  required={index === 0}
                  className="vtx-input min-w-0 flex-1 px-3 py-2 text-sm"
                  placeholder="Outcome target"
                />
                <button
                  type="button"
                  onClick={() => removeListItem(setMilestones, index)}
                  className="shrink-0 rounded-lg border border-[var(--border-chrome-2)] px-2 text-xs text-[var(--text-muted-2)] hover:bg-white/5"
                  aria-label="Remove milestone"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => addListItem(setMilestones)}
            className="mt-2 text-xs font-semibold text-[var(--accent-bright-2)] hover:underline"
          >
            + Add milestone
          </button>
        </SurfaceCard>
        <SurfaceCard>
          <label className="text-xs uppercase tracking-wider text-[var(--text-muted-1)]">Verification points</label>
          <div className="mt-2 space-y-2">
            {verificationPoints.map((line, index) => (
              <div key={index} className="flex gap-2">
                <input
                  value={line}
                  onChange={(e) => updateListItem(setVerificationPoints, index, e.target.value)}
                  required={index === 0}
                  className="vtx-input min-w-0 flex-1 px-3 py-2 text-sm"
                  placeholder="Trust / audit point"
                />
                <button
                  type="button"
                  onClick={() => removeListItem(setVerificationPoints, index)}
                  className="shrink-0 rounded-lg border border-[var(--border-chrome-2)] px-2 text-xs text-[var(--text-muted-2)] hover:bg-white/5"
                  aria-label="Remove verification point"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => addListItem(setVerificationPoints)}
            className="mt-2 text-xs font-semibold text-[var(--accent-bright-2)] hover:underline"
          >
            + Add verification point
          </button>
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
            Hero image <span className="font-normal normal-case text-[var(--text-muted-2)]">(optional)</span>
          </label>
          <input
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
            className="vtx-input mt-1 w-full px-4 py-3 file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--accent-core)] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[#03130b]"
          />
          <p className="mt-2 text-xs text-[var(--text-muted-2)]">JPG, PNG, WebP, or GIF up to 5 MB.</p>
          {previewSrc ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border-chrome-2)] bg-black/20">
              <img
                src={previewSrc}
                alt=""
                referrerPolicy="no-referrer"
                className="aspect-[4/3] w-full object-cover"
                onError={(ev) => {
                  ev.currentTarget.style.display = 'none';
                }}
              />
              <p className="border-t border-[var(--border-chrome-2)] px-3 py-2 text-xs text-[var(--text-muted-2)]">
                Preview
              </p>
            </div>
          ) : null}
        </SurfaceCard>
        {err && <p className="text-sm text-rose-400">{err}</p>}
        <PrimaryButton type="submit" disabled={busy} className="w-full">
          {busy ? (isEdit ? 'Saving…' : 'Creating…') : isEdit ? 'Save changes' : 'Create cause'}
        </PrimaryButton>
      </form>
    </div>
  );
}
