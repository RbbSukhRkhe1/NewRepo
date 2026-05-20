import { useMemo, useState } from 'react';
import type { LedgerV2Detail } from '../lib/ledgerV2';
import { verifyLedgerV2Entry } from '../lib/ledgerV2';
import { useIsLightMode } from '../lib/useIsLightMode';

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TransactionModal({
  open,
  onClose,
  detail,
}: {
  open: boolean;
  onClose: () => void;
  detail: LedgerV2Detail | null;
}) {
  const isLightMode = useIsLightMode();
  const [verifyState, setVerifyState] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'ok'; data: Awaited<ReturnType<typeof verifyLedgerV2Entry>> }
    | { status: 'error'; error: string }
  >({ status: 'idle' });
  if (!open && verifyState.status !== 'idle') {
    // Avoid setState-in-effect lint: reset lazily when modal is closed.
    setVerifyState({ status: 'idle' });
  }

  const entry = detail?.entry ?? null;
  const donors = detail?.donors ?? [];

  const title = useMemo(() => {
    if (!entry) return '';
    return entry.reference ?? `Ledger entry #${entry.id}`;
  }, [entry]);

  if (!open || !entry) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-[var(--glass-border)] bg-[var(--overlay-surface)] shadow-[0_18px_70px_rgba(0,0,0,0.55)] backdrop-blur">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--glass-border)] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted-2)]">
              Transaction detail
            </p>
            <h2 className="mt-1 truncate text-lg font-semibold text-[var(--text-high-3)]">{title}</h2>
            <p className="mt-1 text-xs text-[var(--text-muted-1)]">
              {formatTimestamp(new Date(entry.recorded_at + 'Z').toISOString())}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              isLightMode
                ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'
            }`}
          >
            Close
          </button>
        </div>

        <div className="grid gap-4 px-5 py-5 sm:px-6 sm:py-6">
          <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--overlay-surface-soft)] p-4">
            <p className="text-xs font-semibold text-[var(--text-high-2)]">Narrative</p>
            <p className="mt-2 text-sm leading-7 text-[var(--text-muted-1)]">
              {entry.narrative ?? ''}
            </p>
          </div>

          {entry.kind === 'disbursement_out' && donors.length > 0 ? (
            <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--overlay-surface-soft)] p-4">
              <p className="text-xs font-semibold text-[var(--text-high-2)]">Donors linked to this disbursement</p>
              <p className="mt-1 text-[11px] text-[var(--text-muted-2)]">
                Privacy: only your own full name is shown; others are initials.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {donors.map((d) => (
                  <div
                    key={d.donationEntryId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--glass-border)] bg-[var(--overlay-surface)] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--text-high-3)]">{d.displayName}</p>
                      <p className="truncate font-mono text-[11px] text-[var(--text-muted-2)]">{d.txHash}</p>
                    </div>
                    <p className="shrink-0 font-mono text-xs font-semibold text-[var(--text-high-2)]">
                      {d.amountEth} ETH
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--overlay-surface-soft)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[var(--text-high-2)]">On-chain verification</p>
                <p className="mt-1 text-[11px] text-[var(--text-muted-2)]">
                  Fetches vault balance before/after this tx’s block.
                </p>
              </div>
              <button
                type="button"
                disabled={verifyState.status === 'loading'}
                onClick={() => {
                  setVerifyState({ status: 'loading' });
                  verifyLedgerV2Entry(entry.id)
                    .then((data) => setVerifyState({ status: 'ok', data }))
                    .catch((e: unknown) =>
                      setVerifyState({ status: 'error', error: e instanceof Error ? e.message : 'Verify failed' })
                    );
                }}
                className="vtx-button-primary px-4 py-2 text-xs font-semibold"
              >
                {verifyState.status === 'loading' ? 'Verifying…' : 'Verify on-chain'}
              </button>
            </div>

            {verifyState.status === 'ok' ? (
              <div className="mt-3 grid gap-2 rounded-xl border border-[var(--glass-border)] bg-[var(--overlay-surface)] p-3 text-xs">
                <div className="flex justify-between gap-3">
                  <span className="text-[var(--text-muted-2)]">Tx hash</span>
                  <span className="font-mono text-[var(--text-high-2)]">{verifyState.data.txHash}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[var(--text-muted-2)]">Vault</span>
                  <span className="font-mono text-[var(--text-high-2)]">{verifyState.data.vaultMasked}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[var(--text-muted-2)]">Balance before</span>
                  <span className="font-mono text-[var(--text-high-2)]">{verifyState.data.vaultBalanceBeforeEth} ETH</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[var(--text-muted-2)]">Balance after</span>
                  <span className="font-mono text-[var(--text-high-2)]">{verifyState.data.vaultBalanceAfterEth} ETH</span>
                </div>
              </div>
            ) : verifyState.status === 'error' ? (
              <p className="mt-2 text-xs text-rose-300">{verifyState.error}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

